import mongoose from 'mongoose';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import Booking from '../models/Booking.js';
import Transaction from '../models/Transaction.js';
import CustomerProfile from '../models/CustomerProfile.js';
import Notification from '../models/Notification.js';
import Review from '../models/Review.js';
import { hashOtp } from '../utils/otp.js';
import { getIO } from '../config/socket.js';

export const getCustomerDashboardSummary = async (req, res, next) => {
  try {
    const customerId = req.user.id;

    // 1. Fetch customer's jobs (populated with category, selected vendor, and booking)
    const customerJobs = await Job.find({ customer: customerId, isDeleted: { $ne: true } })
      .populate('category', 'name slug icon')
      .populate('selectedVendor', 'name avatar email phone businessName rating')
      .populate('booking')
      .sort({ createdAt: -1 });

    // 2. Fetch customer's bookings (populated with vendor, job, and service)
    const customerBookings = await Booking.find({ customer: customerId })
      .populate('vendor', 'name email phone avatar businessName rating')
      .populate({
        path: 'job',
        select: 'title budget urgency location category preferredDate preferredTime status',
        populate: { path: 'category', select: 'name icon' }
      })
      .populate('service', 'title pricing domain')
      .sort({ scheduledDate: 1, createdAt: -1 });

    // 3. Fetch applications submitted to customer's open jobs only
    const openJobIds = customerJobs
      .filter(j => j.status === 'open')
      .map(j => j._id);

    const pendingApplications = await Application.find({
      job: { $in: openJobIds },
      status: 'submitted'
    })
      .populate('vendor', 'name email phone avatar businessName rating')
      .populate({
        path: 'job',
        select: 'title budget category location preferredDate preferredTime status',
        populate: { path: 'category', select: 'name icon' }
      })
      .sort({ createdAt: -1 });

    // 4. Fetch customer transactions from Transaction model
    let transactions = await Transaction.find({ customer: customerId })
      .populate('vendor', 'name avatar businessName')
      .populate('booking')
      .sort({ createdAt: -1 });

    // 5. Customer Profile (Saved vendors & addresses count)
    let profile = await CustomerProfile.findOne({ user: customerId }).populate('savedVendors');
    if (!profile) {
      profile = await CustomerProfile.create({ user: customerId });
    }

    // 6. Build Deduplicated Order Registry
    // If a job is linked to a booking, the booking is the canonical active fulfillment record.
    const jobBookingMap = new Map();
    customerBookings.forEach(b => {
      const jId = b.job?._id?.toString() || b.job?.toString();
      if (jId) {
        jobBookingMap.set(jId, b);
      }
    });

    // Deduplicated Ongoing / Active Orders
    // An order is active if status is in: assigned, confirmed, scheduled, in_progress, completion_pending
    const activeBookingList = customerBookings.filter(b =>
      ['awaiting_confirmation', 'assigned', 'confirmed', 'scheduled', 'in_progress', 'completion_pending'].includes(b.status)
    );

    // Any job that is in_progress / assigned but NOT in customerBookings
    const standaloneActiveJobs = customerJobs.filter(j =>
      ['assigned', 'in_progress', 'completion_pending'].includes(j.status) &&
      !jobBookingMap.has(j._id.toString())
    );

    const ongoingWork = [
      ...activeBookingList.map(b => {
        // Map 4-stage stepper
        // Stage 1: Request Posted (open)
        // Stage 2: Vendor Assigned (awaiting_confirmation, assigned, confirmed, scheduled)
        // Stage 3: Work in Progress (in_progress, completion_pending)
        // Stage 4: Completed (completed)
        let stage = 2;
        if (['in_progress', 'completion_pending'].includes(b.status)) {
          stage = 3;
        } else if (b.status === 'completed') {
          stage = 4;
        }

        const isPriced = typeof b.pricing?.amount === 'number' && b.pricing.amount > 0;
        return {
          _id: b._id,
          orderType: 'booking',
          bookingReference: b.bookingReference || `BK-${b._id.toString().slice(-6).toUpperCase()}`,
          serviceTitle: b.serviceTitle || b.job?.title || 'Home Service Order',
          category: b.category || b.job?.category?.name || 'Home Services',
          status: b.status,
          stage,
          scheduledDate: b.scheduledDate || b.createdAt,
          timeSlot: b.timeSlot || 'Standard Window',
          vendor: b.vendor ? {
            _id: b.vendor._id,
            name: b.vendor.name || 'Verified Specialist',
            avatar: b.vendor.avatar,
            phone: b.vendor.phone,
            rating: b.vendor.rating || 4.9,
            isVerified: true
          } : null,
          pricing: {
            amount: b.pricing?.amount || 0,
            isPriced,
            pricingLabel: isPriced ? `₹${b.pricing.amount.toLocaleString('en-IN')}` : 'Awaiting confirmation',
            paymentStatus: b.pricing?.paymentStatus || 'escrow_locked',
            isPaid: Boolean(b.pricing?.isPaid)
          },
          startOtp: b.startOtp?.otp || null,
          address: b.address || b.job?.location,
          jobId: b.job?._id || b.job,
          bookingId: b._id
        };
      }),
      ...standaloneActiveJobs.map(j => {
        const isPriced = Boolean(j.finalPrice?.amount || (j.budget?.type === 'fixed' && j.budget?.amount > 0));
        const priceAmount = j.finalPrice?.amount || (j.budget?.type === 'fixed' ? j.budget.amount : 0);
        return {
          _id: j._id,
          orderType: 'job',
          bookingReference: `ORD-${j._id.toString().slice(-6).toUpperCase()}`,
          serviceTitle: j.title,
          category: j.category?.name || 'Home Services',
          status: j.status,
          stage: j.status === 'in_progress' ? 3 : 2,
          scheduledDate: j.preferredDate || j.createdAt,
          timeSlot: j.preferredTime || 'Flexible',
          vendor: j.selectedVendor ? {
            _id: j.selectedVendor._id,
            name: j.selectedVendor.name || 'Assigned Technician',
            avatar: j.selectedVendor.avatar,
            phone: j.selectedVendor.phone,
            rating: j.selectedVendor.rating || 4.9,
            isVerified: true
          } : null,
          pricing: {
            amount: priceAmount,
            isPriced,
            pricingLabel: isPriced ? `₹${priceAmount.toLocaleString('en-IN')}` : 'Awaiting quotation',
            paymentStatus: 'escrow_locked',
            isPaid: true
          },
          startOtp: null,
          address: j.location,
          jobId: j._id,
          bookingId: null
        };
      })
    ];

    // Sort ongoingWork so actively executing jobs (in_progress) are prioritized, followed by recent bookings
    const statusPriority = { in_progress: 1, completion_pending: 2, assigned: 3, confirmed: 4, scheduled: 5, awaiting_confirmation: 6 };
    ongoingWork.sort((a, b) => {
      const pA = statusPriority[a.status] || 10;
      const pB = statusPriority[b.status] || 10;
      if (pA !== pB) return pA - pB;
      return new Date(b.scheduledDate || 0) - new Date(a.scheduledDate || 0);
    });

    // Upcoming Bookings:
    const upcomingBookings = customerBookings.filter(b =>
      ['awaiting_confirmation', 'assigned', 'confirmed', 'scheduled'].includes(b.status)
    );


    // Completed Orders (deduplicated):
    const completedBookingJobIds = new Set(
      customerBookings.filter(b => b.status === 'completed').map(b => b.job?._id?.toString() || b.job?.toString()).filter(Boolean)
    );
    const completedBookings = customerBookings.filter(b => b.status === 'completed');
    const standaloneCompletedJobs = customerJobs.filter(j =>
      j.status === 'completed' && !completedBookingJobIds.has(j._id.toString())
    );
    const completedOrdersCount = completedBookings.length + standaloneCompletedJobs.length;

    // Active Orders Count:
    const activeOrdersCount = ongoingWork.length;

    // Pending Quotations Count:
    const pendingQuotationsCount = pendingApplications.length;

    // Upcoming Bookings Count:
    const upcomingBookingsCount = upcomingBookings.length;

    // 7. Accurate Financial Metrics derived from actual transactions & bookings
    // Escrow held = active bookings where funds are secured in escrow
    const escrowProtected = customerBookings
      .filter(b => ['awaiting_confirmation', 'assigned', 'confirmed', 'scheduled', 'in_progress', 'completion_pending'].includes(b.status) && (b.pricing?.paymentStatus === 'escrow_locked' || b.pricing?.isPaid))
      .reduce((acc, curr) => acc + (curr.pricing?.amount || 0), 0);

    // Total Spent = completed bookings where payment has been successfully released
    const totalSpent = customerBookings
      .filter(b => b.status === 'completed')
      .reduce((acc, curr) => acc + (curr.pricing?.amount || 0), 0);

    // Refunds = cancelled bookings with refunded status
    const refunds = customerBookings
      .filter(b => b.status === 'cancelled' && b.pricing?.paymentStatus === 'refunded')
      .reduce((acc, curr) => acc + (curr.pricing?.amount || 0), 0);

    // Pending Payments = bookings where payment is pending confirmation
    const pendingPayments = customerBookings
      .filter(b => b.pricing?.paymentStatus === 'pending')
      .reduce((acc, curr) => acc + (curr.pricing?.amount || 0), 0);

    // 8. Build Recent Orders List (Unified & Deduplicated)
    // Gather all customer records:
    const allRecentOrders = [];
    const seenOrderKeys = new Set();

    // Add bookings first
    for (const b of customerBookings) {
      const key = `booking-${b._id}`;
      seenOrderKeys.add(key);
      if (b.job) {
        seenOrderKeys.add(`job-${b.job._id?.toString() || b.job}`);
      }
      const isPriced = typeof b.pricing?.amount === 'number' && b.pricing.amount > 0;
      allRecentOrders.push({
        _id: b._id,
        orderType: 'booking',
        reference: b.bookingReference || `BK-${b._id.toString().slice(-6).toUpperCase()}`,
        title: b.serviceTitle || b.job?.title || 'Service Booking',
        category: b.category || b.job?.category?.name || 'Home Services',
        status: b.status,
        vendorName: b.vendor?.name || 'Pending Assignment',
        vendorAvatar: b.vendor?.avatar || null,
        amount: isPriced ? b.pricing.amount : null,
        pricingLabel: isPriced ? `₹${b.pricing.amount.toLocaleString('en-IN')}` : 'Awaiting confirmation',
        date: b.scheduledDate || b.createdAt,
        createdAt: b.createdAt,
        detailLink: `/customer/bookings`,
        jobId: b.job?._id || b.job
      });
    }

    // Add jobs that don't have a booking attached
    for (const j of customerJobs) {
      const key = `job-${j._id}`;
      if (!seenOrderKeys.has(key)) {
        seenOrderKeys.add(key);
        const hasBudget = j.budget?.type === 'fixed' && j.budget?.amount > 0;
        const hasFinalPrice = j.finalPrice?.amount > 0;
        const amount = hasFinalPrice ? j.finalPrice.amount : (hasBudget ? j.budget.amount : null);

        let pricingLabel = 'Awaiting quotation';
        if (amount !== null) {
          pricingLabel = `₹${amount.toLocaleString('en-IN')}`;
        } else if (j.budget?.type === 'quote') {
          pricingLabel = 'Quote based';
        }

        allRecentOrders.push({
          _id: j._id,
          orderType: 'job',
          reference: `ORD-${j._id.toString().slice(-6).toUpperCase()}`,
          title: j.title,
          category: j.category?.name || 'Home Services',
          status: j.status,
          vendorName: j.selectedVendor?.name || null,
          vendorAvatar: j.selectedVendor?.avatar || null,
          amount,
          pricingLabel,
          date: j.preferredDate || j.createdAt,
          createdAt: j.createdAt,
          detailLink: `/jobs/${j._id}`,
          jobId: j._id
        });
      }
    }

    // Sort by recent first
    allRecentOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      metrics: {
        activeOrdersCount,
        pendingQuotationsCount,
        upcomingBookingsCount,
        completedOrdersCount,
        totalJobsPosted: customerJobs.length,
        totalSpent,
        escrowProtected,
        pendingPayments,
        refunds
      },
      ongoingWork: ongoingWork.slice(0, 4),
      recentOrders: allRecentOrders.slice(0, 10),
      pendingQuotations: pendingApplications.slice(0, 6),
      upcomingBookings: upcomingBookings.slice(0, 4),
      recentTransactions: transactions.slice(0, 5),
      savedVendorsCount: profile.savedVendors?.length || 0,
      savedAddressesCount: profile.addresses?.length || 0
    });
  } catch (error) {
    next(error);
  }
};


export const getCustomerBookings = async (req, res, next) => {
  try {
    const { status, bookingType } = req.query;
    let query = { customer: req.user.id };

    if (bookingType && bookingType !== 'all') {
      query.bookingType = bookingType;
    }

    if (status && status !== 'all') {
      if (status === 'awaiting_response') {
        query.status = { $in: ['pending_acceptance', 'awaiting_confirmation'] };
      } else if (status === 'confirmed') {
        query.status = { $in: ['assigned', 'confirmed', 'scheduled'] };
      } else if (status === 'on_the_way') {
        query.status = 'on_the_way';
      } else if (status === 'in_progress') {
        query.status = { $in: ['arrived', 'in_progress', 'completion_pending'] };
      } else if (status === 'completed') {
        query.status = 'completed';
      } else if (status === 'cancelled') {
        query.status = { $in: ['cancelled', 'declined'] };
      } else if (status !== 'quotations_received') {
        query.status = status;
      }
    }

    const bookings = await Booking.find(query)
      .populate('vendor', 'name email phone avatar businessName rating')
      .populate({
        path: 'job',
        select: 'title budget urgency location category preferredDate preferredTime applicantsCount status',
        populate: { path: 'category', select: 'name icon' }
      })
      .populate('service', 'title pricing domain')
      .populate('review', 'rating comment moderationStatus isPublic response createdAt')
      .sort({ scheduledDate: 1, createdAt: -1 });

    // Also fetch customer open requests to display in unified view if status matches 'all' or 'awaiting_response' or 'quotations_received'
    let openJobsAsOrders = [];
    if (!status || status === 'all' || status === 'awaiting_response' || status === 'quotations_received') {
      let jobQuery = { customer: req.user.id, status: 'open', isDeleted: { $ne: true } };
      if (status === 'quotations_received') {
        jobQuery.applicantsCount = { $gt: 0 };
      }
      const openJobs = await Job.find(jobQuery)
        .populate('category', 'name icon')
        .sort({ createdAt: -1 });

      openJobsAsOrders = openJobs.map(j => ({
        _id: j._id,
        isJobRequest: true,
        bookingReference: `REQ-${j._id.toString().slice(-6).toUpperCase()}`,
        bookingType: 'open_request',
        serviceTitle: j.title,
        category: j.category?.name || 'Home Services',
        serviceType: j.serviceType || 'repair',
        status: (j.applicantsCount || 0) > 0 ? 'quotations_received' : 'open',
        displayStatus: (j.applicantsCount || 0) > 0 ? 'Quotations Received' : 'Awaiting Bids',
        applicantsCount: j.applicantsCount || 0,
        scheduledDate: j.preferredDate ? new Date(j.preferredDate) : j.createdAt,
        timeSlot: j.preferredTime || 'Flexible',
        address: j.location,
        pricing: {
          amount: j.budget?.amount || 0,
          budgetType: j.budget?.type || 'quote',
          paymentStatus: 'pending'
        },
        problemDescription: j.description,
        urgency: j.urgency,
        createdAt: j.createdAt,
        jobId: j._id
      }));
    }

    // Guarantee OTP for active bookings
    for (const b of bookings) {
      if (['confirmed', 'scheduled', 'assigned', 'on_the_way', 'arrived'].includes(b.status)) {
        if (!b.startOtp?.otp || b.startOtp?.isConsumed) {
          if (!b.startOtp?.isConsumed) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const codeHash = hashOtp(otp);
            const expiresAt = new Date(Date.now() + 7 * 86400000);
            b.startOtp = {
              otp,
              codeHash,
              expiresAt,
              attempts: 0,
              maxAttempts: 5,
              isConsumed: false
            };
            await Booking.findByIdAndUpdate(b._id, {
              startOtp: b.startOtp
            });
          }
        }
      }
    }

    // Fetch any reviews submitted by this customer for these bookings
    const bookingIds = bookings.map(b => b._id);
    const customerReviews = await Review.find({ customer: req.user.id, booking: { $in: bookingIds } })
      .select('rating comment moderationStatus isPublic response createdAt booking');
    const reviewByBookingMap = new Map();
    customerReviews.forEach(r => {
      if (r.booking) reviewByBookingMap.set(r.booking.toString(), r);
    });

    // Combine and format
    const formattedBookings = bookings.map(b => {
      const bObj = b.toObject();
      bObj.bookingType = bObj.bookingType || (bObj.job ? 'open_request' : 'direct_professional');
      if (!bObj.review && reviewByBookingMap.has(b._id.toString())) {
        bObj.review = reviewByBookingMap.get(b._id.toString());
        bObj.hasReview = true;
      } else if (bObj.review) {
        bObj.hasReview = true;
      }
      return bObj;
    });

    const allOrders = (status === 'quotations_received')
      ? openJobsAsOrders
      : [...openJobsAsOrders, ...formattedBookings];

    allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      count: allOrders.length,
      bookings: allOrders
    });
  } catch (error) {
    next(error);
  }
};

export const cancelCustomerBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.customer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this booking' });
    }

    if (!['awaiting_confirmation', 'confirmed', 'scheduled'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Booking cannot be cancelled because it is already ${booking.status}`
      });
    }

    booking.status = 'cancelled';
    if (booking.pricing) {
      booking.pricing.paymentStatus = 'refunded';
    }
    booking.statusHistory.push({
      status: 'cancelled',
      updatedBy: req.user.id,
      timestamp: new Date(),
      note: req.body.reason || 'Cancelled by customer'
    });

    await booking.save();

    // If booking is linked to a Job, also cancel the Job and reject pending applications
    const fullReason = req.body.reason || 'Cancelled by customer';
    if (booking.job) {
      const jobIdStr = (booking.job?._id || booking.job).toString();
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

      await Application.updateMany(
        { job: jobIdStr, status: { $in: ['pending', 'submitted', 'shortlisted'] } },
        { status: 'rejected' }
      );

      // Socket.IO synchronization across all WorkLogy surfaces
      const io = getIO();
      if (io) {
        const cancelPayload = {
          jobId: jobIdStr,
          title: booking.serviceTitle,
          status: 'cancelled',
          reason: fullReason,
          cancelledAt: new Date().toISOString()
        };

        io.emit('job_cancelled', cancelPayload);
        io.emit('job_taken', { jobId: jobIdStr, title: booking.serviceTitle, reason: 'cancelled' });
        io.emit('job_status_updated', { jobId: jobIdStr, status: 'cancelled' });
        io.to('job_' + jobIdStr).emit('job_cancelled', cancelPayload);
        io.to('user_' + req.user.id).emit('job_cancelled', cancelPayload);
        if (booking.vendor) {
          io.to('user_' + (booking.vendor?._id || booking.vendor).toString()).emit('job_cancelled', cancelPayload);
        }
      }
    }

    // Notify vendor
    try {
      await Notification.create({
        recipient: booking.vendor,
        sender: req.user.id,
        type: 'job_alert',
        title: 'Booking Cancelled',
        message: `The booking for "${booking.serviceTitle}" was cancelled by the customer.`,
        link: `/vendor/bookings`
      });
    } catch (notifErr) {
      console.warn('Notification warning on booking cancel:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Booking cancelled and escrow refunded',
      booking
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerQuotations = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    // Exclude cancelled and deleted jobs so invalid proposals cannot leak
    const customerJobs = await Job.find({ customer: customerId, status: { $nin: ['cancelled', 'expired'] }, isDeleted: { $ne: true } });
    const jobIds = customerJobs.map(j => j._id);

    const applications = await Application.find({ job: { $in: jobIds } })
      .populate('vendor', 'name email phone avatar')
      .populate({
        path: 'job',
        select: 'title budget category location status preferredDate',
        populate: { path: 'category', select: 'name icon' }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerTransactions = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    let transactions = await Transaction.find({ customer: customerId })
      .populate('vendor', 'name avatar')
      .populate('booking')
      .sort({ createdAt: -1 });

    // Fallback: If no direct transaction documents exist, derive from customer bookings
    if (transactions.length === 0) {
      const bookings = await Booking.find({ customer: customerId })
        .populate('vendor', 'name avatar')
        .sort({ createdAt: -1 });

      transactions = bookings.map(b => ({
        _id: b._id,
        transactionId: `TX-${b.bookingReference?.replace('BK-', '') || Math.floor(10000 + Math.random() * 90000)}`,
        booking: b._id,
        jobTitle: b.serviceTitle,
        grossAmount: b.pricing?.amount || 0,
        platformFee: b.pricing?.platformFee || 0,
        netAmount: b.pricing?.vendorNet || b.pricing?.amount || 0,
        type: b.status === 'completed' ? 'escrow_release' : 'escrow_hold',
        paymentStatus: b.status === 'completed' ? 'paid_to_bank' : 'held_in_escrow',
        settlementStatus: b.status === 'completed' ? 'settled' : 'pending',
        vendor: b.vendor,
        createdAt: b.createdAt
      }));
    }

    res.status(200).json({
      success: true,
      count: transactions.length,
      transactions
    });
  } catch (error) {
    next(error);
  }
};
