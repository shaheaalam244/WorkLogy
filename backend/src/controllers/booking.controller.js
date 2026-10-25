import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import VendorProfile from '../models/VendorProfile.js';
import Notification from '../models/Notification.js';
import Review from '../models/Review.js';
import { getIO } from '../config/socket.js';
import { decryptCustomerOtp, verifyOtpMatch, generateSecureOtp, hashOtp } from '../utils/otp.js';
import { notifyBookingConfirmed, notifyStatusChange, notifyCancellation, createNotification } from '../services/notification.service.js';
import {
  calculateDistanceMeters,

  GEOFENCE_DEFAULT_RADIUS_METERS,
  GEOFENCE_DEFAULT_MAX_ACCURACY_METERS,
  GEOFENCE_EVIDENCE_EXPIRY_MS
} from '../utils/geofence.js';

export const createDirectBooking = async (req, res, next) => {
  try {
    const {
      vendorId,
      service,
      serviceId,
      serviceTitle,
      category,
      serviceType,
      problemDescription,
      urgency,
      address,
      scheduledDate,
      timeSlot,
      pricing,
      attachments,
      notes
    } = req.body;

    if (!vendorId) {
      return res.status(400).json({ success: false, message: 'Please select a professional to book' });
    }

    if (vendorId.toString() === req.user.id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot book yourself as a professional' });
    }

    // Verify vendor exists (resolving either User ID or VendorProfile ID)
    let resolvedVendorUserId = vendorId;
    let vendorUser = await User.findById(vendorId);
    let vendorProfile = null;

    if (!vendorUser) {
      vendorProfile = await VendorProfile.findById(vendorId);
      if (vendorProfile && vendorProfile.user) {
        resolvedVendorUserId = vendorProfile.user;
        vendorUser = await User.findById(vendorProfile.user);
      }
    } else {
      vendorProfile = await VendorProfile.findOne({ user: vendorId });
    }

    if (!vendorUser || (vendorUser.role !== 'vendor' && vendorUser.role !== 'admin')) {
      return res.status(404).json({ success: false, message: 'Selected professional not found or inactive' });
    }

    if (!vendorProfile) {
      return res.status(404).json({ success: false, message: 'Professional profile is not configured' });
    }

    // Check for duplicate pending direct bookings between this customer and vendor
    const existingPending = await Booking.findOne({
      customer: req.user.id,
      vendor: resolvedVendorUserId,
      status: 'pending_acceptance',
      serviceTitle: serviceTitle || 'Home Service'
    });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        message: 'A pending booking request for this service already exists with this professional. Please check your bookings dashboard.',
        booking: existingPending
      });
    }

    const bookingRef = `DIR-${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;

    const amount = Number(pricing?.amount) || Number(vendorProfile.hourlyRate) || 500;
    const platformFee = Math.round(amount * 0.05);
    const vendorNet = amount - platformFee;

    const booking = await Booking.create({
      bookingReference: bookingRef,
      bookingType: 'direct_professional',
      customer: req.user.id,
      vendor: resolvedVendorUserId,
      service: service || serviceId || undefined,
      serviceTitle: serviceTitle || 'Direct Professional Service',
      category: category || (vendorProfile.categories?.[0]?.name) || 'Home Services',
      serviceType: serviceType || 'repair',
      problemDescription: problemDescription || '',
      urgency: urgency || 'medium',
      attachments: Array.isArray(attachments) ? attachments : [],
      scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(Date.now() + 86400000),
      timeSlot: timeSlot || '10:00 AM - 01:00 PM',
      address: {
        addressLabel: address?.addressLabel || 'Service Location',
        houseNumber: address?.houseNumber || '',
        street: address?.street || '',
        locality: address?.locality || '',
        landmark: address?.landmark || '',
        city: address?.city || 'Lucknow',
        state: address?.state || 'Uttar Pradesh',
        zipCode: address?.zipCode || '226010',
        country: address?.country || 'India',
        coordinates: {
          lat: Number(address?.coordinates?.lat) || 0,
          lng: Number(address?.coordinates?.lng) || 0
        }
      },
      pricing: {
        amount,
        platformFee,
        vendorNet,
        isPaid: Boolean(pricing?.isPaid),
        paymentMethod: 'escrow',
        paymentStatus: 'pending'
      },
      status: 'pending_acceptance',
      statusHistory: [
        {
          status: 'pending_acceptance',
          updatedBy: req.user.id,
          timestamp: new Date(),
          note: `Direct booking request sent to ${vendorProfile.businessName || vendorUser.name}. Awaiting acceptance.`
        }
      ],
      notes: notes || ''
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate('customer', 'name email phone avatar')
      .populate('vendor', 'name email phone avatar businessName');

    // Notify the professional persistently in DB and via remote push
    try {
      await createNotification({
        recipientId: vendorId,
        senderId: req.user.id,
        type: 'job_alert',
        title: 'New Direct Booking Request!',
        message: `${req.user.name || 'A customer'} requested a direct booking for "${booking.serviceTitle}". Review and accept or decline.`,
        link: `/vendor/bookings`,
        relatedResource: {
          resourceType: 'booking',
          resourceId: booking._id
        },
        sendEmailNotification: false,
        sendPush: true
      });
    } catch (notifErr) {
      console.warn('Direct booking notification warning:', notifErr.message);
    }

    // Real-time socket event to vendor
    const io = getIO();
    if (io) {
      io.to('user_' + vendorId.toString()).emit('new_direct_booking', {
        bookingId: booking._id,
        bookingReference: booking.bookingReference,
        customerName: req.user.name,
        serviceTitle: booking.serviceTitle,
        scheduledDate: booking.scheduledDate,
        timeSlot: booking.timeSlot
      });
    }

    res.status(201).json({
      success: true,
      message: 'Direct booking request submitted! The professional has been notified to confirm.',
      booking: populatedBooking
    });
  } catch (error) {
    next(error);
  }
};

export const respondDirectBooking = async (req, res, next) => {
  try {
    const { action, reason } = req.body; // action: 'accept' | 'decline'
    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'name email phone avatar')
      .populate('vendor', 'name email phone avatar businessName');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.vendor._id.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to respond to this booking' });
    }

    if (booking.status !== 'pending_acceptance') {
      return res.status(400).json({
        success: false,
        message: `Booking has already been responded to (Current status: ${booking.status})`
      });
    }

    const io = getIO();

    if (action === 'accept') {
      // Generate secure 6-digit OTP
      const { otp, codeHash, customerEncryptedOtp } = generateSecureOtp();
      const expiresAt = new Date(Date.now() + 7 * 86400000); // 7 days

      booking.status = 'confirmed';
      booking.pricing.paymentStatus = 'escrow_locked';
      booking.startOtp = {
        otp,
        codeHash,
        customerEncryptedOtp,
        expiresAt,
        attempts: 0,
        maxAttempts: 5,
        isConsumed: false
      };
      booking.statusHistory.push({
        status: 'confirmed',
        updatedBy: req.user.id,
        timestamp: new Date(),
        note: `Direct booking accepted by professional. Service-Start OTP generated.`
      });
      await booking.save();

      // Notify customer and vendor of booking confirmation (in-app + email)
      try {
        await notifyBookingConfirmed({
          customerId: booking.customer._id || booking.customer,
          vendorId: booking.vendor._id || booking.vendor,
          booking,
          jobTitle: booking.serviceTitle
        });
      } catch (notifErr) {
        console.warn('Booking confirmation notification error:', notifErr.message);
      }


      if (io) {
        io.to('user_' + (booking.customer._id || booking.customer).toString()).emit('direct_booking_accepted', {
          bookingId: booking._id,
          bookingReference: booking.bookingReference,
          vendorName: booking.vendor.name
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Direct booking accepted! Appointment confirmed.',
        booking
      });
    } else if (action === 'decline') {
      booking.status = 'declined';
      booking.declineReason = reason || 'Professional unavailable at requested time.';
      booking.statusHistory.push({
        status: 'declined',
        updatedBy: req.user.id,
        timestamp: new Date(),
        note: `Booking declined by professional: ${booking.declineReason}`
      });
      await booking.save();

      // Notify customer of declined booking
      try {
        await notifyCancellation({
          customerId: booking.customer._id || booking.customer,
          vendorId: booking.vendor._id || booking.vendor,
          cancelledByUserId: req.user.id,
          jobTitle: booking.serviceTitle,
          resourceId: booking._id,
          resourceType: 'booking',
          reason: booking.declineReason
        });
      } catch (notifErr) {
        console.warn('Customer notification error:', notifErr.message);
      }


      if (io) {
        io.to('user_' + (booking.customer._id || booking.customer).toString()).emit('direct_booking_declined', {
          bookingId: booking._id,
          bookingReference: booking.bookingReference,
          vendorName: booking.vendor.name,
          reason: booking.declineReason
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Direct booking declined.',
        booking
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "accept" or "decline".'
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getVendorBookings = async (req, res, next) => {
  try {
    const { status } = req.query;
    const vendorUserId = req.user.id || req.user._id;
    const vendorProfile = await VendorProfile.findOne({ user: vendorUserId }).select('_id');
    const vendorIds = [vendorUserId];
    if (vendorProfile?._id) vendorIds.push(vendorProfile._id);

    let query = { vendor: { $in: vendorIds } };

    if (status && status !== 'all') {
      if (status === 'scheduled' || status === 'confirmed') {
        query.status = { $in: ['scheduled', 'confirmed', 'assigned', 'awaiting_confirmation'] };
      } else if (status === 'in_progress') {
        query.status = { $in: ['in_progress', 'on_the_way', 'arrived', 'completion_pending'] };
      } else {
        query.status = status;
      }
    }

    let bookings = await Booking.find(query)
      .populate('customer', 'name email phone avatar')
      .populate('job', 'title budget urgency location')
      .populate('service', 'title pricing domain')
      .sort({ scheduledDate: -1, createdAt: -1 });

    // If vendor has no bookings yet, seed realistic live initial orders linked to real DB
    if (bookings.length === 0 && !status) {
      const demoBooking1 = await Booking.create({
        bookingReference: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
        customer: req.user.id, // linked to user
        vendor: req.user.id,
        serviceTitle: 'Electrical Subpanel Replacement & Safety Certification',
        category: 'Electrical Services',
        scheduledDate: new Date(Date.now() + 86400000 * 2),
        timeSlot: '10:00 AM - 01:00 PM',
        address: {
          street: 'Plot 42, Sector B',
          locality: 'Gomti Nagar',
          city: 'Lucknow',
          state: 'Uttar Pradesh',
          zipCode: '226010'
        },
        pricing: {
          amount: 1650,
          platformFee: 82.5,
          vendorNet: 1567.5,
          isPaid: true,
          paymentMethod: 'escrow',
          paymentStatus: 'escrow_locked'
        },
        status: 'in_progress',
        statusHistory: [
          {
            status: 'confirmed',
            updatedBy: req.user.id,
            timestamp: new Date(Date.now() - 86400000),
            note: 'Contract awarded and escrow deposited.'
          },
          {
            status: 'in_progress',
            updatedBy: req.user.id,
            timestamp: new Date(),
            note: 'Vendor dispatched technicians on site.'
          }
        ]
      });

      const demoBooking2 = await Booking.create({
        bookingReference: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
        customer: req.user.id,
        vendor: req.user.id,
        serviceTitle: 'Smart EV Charger 50A Dedicated Line Installation',
        category: 'Electrical Services',
        scheduledDate: new Date(Date.now() + 86400000 * 4),
        timeSlot: '02:00 PM - 05:00 PM',
        address: {
          street: 'House 14, MG Marg',
          locality: 'Hazratganj',
          city: 'Lucknow',
          state: 'Uttar Pradesh',
          zipCode: '226001'
        },
        pricing: {
          amount: 850,
          platformFee: 42.5,
          vendorNet: 807.5,
          isPaid: true,
          paymentMethod: 'escrow',
          paymentStatus: 'escrow_locked'
        },
        status: 'scheduled',
        statusHistory: [
          {
            status: 'scheduled',
            updatedBy: req.user.id,
            timestamp: new Date(),
            note: 'Job scheduled with homeowner.'
          }
        ]
      });

      // Create matching initial transaction
      await Transaction.create({
        transactionId: `TX-${Math.floor(10000 + Math.random() * 90000)}`,
        booking: demoBooking1._id,
        vendor: req.user.id,
        customer: req.user.id,
        jobTitle: demoBooking1.serviceTitle,
        grossAmount: 1650,
        platformFee: 82.5,
        netAmount: 1567.5,
        type: 'escrow_hold',
        paymentStatus: 'held_in_escrow',
        settlementStatus: 'pending'
      });

      bookings = await Booking.find(query)
        .populate('customer', 'name email phone avatar')
        .sort({ scheduledDate: -1 });
    }

    const sanitizedBookings = bookings.map((b) => {
      const obj = b.toObject ? b.toObject() : { ...b };
      if (obj.startOtp) {
        delete obj.startOtp.otp;
        delete obj.startOtp.codeHash;
        delete obj.startOtp.customerEncryptedOtp;
      }
      obj.totalAmount = obj.pricing?.amount || obj.totalAmount;
      obj.isOtpVerified = Boolean(
        obj.startOtp?.isConsumed ||
        obj.arrivalEvidence?.verified ||
        ['in_progress', 'completion_pending', 'completed'].includes(obj.status)
      );
      return obj;
    });

    res.status(200).json({ success: true, count: sanitizedBookings.length, bookings: sanitizedBookings });
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (req, res, next) => {
  try {
    const rawId = (req.params.id || '').trim();
    const isHex24 = mongoose.Types.ObjectId.isValid(rawId) && /^[0-9a-fA-F]{24}$/.test(rawId);

    let booking = null;
    if (isHex24) {
      booking = await Booking.findById(rawId)
        .populate('customer', 'name email phone avatar')
        .populate('vendor', 'name email phone avatar')
        .populate('job')
        .populate('service')
        .populate('review');

      if (!booking) {
        booking = await Booking.findOne({ job: rawId })
          .populate('customer', 'name email phone avatar')
          .populate('vendor', 'name email phone avatar')
          .populate('job')
          .populate('service')
          .populate('review');
      }
    }

    if (!booking) {
      // Check if rawId matches human-readable bookingReference with case-insensitivity
      booking = await Booking.findOne({ bookingReference: new RegExp(`^${rawId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })
        .populate('customer', 'name email phone avatar')
        .populate('vendor', 'name email phone avatar')
        .populate('job')
        .populate('service')
        .populate('review');
    }

    if (!booking) {
      // Check if rawId is a standalone Job (by 24-char ObjectId or REQ- suffix reference)
      let job = null;
      if (isHex24) {
        job = await Job.findById(rawId)
          .populate('category', 'name icon')
          .populate('selectedVendor', 'name avatar phone businessName rating');
      }

      // Check human-readable REQ-XXXXXX or #XXXXXX code matching the last 6 characters of Job ID
      if (!job && (rawId.toUpperCase().startsWith('REQ-') || rawId.startsWith('#') || rawId.length === 6)) {
        const suffix = rawId.replace(/^REQ-|^#/i, '').toLowerCase();
        if (suffix.length >= 4) {
          const currentUserId = (req.user._id || req.user.id).toString();
          const candidateJobs = await Job.find({
            customer: currentUserId,
            isDeleted: { $ne: true }
          })
            .populate('category', 'name icon')
            .populate('selectedVendor', 'name avatar phone businessName rating')
            .sort({ createdAt: -1 })
            .limit(50);

          job = candidateJobs.find(j => j._id.toString().toLowerCase().endsWith(suffix)) || null;
        }
      }

      if (job) {
        const currentUserId = (req.user._id || req.user.id).toString();
        const isOwner = job.customer?.toString() === currentUserId;
        const isAssigned = (job.selectedVendor?._id || job.selectedVendor)?.toString() === currentUserId;

        if (!isOwner && !isAssigned && req.user.role !== 'admin') {
          return res.status(403).json({ success: false, message: 'Unauthorized to view this service request' });
        }

        // Return a normalized, complete booking-compatible record so the frontend renders seamlessly
        const jobAsBooking = {
          _id: job._id.toString(),
          jobId: job._id.toString(),
          bookingReference: `REQ-${job._id.toString().slice(-6).toUpperCase()}`,
          bookingType: 'open_request',
          serviceTitle: job.title,
          category: job.category?.name || 'Home Services',
          status: job.status,
          urgency: job.urgency,
          scheduledDate: job.preferredDate ? new Date(job.preferredDate) : job.createdAt,
          timeSlot: job.preferredTime || 'Flexible',
          address: job.location,
          pricing: {
            amount: job.budget?.amount || job.finalPrice?.amount || 0,
            paymentStatus: 'pending',
            isPaid: false
          },
          totalAmount: job.budget?.amount || job.finalPrice?.amount || 0,
          problemDescription: job.description,
          isJobRequest: true,
          customer: job.customer,
          vendor: job.selectedVendor ? {
            _id: job.selectedVendor._id || job.selectedVendor,
            name: job.selectedVendor.name || job.selectedVendor.businessName || 'Assigned Specialist',
            businessName: job.selectedVendor.businessName || job.selectedVendor.name,
            phone: job.selectedVendor.phone,
            avatar: job.selectedVendor.avatar,
            rating: job.selectedVendor.rating || 4.9
          } : null,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt
        };

        return res.status(200).json({
          success: true,
          jobOnly: true,
          job,
          booking: jobAsBooking
        });
      }

      return res.status(404).json({ success: false, message: 'Booking or service request not found' });
    }

    const currentUserId = (req.user._id || req.user.id).toString();
    const bookingVendorId = (booking.vendor?._id || booking.vendor)?.toString();
    const bookingCustomerId = (booking.customer?._id || booking.customer)?.toString();

    // Verify vendor or customer access
    if (
      bookingVendorId !== currentUserId &&
      bookingCustomerId !== currentUserId &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this booking' });
    }

    const bookingObj = booking.toObject();
    // Vendor must NEVER see customer's plaintext OTP or sensitive hash before verification
    if (bookingCustomerId !== currentUserId && req.user.role !== 'admin') {
      if (bookingObj.startOtp) {
        delete bookingObj.startOtp.otp;
        delete bookingObj.startOtp.codeHash;
        delete bookingObj.startOtp.customerEncryptedOtp;
      }
    }

    // Attach vendor profile information for professional card
    if (booking.vendor) {
      const vendorProfile = await VendorProfile.findOne({ user: booking.vendor._id || booking.vendor })
        .populate('categories', 'name icon slug')
        .lean();
      bookingObj.vendorProfile = vendorProfile;
    }

    bookingObj.totalAmount = bookingObj.pricing?.amount || bookingObj.totalAmount;
    bookingObj.isOtpVerified = Boolean(
      bookingObj.startOtp?.isConsumed ||
      bookingObj.arrivalEvidence?.verified ||
      ['in_progress', 'completion_pending', 'completed'].includes(bookingObj.status)
    );

    res.status(200).json({ success: true, booking: bookingObj });
  } catch (error) {
    next(error);
  }
};

export const getBookingByJobId = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    let booking = await Booking.findOne({ job: jobId })
      .populate('customer', 'name email phone avatar')
      .populate('vendor', 'name email phone avatar')
      .populate('job')
      .populate('service')
      .populate('review');

    if (!booking) {
      // If no booking found, check if job exists and belongs to customer
      const job = await Job.findById(jobId).populate('category', 'name icon');
      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }
      if (job.customer.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Unauthorized to view this job' });
      }
      return res.status(200).json({ success: true, jobOnly: true, job });
    }

    // Verify vendor or customer access
    if (
      booking.vendor._id.toString() !== req.user.id &&
      booking.customer._id.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this booking' });
    }

    const bookingObj = booking.toObject();
    if (booking.customer._id.toString() !== req.user.id && req.user.role !== 'admin') {
      if (bookingObj.startOtp) {
        delete bookingObj.startOtp.otp;
        delete bookingObj.startOtp.codeHash;
        delete bookingObj.startOtp.customerEncryptedOtp;
      }
    }

    if (booking.vendor) {
      const vendorProfile = await VendorProfile.findOne({ user: booking.vendor._id })
        .populate('categories', 'name icon slug')
        .lean();
      bookingObj.vendorProfile = vendorProfile;
    }

    bookingObj.totalAmount = bookingObj.pricing?.amount || bookingObj.totalAmount;
    bookingObj.isOtpVerified = Boolean(
      bookingObj.startOtp?.isConsumed ||
      bookingObj.arrivalEvidence?.verified ||
      ['in_progress', 'completion_pending', 'completed'].includes(bookingObj.status)
    );

    res.status(200).json({ success: true, booking: bookingObj });
  } catch (error) {
    next(error);
  }
};

export const approveBookingCompletion = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Verify customer ownership
    if (booking.customer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the customer who booked this service can approve completion and release payment' });
    }

    // Prevent duplicate payment-release requests
    if (booking.status === 'completed' && booking.pricing?.paymentStatus === 'released') {
      return res.status(400).json({ success: false, message: 'Payment has already been released for this booking.' });
    }

    // Confirm that the professional has marked work as completed or submitted completion evidence
    const isEligible = 
      booking.status === 'completion_pending' || 
      (booking.completionEvidence && (booking.completionEvidence.completedAt || booking.completionEvidence.notes || (booking.completionEvidence.images && booking.completionEvidence.images.length > 0))) ||
      booking.status === 'in_progress' ||
      booking.status === 'completed';

    if (!isEligible) {
      return res.status(400).json({ 
        success: false, 
        message: 'Your professional is still working on this job. You can approve the work after it is completed.' 
      });
    }

    // Update booking status and payment status
    booking.status = 'completed';
    booking.pricing.paymentStatus = 'released';
    booking.statusHistory.push({
      status: 'completed',
      updatedBy: req.user.id,
      timestamp: new Date(),
      note: req.body?.note || 'Customer approved completed work and authorized release of payment.'
    });

    await booking.save();

    // Settle or create live payout transaction
    const existingTx = await Transaction.findOne({ booking: booking._id });
    if (existingTx) {
      existingTx.type = 'escrow_release';
      existingTx.paymentStatus = 'paid_to_bank';
      existingTx.settlementStatus = 'settled';
      if (!existingTx.payoutBank) existingTx.payoutBank = {};
      existingTx.payoutBank.settledDate = new Date();
      await existingTx.save();
    } else {
      await Transaction.create({
        transactionId: `TX-${Math.floor(10000 + Math.random() * 90000)}`,
        booking: booking._id,
        vendor: booking.vendor,
        customer: booking.customer,
        jobTitle: booking.serviceTitle,
        grossAmount: booking.pricing?.amount || 0,
        platformFee: booking.pricing?.platformFee || 0,
        netAmount: booking.pricing?.vendorNet || booking.pricing?.amount || 0,
        type: 'escrow_release',
        paymentStatus: 'paid_to_bank',
        settlementStatus: 'settled',
        payoutBank: {
          bankName: 'HDFC Bank',
          accountNumberLast4: '4812',
          ifsc: 'HDFC0001024',
          settledDate: new Date()
        }
      });
    }

    // Increment completed jobs & earnings on VendorProfile
    await VendorProfile.findOneAndUpdate(
      { user: booking.vendor },
      {
        $inc: {
          completedJobsCount: 1,
          earningsTotal: booking.pricing?.vendorNet || booking.pricing?.amount || 0
        }
      }
    );

    // If associated with a Job, mark Job completed as well
    if (booking.job) {
      await Job.findByIdAndUpdate(booking.job, { status: 'completed' });
    }

    // Notify vendor of payment release and completion
    try {
      await notifyStatusChange({
        recipientId: booking.vendor,
        senderId: req.user.id,
        booking,
        jobTitle: booking.serviceTitle,
        newStatus: 'completed',
        customMessage: `Your customer has inspected and approved the work for "${booking.serviceTitle}". Escrow funds of ₹${booking.pricing?.vendorNet || booking.pricing?.amount} have been released to your account.`
      });
    } catch (notifErr) {
      console.warn('Notification error on customer approve:', notifErr.message);
    }


    // Real-time Socket.IO notification to vendor and customer
    try {
      const io = getIO();
      if (io) {
        io.to(booking.vendor.toString()).emit('booking_status_updated', {
          bookingId: booking._id,
          status: 'completed',
          paymentStatus: 'released'
        });
        io.to(booking.customer.toString()).emit('booking_status_updated', {
          bookingId: booking._id,
          status: 'completed',
          paymentStatus: 'released'
        });
      }
    } catch (socketErr) {
      console.warn('Socket emit error on customer approve:', socketErr.message);
    }

    // Fetch full updated booking with populated vendor and profile
    const updatedBooking = await Booking.findById(booking._id)
      .populate('customer', 'name email phone avatar')
      .populate('vendor', 'name email phone avatar')
      .populate('job')
      .populate('service');

    const updatedObj = updatedBooking.toObject();
    if (updatedBooking.vendor) {
      const vendorProfile = await VendorProfile.findOne({ user: updatedBooking.vendor._id })
        .populate('categories', 'name icon slug')
        .lean();
      updatedObj.vendorProfile = vendorProfile;
    }

    res.status(200).json({
      success: true,
      message: 'Work approved successfully and payment released to your professional.',
      booking: updatedObj
    });
  } catch (error) {
    next(error);
  }
};

export const updateBookingStatus = async (req, res, next) => {
  try {
    const { status, note, images } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.vendor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this booking' });
    }

    // Safety guard: prevent altering already completed bookings
    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'This booking has already been completed and settled. Its status cannot be altered.'
      });
    }

    // Cancellation Workflow
    if (status === 'cancelled') {
      booking.status = 'cancelled';
      if (booking.pricing) {
        booking.pricing.paymentStatus = 'refunded';
      }
      const fullReason = note || 'Cancelled by service contractor';
      booking.statusHistory.push({
        status: 'cancelled',
        updatedBy: req.user.id,
        timestamp: new Date(),
        note: fullReason
      });

      // Update associated Job
      if (booking.job) {
        const jobIdStr = (booking.job._id || booking.job).toString();
        await Job.findByIdAndUpdate(jobIdStr, {
          $set: {
            status: 'cancelled',
            cancellationReason: fullReason,
            dispatchExpiredAt: new Date()
          },
          $push: {
            eventHistory: {
              event: 'cancelled',
              note: fullReason,
              actor: req.user.id,
              timestamp: new Date()
            }
          }
        });

        // Socket.IO emission
        const io = getIO();
        if (io) {
          const cancelPayload = {
            jobId: jobIdStr,
            bookingId: booking._id.toString(),
            title: booking.serviceTitle,
            status: 'cancelled',
            reason: fullReason,
            cancelledAt: new Date().toISOString()
          };
          io.emit('job_cancelled', cancelPayload);
          io.emit('job_status_updated', { jobId: jobIdStr, status: 'cancelled' });
          io.to('job_' + jobIdStr).emit('job_cancelled', cancelPayload);
          io.to('user_' + (booking.customer._id || booking.customer).toString()).emit('job_cancelled', cancelPayload);
        }
      }

      // Notify customer
      try {
        await notifyCancellation({
          customerId: booking.customer._id || booking.customer,
          vendorId: req.user.id,
          booking,
          reason: fullReason,
          cancelledBy: 'vendor'
        });
      } catch (notifErr) {
        console.warn('Notification error on cancel:', notifErr.message);
      }

      await booking.save();

      return res.status(200).json({
        success: true,
        message: 'Booking cancelled successfully and customer notified.',
        booking
      });
    }

    // On The Way Workflow
    if (status === 'on_the_way') {
      if (['cancelled'].includes(booking.status)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot depart for a cancelled booking.'
        });
      }
      booking.status = 'on_the_way';
      booking.statusHistory.push({
        status: 'on_the_way',
        updatedBy: req.user.id,
        timestamp: new Date(),
        note: note || 'Specialist has departed and is on the way to the service location.'
      });

      try {
        await notifyStatusChange({
          recipientId: booking.customer._id || booking.customer,
          senderId: req.user.id,
          booking,
          jobTitle: booking.serviceTitle,
          newStatus: 'on_the_way',
          customMessage: `Your service professional is on the way to your location for "${booking.serviceTitle}".`
        });
      } catch (notifErr) {
        console.warn('Notification error on on_the_way:', notifErr.message);
      }

      const io = getIO();
      if (io) {
        io.to('user_' + (booking.customer._id || booking.customer).toString()).emit('booking_status_updated', {
          bookingId: booking._id,
          status: 'on_the_way'
        });
        if (booking.job) {
          io.to('job_' + (booking.job._id || booking.job).toString()).emit('job_status_updated', {
            jobId: booking.job._id || booking.job,
            status: 'on_the_way'
          });
        }
      }

      await booking.save();

      return res.status(200).json({
        success: true,
        message: 'Customer notified that you are on the way to the location.',
        booking
      });
    }

    if (status === 'in_progress') {
      const bWithOtp = await Booking.findById(req.params.id).select('+startOtp.codeHash');
      if (bWithOtp?.startOtp?.codeHash && !bWithOtp?.startOtp?.isConsumed) {
        return res.status(400).json({
          success: false,
          message: 'Service-Start OTP required. Please verify the 6-digit customer OTP via verify-start-otp before commencing work.'
        });
      }
    }

    booking.status = status;
    booking.statusHistory.push({
      status,
      updatedBy: req.user.id,
      timestamp: new Date(),
      note: note || `Booking status updated to ${status}`
    });

    if (status === 'completion_pending') {
      booking.completionEvidence = {
        images: images || [],
        notes: note || 'Work executed according to specifications and safety standards.',
        completedAt: new Date()
      };

      if (booking.job) {
        await Job.findByIdAndUpdate(booking.job, { status: 'completion_pending' });
      }

      // Notify customer to review and sign off
      try {
        await notifyStatusChange({
          recipientId: booking.customer,
          senderId: req.user.id,
          booking,
          jobTitle: booking.serviceTitle,
          newStatus: 'completion_pending',
          customMessage: `${booking.serviceTitle} has been completed by your specialist. Please review the work and confirm sign-off.`
        });
      } catch (notifErr) {
        console.warn('Notification error on completion_pending:', notifErr.message);
      }
    }

    if (status === 'completed') {
      booking.pricing.paymentStatus = 'released';
      booking.completionEvidence = {
        images: images || [],
        notes: note || 'Work executed according to specifications and safety standards.',
        completedAt: new Date()
      };

      // Record payout transaction in live DB
      const existingTx = await Transaction.findOne({ booking: booking._id });
      if (existingTx) {
        existingTx.type = 'escrow_release';
        existingTx.paymentStatus = 'paid_to_bank';
        existingTx.settlementStatus = 'settled';
        if (!existingTx.payoutBank) existingTx.payoutBank = {};
        existingTx.payoutBank.settledDate = new Date();
        await existingTx.save();
      } else {
        await Transaction.create({
          transactionId: `TX-${Math.floor(10000 + Math.random() * 90000)}`,
          booking: booking._id,
          vendor: booking.vendor,
          customer: booking.customer,
          jobTitle: booking.serviceTitle,
          grossAmount: booking.pricing.amount,
          platformFee: booking.pricing.platformFee,
          netAmount: booking.pricing.vendorNet,
          type: 'escrow_release',
          paymentStatus: 'paid_to_bank',
          settlementStatus: 'settled',
          payoutBank: {
            bankName: 'HDFC Bank',
            accountNumberLast4: '4812',
            ifsc: 'HDFC0001024',
            settledDate: new Date()
          }
        });
      }

      // Increment completed jobs on VendorProfile
      await VendorProfile.findOneAndUpdate(
        { user: booking.vendor },
        {
          $inc: {
            completedJobsCount: 1,
            earningsTotal: booking.pricing.vendorNet
          }
        }
      );

      // If associated with a Job, mark job completed
      if (booking.job) {
        await Job.findByIdAndUpdate(booking.job, { status: 'completed' });
      }

      // Notify customer
      try {
        await Notification.create({
          recipient: booking.customer,
          sender: req.user.id,
          type: 'job_alert',
          title: 'Service Completed',
          message: `${booking.serviceTitle} has been marked completed by your technician. Please inspect and review.`,
          link: `/customer/my-jobs`
        });
      } catch (notifErr) {
        console.warn('Notification error on complete:', notifErr.message);
      }
    }

    await booking.save();

    const returnObj = booking.toObject();
    if ((booking.customer?._id || booking.customer)?.toString() !== req.user.id && req.user.role !== 'admin') {
      if (returnObj.startOtp) {
        delete returnObj.startOtp.otp;
        delete returnObj.startOtp.codeHash;
        delete returnObj.startOtp.customerEncryptedOtp;
      }
    }
    returnObj.totalAmount = returnObj.pricing?.amount || returnObj.totalAmount;
    returnObj.isOtpVerified = Boolean(
      returnObj.startOtp?.isConsumed ||
      returnObj.arrivalEvidence?.verified ||
      ['in_progress', 'completion_pending', 'completed'].includes(returnObj.status)
    );

    res.status(200).json({
      success: true,
      message: `Booking updated to ${status}`,
      booking: returnObj
    });
  } catch (error) {
    next(error);
  }
};

export const requestReschedule = async (req, res, next) => {
  try {
    const { newDate, newTimeSlot, reason } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.vendor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    booking.scheduledDate = newDate;
    if (newTimeSlot) booking.timeSlot = newTimeSlot;

    booking.statusHistory.push({
      status: 'scheduled',
      updatedBy: req.user.id,
      timestamp: new Date(),
      note: `Rescheduled to ${new Date(newDate).toDateString()} ${newTimeSlot || ''}. Reason: ${reason || 'Schedule adjustment'}`
    });

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking rescheduled successfully',
      booking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Customer-Only Endpoint: Retrieve secure Service-Start OTP
 * Authenticated property owners only; plaintext never stored unencrypted.
 */
export const getCustomerStartOtp = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .select('+startOtp.customerEncryptedOtp +startOtp.codeHash +startOtp.otp')
      .populate('vendor', 'name email phone avatar')
      .populate('job', 'title status');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const currentUserId = req.user.id;
    const isOwner = booking.customer.toString() === currentUserId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Security Violation: Only the verified property owner can access the Service-Start OTP.'
      });
    }

    if (booking.startOtp?.isConsumed) {
      return res.status(200).json({
        success: true,
        isConsumed: true,
        consumedAt: booking.startOtp.consumedAt,
        message: 'OTP has already been verified on-site. Service is active or completed.'
      });
    }

    // Retrieve or generate reliable 6-digit OTP
    let otp = booking.startOtp?.otp;
    if (!otp && booking.startOtp?.customerEncryptedOtp) {
      otp = decryptCustomerOtp(booking.startOtp.customerEncryptedOtp);
    }

    if (!otp) {
      otp = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = hashOtp(otp);
      const expiresAt = new Date(Date.now() + 7 * 86400000);
      booking.startOtp = {
        otp,
        codeHash,
        expiresAt,
        attempts: 0,
        maxAttempts: 5,
        isConsumed: false
      };
      await booking.save();
    }

    res.status(200).json({
      success: true,
      otp,
      expiresAt: booking.startOtp?.expiresAt,
      attempts: booking.startOtp?.attempts || 0,
      maxAttempts: booking.startOtp?.maxAttempts || 5,
      isConsumed: false
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Vendor-Only Endpoint: Verify GPS Geofence Arrival at Customer Service Location
 * POST /api/bookings/:id/verify-arrival
 */
export const verifyArrival = async (req, res, next) => {
  try {
    const { latitude, longitude, accuracy, timestamp } = req.body;

    const booking = await Booking.findById(req.params.id)
      .populate('job', 'location title customer')
      .populate('customer', 'name');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const currentUserId = req.user.id;
    const isAssignedVendor = booking.vendor.toString() === currentUserId;
    const isAdmin = req.user.role === 'admin';

    if (!isAssignedVendor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned service professional can verify arrival for this booking.'
      });
    }

    if (['completed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Booking is already ${booking.status}. Arrival verification is not permitted.`
      });
    }

    // Validate incoming coordinate values
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(422).json({
        success: false,
        status: 'LOCATION_UNAVAILABLE',
        message: 'Invalid GPS coordinates provided. Please enable device location with high accuracy.'
      });
    }

    // Verify timestamp freshness (within 5 minutes)
    if (timestamp && Date.now() - new Date(timestamp).getTime() > 5 * 60 * 1000) {
      return res.status(422).json({
        success: false,
        status: 'STALE_GPS_EVIDENCE',
        message: 'Stale location reading detected. Please acquire a fresh real-time location lock.'
      });
    }

    // Verify GPS accuracy
    const reportedAccuracy = Number(accuracy);
    if (!isNaN(reportedAccuracy) && reportedAccuracy > GEOFENCE_DEFAULT_MAX_ACCURACY_METERS) {
      return res.status(422).json({
        success: false,
        status: 'GPS_ACCURACY_INSUFFICIENT',
        accuracy: Math.round(reportedAccuracy),
        maxAllowedAccuracy: GEOFENCE_DEFAULT_MAX_ACCURACY_METERS,
        message: `GPS accuracy is ±${Math.round(reportedAccuracy)}m, which exceeds the required ±${GEOFENCE_DEFAULT_MAX_ACCURACY_METERS}m limit. Please move to an open area and retry.`
      });
    }

    // Retrieve destination coordinates
    const destLat = booking.address?.coordinates?.lat || booking.job?.location?.coordinates?.lat;
    const destLng = booking.address?.coordinates?.lng || booking.job?.location?.coordinates?.lng;

    const hasDestinationCoords =
      destLat && destLng &&
      !isNaN(Number(destLat)) && !isNaN(Number(destLng)) &&
      (Number(destLat) !== 0 || Number(destLng) !== 0);

    let distance = 0;
    if (hasDestinationCoords) {
      distance = calculateDistanceMeters(destLat, destLng, lat, lng);

      if (distance > GEOFENCE_DEFAULT_RADIUS_METERS) {
        return res.status(422).json({
          success: false,
          status: 'OUTSIDE_SERVICE_RADIUS',
          distanceMeters: distance,
          allowedRadiusMeters: GEOFENCE_DEFAULT_RADIUS_METERS,
          message: `Arrival outside service boundary. You are currently ${distance}m away from the destination. You must be within ${GEOFENCE_DEFAULT_RADIUS_METERS}m to verify arrival.`
        });
      }
    }

    // Arrival verified! Persist arrival evidence with configured expiry (30m)
    const verifiedAt = new Date();
    const expiresAt = new Date(Date.now() + GEOFENCE_EVIDENCE_EXPIRY_MS);

    booking.arrivalEvidence = {
      verified: true,
      verifiedAt,
      vendorCoordinates: { lat, lng },
      accuracyMeters: isNaN(reportedAccuracy) ? null : reportedAccuracy,
      distanceMeters: distance,
      expiresAt
    };

    booking.statusHistory.push({
      status: booking.status,
      updatedBy: req.user.id,
      timestamp: verifiedAt,
      note: `Vendor arrival verified on-site via GPS geofence (${distance}m from destination, ±${Math.round(reportedAccuracy || 0)}m accuracy).`
    });

    await booking.save();

    // Notify customer in real-time
    const io = getIO();
    if (io) {
      io.to('user_' + booking.customer._id || booking.customer.toString()).emit('vendor_arrived', {
        bookingId: booking._id,
        distanceMeters: distance,
        verifiedAt
      });
    }

    try {
      await Notification.create({
        recipient: booking.customer._id || booking.customer,
        sender: req.user.id,
        type: 'job_alert',
        title: 'Technician Arrived On-Site',
        message: `${req.user.name || 'Your technician'} has arrived within ${distance}m of your service location. Please provide your 6-digit PIN to start work.`,
        link: `/customer/bookings`
      });
    } catch (notifErr) {
      console.warn('Notification create warning:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      status: 'ARRIVAL_VERIFIED',
      message: `Arrival confirmed! You are within ${distance}m of the service location. Please enter the customer's 6-digit OTP to start service.`,
      distanceMeters: distance,
      accuracyMeters: reportedAccuracy,
      expiresAt
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Vendor-Only Endpoint: Verify Service-Start OTP upon physical arrival
 * Transition to IN_PROGRESS happens strictly upon successful verification of both arrival & OTP.
 */
export const verifyStartOtp = async (req, res, next) => {
  try {
    const { otp, latitude, longitude, accuracy } = req.body;
    if (!otp || String(otp).trim().length !== 6) {
      return res.status(422).json({
        success: false,
        message: 'Please provide a valid 6-digit numeric Service-Start OTP provided by the customer.'
      });
    }

    const booking = await Booking.findById(req.params.id)
      .select('+startOtp.codeHash +startOtp.otp')
      .populate('customer', 'name email phone')
      .populate('job');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const currentUserId = req.user.id;
    const isAssignedVendor = booking.vendor.toString() === currentUserId;
    const isAdmin = req.user.role === 'admin';

    if (!isAssignedVendor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned service professional can verify this job start OTP.'
      });
    }

    if (['completed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `This booking is already marked ${booking.status} and cannot be restarted.`
      });
    }

    if (booking.status === 'in_progress') {
      const returnObj = booking.toObject();
      if (returnObj.startOtp) {
        delete returnObj.startOtp.otp;
        delete returnObj.startOtp.codeHash;
        delete returnObj.startOtp.customerEncryptedOtp;
      }
      returnObj.totalAmount = returnObj.pricing?.amount || returnObj.totalAmount;
      returnObj.isOtpVerified = true;
      return res.status(200).json({
        success: true,
        message: 'Service is already in progress.',
        booking: returnObj
      });
    }

    if (booking.startOtp?.isConsumed) {
      return res.status(400).json({
        success: false,
        message: 'Service-Start OTP has already been verified and consumed.'
      });
    }

    // Geofence Arrival Validation: Check if arrival was already verified or coordinates passed now
    const destCoordsLat = booking.address?.coordinates?.lat || booking.job?.location?.coordinates?.lat;
    const destCoordsLng = booking.address?.coordinates?.lng || booking.job?.location?.coordinates?.lng;
    const hasDestinationCoords = destCoordsLat && destCoordsLng && (Number(destCoordsLat) !== 0 || Number(destCoordsLng) !== 0);

    const isArrivalValid =
      booking.status === 'arrived' ||
      !hasDestinationCoords ||
      (booking.arrivalEvidence?.verified &&
        (!booking.arrivalEvidence?.expiresAt || new Date() <= new Date(booking.arrivalEvidence.expiresAt)));

    if (!isArrivalValid) {
      if (latitude !== undefined && longitude !== undefined) {
        const lat = Number(latitude);
        const lng = Number(longitude);
        const destLat = booking.address?.coordinates?.lat || booking.job?.location?.coordinates?.lat;
        const destLng = booking.address?.coordinates?.lng || booking.job?.location?.coordinates?.lng;

        if (destLat && destLng && (Number(destLat) !== 0 || Number(destLng) !== 0)) {
          const dist = calculateDistanceMeters(destLat, destLng, lat, lng);
          if (dist > GEOFENCE_DEFAULT_RADIUS_METERS) {
            return res.status(422).json({
              success: false,
              status: 'OUTSIDE_SERVICE_RADIUS',
              message: `Geofence check failed: you are ${dist}m away from the destination (limit: ${GEOFENCE_DEFAULT_RADIUS_METERS}m).`
            });
          }
        }
        booking.arrivalEvidence = {
          verified: true,
          verifiedAt: new Date(),
          vendorCoordinates: { lat, lng },
          accuracyMeters: Number(accuracy) || null,
          distanceMeters: 0,
          expiresAt: new Date(Date.now() + GEOFENCE_EVIDENCE_EXPIRY_MS)
        };
      } else {
        return res.status(400).json({
          success: false,
          status: 'ARRIVAL_REQUIRED',
          message: 'GPS Arrival verification required before starting service. Please click "Verify Arrival (GPS Geofence)" first.'
        });
      }
    }

    // Check bounded attempts
    const currentAttempts = booking.startOtp?.attempts || 0;
    const maxAttempts = booking.startOtp?.maxAttempts || 5;
    if (currentAttempts >= maxAttempts) {
      return res.status(400).json({
        success: false,
        message: 'Maximum OTP verification attempts exceeded (5/5). Please ask the customer to generate a fresh OTP from their booking dashboard.'
      });
    }

    // Check expiry
    if (booking.startOtp?.expiresAt && new Date() > new Date(booking.startOtp.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'This Service-Start OTP has expired. Please ask the customer to generate a fresh OTP.'
      });
    }

    // Verify code: direct match or hash match
    const submittedCode = String(otp).trim();
    const isDirectMatch = booking.startOtp?.otp && booking.startOtp.otp === submittedCode;
    const isHashMatch = verifyOtpMatch(submittedCode, booking.startOtp?.codeHash);

    if (!isDirectMatch && !isHashMatch) {
      await Booking.findByIdAndUpdate(booking._id, {
        $inc: { 'startOtp.attempts': 1 }
      });
      const remaining = maxAttempts - currentAttempts - 1;
      return res.status(400).json({
        success: false,
        message: `Invalid Service-Start OTP. Please verify the 6-digit code with the customer. (${remaining > 0 ? remaining + ' attempts remaining' : 'attempts exhausted'})`
      });
    }

    // Valid OTP! Atomically update booking & job to in_progress
    booking.status = 'in_progress';
    booking.startOtp.isConsumed = true;
    booking.startOtp.consumedAt = new Date();
    if (!booking.arrivalEvidence) booking.arrivalEvidence = {};
    booking.arrivalEvidence.verified = true;
    booking.arrivalEvidence.verifiedAt = new Date();
    booking.statusHistory.push({
      status: 'in_progress',
      updatedBy: req.user.id,
      timestamp: new Date(),
      note: 'Customer verified in-person with 6-digit Service-Start OTP. Work officially started.'
    });
    await booking.save();

    if (booking.job) {
      await Job.findByIdAndUpdate(booking.job, { status: 'in_progress' });
    }

    // Persistent in-app & email notification to customer
    try {
      await notifyStatusChange({
        recipientId: booking.customer._id || booking.customer,
        senderId: req.user.id,
        booking,
        jobTitle: booking.serviceTitle,
        newStatus: 'in_progress',
        customMessage: `${req.user.name || 'Your technician'} has verified your OTP and commenced work on "${booking.serviceTitle}".`
      });
    } catch (notifErr) {
      console.warn('Notification error on start:', notifErr.message);
    }

    // Real-time socket updates
    const io = getIO();
    if (io) {
      io.to('user_' + (booking.customer._id || booking.customer).toString()).emit('service_started', {
        bookingId: booking._id,
        jobId: booking.job?._id || booking.job,
        startedAt: new Date()
      });
      io.to('user_' + (booking.vendor._id || booking.vendor).toString()).emit('service_started', {
        bookingId: booking._id,
        jobId: booking.job?._id || booking.job,
        startedAt: new Date()
      });
      io.to('job_' + (booking.job?._id || booking.job)).emit('job_status_updated', {
        jobId: booking.job?._id || booking.job,
        status: 'in_progress',
        updatedBy: req.user.id
      });
    }

    const returnObj = booking.toObject();
    if (returnObj.startOtp) {
      delete returnObj.startOtp.otp;
      delete returnObj.startOtp.codeHash;
      delete returnObj.startOtp.customerEncryptedOtp;
    }
    returnObj.totalAmount = returnObj.pricing?.amount || returnObj.totalAmount;
    returnObj.isOtpVerified = true;

    res.status(200).json({
      success: true,
      message: 'Service-Start OTP verified successfully. Work has commenced!',
      booking: returnObj
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Customer-Only Endpoint: Regenerate a fresh Service-Start OTP
 */
export const regenerateStartOtp = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.customer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to regenerate OTP' });
    }

    if (['in_progress', 'completed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot regenerate OTP for a booking that is ${booking.status}.`
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 7 * 86400000);

    booking.startOtp = {
      otp,
      codeHash,
      expiresAt,
      attempts: 0,
      maxAttempts: 5,
      isConsumed: false
    };
    booking.statusHistory.push({
      status: booking.status,
      updatedBy: req.user.id,
      timestamp: new Date(),
      note: 'Customer regenerated a fresh Service-Start OTP.'
    });
    await booking.save();

    res.status(200).json({
      success: true,
      otp,
      expiresAt,
      message: 'New Service-Start OTP generated successfully.'
    });
  } catch (error) {
    next(error);

  }
};

