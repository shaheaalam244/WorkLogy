import Application from '../models/Application.js';
import Job from '../models/Job.js';
import Booking from '../models/Booking.js';
import Notification from '../models/Notification.js';
import Transaction from '../models/Transaction.js';
import VendorProfile from '../models/VendorProfile.js';
import { generateSecureOtp } from '../utils/otp.js';
import { getIO } from '../config/socket.js';
import { notifyNewQuotation, notifyBookingConfirmed } from '../services/notification.service.js';



export const applyForJob = async (req, res, next) => {
  try {
    const {
      jobId,
      proposedAmount,
      pricingBasis,
      proposedSchedule,
      coverLetter,
      estimatedDuration,
      includedServices,
      materialCharges
    } = req.body;

    // Check professional approval status
    const profile = await VendorProfile.findOne({ user: req.user.id });
    if (!profile || profile.approvalStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Your professional account is currently pending administrator approval. You cannot submit quotations until your account is approved.'
      });
    }

    const amountNum = Number(proposedAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid quotation amount greater than 0' });
    }

    if (!coverLetter || !coverLetter.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a message or cover note with your proposal' });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.status !== 'open' || job.isDeleted) {
      return res.status(409).json({
        success: false,
        message: 'This request has already been cancelled or is no longer available.'
      });
    }

    if (job.customer.toString() === req.user.id) {
      return res.status(400).json({ success: false, message: 'Customers cannot submit quotations on their own job request' });
    }

    const existing = await Application.findOne({ job: jobId, vendor: req.user.id });
    if (existing) {
      if (existing.status === 'withdrawn') {
        existing.status = 'submitted';
        existing.proposedAmount = amountNum;
        existing.pricingBasis = pricingBasis || 'fixed';
        existing.proposedSchedule = proposedSchedule || 'Tomorrow 10:00 AM';
        existing.coverLetter = coverLetter.trim();
        existing.estimatedDuration = estimatedDuration || '1-2 days';
        existing.includedServices = includedServices || 'Inspection, labor, diagnostics and cleanup';
        existing.materialCharges = Number(materialCharges) || 0;
        await existing.save();

        await Job.findByIdAndUpdate(jobId, { $inc: { applicantsCount: 1 } });
        return res.status(200).json({ success: true, message: 'Proposal re-submitted', application: existing });
      }
      return res.status(400).json({ success: false, message: 'You have already submitted an active proposal for this job' });
    }

    const application = await Application.create({
      job: jobId,
      vendor: req.user.id,
      proposedAmount: amountNum,
      pricingBasis: pricingBasis || 'fixed',
      proposedSchedule: proposedSchedule || 'Tomorrow 10:00 AM',
      coverLetter: coverLetter.trim(),
      estimatedDuration: estimatedDuration || '1-2 days',
      includedServices: includedServices || 'Inspection, labor, diagnostics and cleanup',
      materialCharges: Number(materialCharges) || 0,
      status: 'submitted'
    });

    await Job.findByIdAndUpdate(jobId, { $inc: { applicantsCount: 1 } });

    // Notify the customer via unified notification service (in-app + email)
    await notifyNewQuotation({
      customerId: job.customer,
      vendorId: req.user.id,
      job,
      proposedAmount: amountNum,
      quotationId: application._id
    });


    res.status(201).json({ success: true, message: 'Proposal submitted successfully', application });
  } catch (error) {
    next(error);
  }
};

export const getJobApplications = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    let filter = { job: req.params.jobId };

    // Role-based visibility
    if (req.user.role === 'vendor') {
      filter.vendor = req.user.id;
    } else if (req.user.role === 'customer' && job.customer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view quotations for this job' });
    }

    const applications = await Application.find(filter)
      .populate('vendor', 'name email avatar phone')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, applications });
  } catch (error) {
    next(error);
  }
};

export const getVendorApplications = async (req, res, next) => {
  try {
    const filter = { vendor: req.user.id };
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    const applications = await Application.find(filter)
      .populate({
        path: 'job',
        populate: [
          { path: 'customer', select: 'name email phone avatar' },
          { path: 'category', select: 'name slug icon' },
          { path: 'booking', select: '_id status bookingReference scheduledDate pricing' }
        ]
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, applications });
  } catch (error) {
    next(error);
  }
};

export const withdrawApplication = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    if (application.vendor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (application.status === 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot withdraw an accepted contract. Please coordinate with client or support.'
      });
    }

    application.status = 'withdrawn';
    await application.save();

    await Job.findByIdAndUpdate(application.job, { $inc: { applicantsCount: -1 } });

    res.status(200).json({ success: true, message: 'Proposal withdrawn successfully', application });
  } catch (error) {
    next(error);
  }
};

export const updateApplicationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const application = await Application.findById(req.params.id).populate('job');
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });

    // Authorization: only job owner customer or admin can accept/reject
    if (status === 'accepted' || status === 'rejected') {
      if (application.job.customer.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Only the property owner can accept or reject proposals' });
      }

      if (status === 'accepted' && (application.job.status !== 'open' || application.job.isDeleted)) {
        return res.status(409).json({ success: false, message: 'This request has already been cancelled or is no longer available.' });
      }
    }

    application.status = status;
    await application.save();

    if (status === 'accepted') {
      // Reject all other active applications for this job to prevent double-assignment
      await Application.updateMany(
        { job: application.job._id, _id: { $ne: application._id }, status: 'submitted' },
        { $set: { status: 'rejected' } }
      );

      // Generate cryptographically secure service start OTP
      const { otp, codeHash, customerEncryptedOtp } = generateSecureOtp();

      // Automatically create confirmed booking with exact confirmed service location and coordinates
      const jobLoc = application.job.location || {};
      const newBooking = await Booking.create({
        bookingReference: `BK-${Math.floor(10000 + Math.random() * 90000)}`,
        customer: application.job.customer,
        vendor: application.vendor,
        job: application.job._id,
        application: application._id,
        serviceTitle: application.job.title,
        category: application.job.category?.name || 'General Trade',
        scheduledDate: application.job.preferredDate ? new Date(application.job.preferredDate) : new Date(Date.now() + 86400000),
        timeSlot: application.job.preferredTime || '10:00 AM - 12:00 PM',
        address: {
          addressLabel: jobLoc.addressLabel || 'Service Location',
          houseNumber: jobLoc.houseNumber || '',
          street: jobLoc.street || '',
          locality: jobLoc.locality || '',
          landmark: jobLoc.landmark || '',
          city: jobLoc.city || 'Lucknow',
          state: jobLoc.state || 'Uttar Pradesh',
          zipCode: jobLoc.zipCode || '226010',
          country: jobLoc.country || 'India',
          coordinates: {
            lat: jobLoc.coordinates?.lat || 0,
            lng: jobLoc.coordinates?.lng || 0
          }
        },
        pricing: {
          amount: application.proposedAmount,
          platformFee: Math.round(application.proposedAmount * 0.05),
          vendorNet: Math.round(application.proposedAmount * 0.95),
          isPaid: true,
          paymentStatus: 'escrow_locked'
        },
        status: 'confirmed',
        startOtp: {
          otp,
          codeHash,
          customerEncryptedOtp,
          expiresAt: new Date(Date.now() + 7 * 86400000),
          attempts: 0,
          maxAttempts: 5,
          isConsumed: false
        }
      });

      // Create matching Escrow Hold Transaction
      await Transaction.create({
        transactionId: `TX-${Math.floor(10000 + Math.random() * 90000)}`,
        booking: newBooking._id,
        vendor: application.vendor,
        customer: application.job.customer,
        jobTitle: application.job.title,
        grossAmount: application.proposedAmount,
        platformFee: Math.round(application.proposedAmount * 0.05),
        netAmount: Math.round(application.proposedAmount * 0.95),
        type: 'escrow_hold',
        paymentStatus: 'held_in_escrow',
        settlementStatus: 'pending'
      });

      // Atomically mark job assigned and link booking and final agreed price (Concurrency Guard)
      const assignedJob = await Job.findOneAndUpdate(
        {
          _id: application.job._id,
          status: 'open',
          selectedVendor: null,
          isDeleted: { $ne: true }
        },
        {
          status: 'assigned',
          selectedVendor: application.vendor,
          assignedAt: new Date(),
          booking: newBooking._id,
          finalPrice: {
            amount: application.proposedAmount,
            pricingType: application.pricingBasis || 'fixed',
            estimatedDuration: application.estimatedDuration || ''
          }
        },
        { new: true }
      );

      if (!assignedJob) {
        await Booking.findByIdAndDelete(newBooking._id);
        return res.status(409).json({
          success: false,
          message: 'This request has already been cancelled or is no longer available.'
        });
      }

      // Notify both customer and vendor of booking confirmation (in-app + email)
      await notifyBookingConfirmed({
        customerId: application.job.customer,
        vendorId: application.vendor,
        booking: newBooking,
        jobTitle: application.job.title
      });


      const io = getIO();
      if (io) {
        io.emit('job_taken', { jobId: application.job._id.toString(), title: application.job.title });
        io.emit('job_status_updated', { jobId: application.job._id.toString(), status: 'assigned' });
      }

      return res.status(200).json({
        success: true,
        message: 'Quotation accepted and booking confirmed with escrow protection.',
        application,
        booking: newBooking
      });
    } else if (status === 'rejected') {
      await Notification.create({
        recipient: application.vendor,
        sender: req.user.id,
        type: 'proposal_rejected',
        title: 'Quotation Status Update',
        message: `Your quotation on "${application.job.title}" was not selected by the property owner.`,
        link: `/jobs/${application.job._id}`
      });
    }


    res.status(200).json({ success: true, application });
  } catch (error) {
    next(error);
  }
};
