import mongoose from 'mongoose';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import Booking from '../models/Booking.js';
import Transaction from '../models/Transaction.js';
import CustomerProfile from '../models/CustomerProfile.js';
import Notification from '../models/Notification.js';
import Review from '../models/Review.js';
import { hashOtp, decryptCustomerOtp } from '../utils/otp.js';
import { getIO } from '../config/socket.js';
import { cancelJob } from './job.controller.js';
import { notifyCancellation } from '../services/notification.service.js';

export const getCustomerDashboardSummary = async (req, res, next) => {
  try {
    const customerId = req.user.id;

    // Run all independent DB queries in parallel to eliminate serial Atlas roundtrips.
    // Steps 1, 2, 4, and 5 are fully independent — they can be fetched concurrently.
    // Step 3 (applications) depends on the job IDs from step 1, so it is deferred.
    const [customerJobs, customerBookings, transactions, profileResult] = await Promise.all([
      // 1. Fetch customer's jobs
      Job.find({ customer: customerId, isDeleted: { $ne: true } })
        .populate('category', 'name slug icon')
        .populate('selectedVendor', 'name avatar email phone businessName rating')
        .populate('booking')
        .sort({ createdAt: -1 })
        .limit(100),

      // 2. Fetch customer's bookings
      Booking.find({ customer: customerId })
        .select('+startOtp.otp +startOtp.customerEncryptedOtp')
        .populate('vendor', 'name email phone avatar businessName rating')
        .populate({
          path: 'job',
          select: 'title budget urgency location category preferredDate preferredTime status',
          populate: { path: 'category', select: 'name icon' }
        })
        .populate('service', 'title pricing domain')
        .sort({ scheduledDate: 1, createdAt: -1 }),

      // 4. Fetch customer transactions
      Transaction.find({ customer: customerId })
        .populate('vendor', 'name avatar businessName')
        .populate('booking')
        .sort({ createdAt: -1 })
        .limit(20),

      // 5. Customer Profile
      CustomerProfile.findOne({ user: customerId }).populate('savedVendors')
    ]);

    // Ensure profile exists (create lazily if first time)
    let profile = profileResult;
    if (!profile) {
      profile = await CustomerProfile.create({ user: customerId });
    }

    // 3. Fetch applications for open jobs (depends on customerJobs result)
    const openJobIds = customerJobs
      .filter(j => j.status === 'open')
      .map(j => j._id);

    const pendingApplications = openJobIds.length > 0
      ? await Application.find({
          job: { $in: openJobIds },
          status: 'submitted'
        })
          .populate('vendor', 'name email phone avatar businessName rating')
          .populate({
            path: 'job',
            select: 'title budget category location preferredDate preferredTime status',
            populate: { path: 'category', select: 'name icon' }
          })
          .sort({ createdAt: -1 })
      : [];

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
    // An order is active if status is in: assigned, confirmed, scheduled, on_the_way, arrived, in_progress, completion_pending
    const activeBookingList = customerBookings.filter(b =>
      ['awaiting_confirmation', 'assigned', 'confirmed', 'scheduled', 'on_the_way', 'arrived', 'in_progress', 'completion_pending'].includes(b.status)
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
        // Stage 2: Vendor Assigned (awaiting_confirmation, assigned, confirmed, scheduled, on_the_way, arrived)
        // Stage 3: Work in Progress (in_progress, completion_pending)
        // Stage 4: Completed (completed)
        let stage = 2;
        if (['in_progress', 'completion_pending'].includes(b.status)) {
          stage = 3;
        } else if (b.status === 'completed') {
          stage = 4;
        }

        const isPriced = typeof b.pricing?.amount === 'number' && b.pricing.amount > 0;
        const customerPin = b.startOtp?.otp || (b.startOtp?.customerEncryptedOtp ? decryptCustomerOtp(b.startOtp.customerEncryptedOtp) : null);
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
          startOtp: customerPin,
          arrivalOtp: customerPin,
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

    const ACTIVE_BOOKING_STATUSES = [
      'open',
      'quotations_received',
      'pending_acceptance',
      'awaiting_confirmation',
      'assigned',
      'confirmed',
      'scheduled',
      'on_the_way',
      'arrived',
      'in_progress',
      'completion_pending',
      'payment_pending',
      'pending'
    ];

    if (status && status !== 'all') {
      if (status === 'active') {
        query.status = { $in: ACTIVE_BOOKING_STATUSES };
      } else if (status === 'awaiting_response') {
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
        query.status = { $in: ['cancelled', 'declined', 'disputed'] };
      } else if (status !== 'quotations_received') {
        query.status = status;
      }
    }

    const bookings = await Booking.find(query)
      .select('+startOtp.otp +startOtp.customerEncryptedOtp')
      .populate('vendor', 'name email phone avatar businessName rating')
      .populate({
        path: 'job',
        select: 'title budget urgency location category preferredDate preferredTime applicantsCount status',
        populate: { path: 'category', select: 'name icon' }
      })
      .populate('service', 'title pricing domain')
      .populate('review', 'rating comment moderationStatus isPublic response createdAt')
      .sort({ scheduledDate: 1, createdAt: -1 });

    // Also fetch customer open requests to display in unified view if status matches 'all', 'active', 'awaiting_response', 'quotations_received', or 'cancelled'
    let openJobsAsOrders = [];
    if (!status || status === 'all' || status === 'active' || status === 'awaiting_response' || status === 'quotations_received' || status === 'cancelled') {
      let jobQuery = { customer: req.user.id, isDeleted: { $ne: true } };
      if (status === 'cancelled') {
        jobQuery.status = 'cancelled';
        jobQuery.$or = [{ booking: { $exists: false } }, { booking: null }];
      } else if (status === 'quotations_received') {
        jobQuery.status = 'open';
        jobQuery.applicantsCount = { $gt: 0 };
        jobQuery.$or = [{ booking: { $exists: false } }, { booking: null }];
      } else if (status === 'awaiting_response') {
        jobQuery.status = 'open';
        jobQuery.$or = [{ booking: { $exists: false } }, { booking: null }];
      } else if (status === 'active') {
        jobQuery.status = { $in: ['open', 'quotations_received', 'dispatching'] };
        jobQuery.$or = [{ booking: { $exists: false } }, { booking: null }];
      } else if (status === 'all') {
        jobQuery.status = { $in: ['open', 'quotations_received', 'dispatching', 'cancelled'] };
        jobQuery.$or = [{ booking: { $exists: false } }, { booking: null }];
      } else {
        jobQuery.status = { $in: ['open', 'quotations_received', 'dispatching'] };
        jobQuery.$or = [{ booking: { $exists: false } }, { booking: null }];
      }
      const openJobs = await Job.find(jobQuery)
        .populate('category', 'name icon')
        .sort({ createdAt: -1 });

      const openJobIds = openJobs.map(j => j._id);
      const applications = await Application.find({
        job: { $in: openJobIds },
        status: { $ne: 'withdrawn' }
      })
        .select('job proposedAmount status createdAt vendor')
        .lean();

      const appsByJob = new Map();
      applications.forEach(a => {
        const jId = a.job.toString();
        if (!appsByJob.has(jId)) appsByJob.set(jId, []);
        appsByJob.get(jId).push(a);
      });

      openJobsAsOrders = openJobs.map(j => {
        const jApps = appsByJob.get(j._id.toString()) || [];
        const quotesCount = Math.max(j.applicantsCount || 0, jApps.length);
        const hasQuotes = quotesCount > 0;
        const quotedAmount = jApps.length > 0 ? jApps[0].proposedAmount : 0;
        const minQuotedAmount = jApps.length > 0 ? Math.min(...jApps.map(a => a.proposedAmount)) : 0;

        let displayStatus = 'Awaiting Bids';
        if (hasQuotes) {
          displayStatus = 'Quotations Received';
        } else if (j.status === 'cancelled') {
          displayStatus = 'Cancelled Request';
        } else if (j.status === 'dispatching') {
          displayStatus = 'Dispatching Specialist';
        }

        return {
          _id: j._id,
          isJobRequest: true,
          bookingReference: `REQ-${j._id.toString().slice(-6).toUpperCase()}`,
          bookingType: 'open_request',
          serviceTitle: j.title,
          category: j.category?.name || 'Home Services',
          serviceType: j.serviceType || 'repair',
          status: hasQuotes ? 'quotations_received' : j.status,
          displayStatus,
          applicantsCount: quotesCount,
          quotationsCount: quotesCount,
          quotedAmount,
          minQuotedAmount,
          scheduledDate: j.preferredDate ? new Date(j.preferredDate) : j.createdAt,
          timeSlot: j.preferredTime || 'Flexible',
          address: j.location,
          pricing: {
            amount: j.budget?.amount || 0,
            budgetType: j.budget?.type || 'quote',
            quotedAmount,
            minQuotedAmount,
            paymentStatus: 'pending'
          },
          totalAmount: quotedAmount,
          problemDescription: j.description,
          urgency: j.urgency,
          createdAt: j.createdAt,
          jobId: j._id
        };
      });
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
      bObj.isJobRequest = false;
      bObj.jobId = bObj.job?._id ? bObj.job._id.toString() : (bObj.job ? bObj.job.toString() : null);

      const isOtpVerified = Boolean(
        bObj.startOtp?.isConsumed ||
        bObj.arrivalEvidence?.verified ||
        ['in_progress', 'completion_pending', 'completed'].includes(bObj.status)
      );
      bObj.isOtpVerified = isOtpVerified;

      if (!isOtpVerified && ['arrived', 'on_the_way', 'confirmed', 'scheduled', 'assigned'].includes(bObj.status)) {
        const customerPin = bObj.startOtp?.otp || (bObj.startOtp?.customerEncryptedOtp ? decryptCustomerOtp(bObj.startOtp.customerEncryptedOtp) : null);
        if (customerPin) {
          bObj.arrivalOtp = customerPin;
          if (bObj.startOtp) bObj.startOtp.otp = customerPin;
        }
      }

      if (bObj.startOtp) {
        delete bObj.startOtp.codeHash;
        delete bObj.startOtp.customerEncryptedOtp;
      }

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
    const currentUserId = (req.user._id || req.user.id).toString();
    const isAdmin = req.user.role === 'admin';
    const rawId = (req.params.id || req.body.bookingId || req.body.jobId || '').trim();

    if (!rawId) {
      return res.status(400).json({ success: false, message: 'Booking identifier is required for cancellation.' });
    }

    const isHex24 = mongoose.Types.ObjectId.isValid(rawId) && /^[0-9a-fA-F]{24}$/.test(rawId);
    let booking = null;

    // 1. Try finding by MongoDB _id
    if (isHex24) {
      booking = await Booking.findById(rawId)
        .populate('customer', 'name email phone avatar')
        .populate('vendor', 'name email phone businessName')
        .populate('job');

      // If not found by booking _id, check if rawId is the associated job's _id
      if (!booking) {
        booking = await Booking.findOne({ job: rawId })
          .populate('customer', 'name email phone avatar')
          .populate('vendor', 'name email phone businessName')
          .populate('job');
      }
    }

    // 2. Try finding by bookingReference (e.g. "BK-86251993")
    if (!booking) {
      booking = await Booking.findOne({ bookingReference: rawId.toUpperCase() })
        .populate('customer', 'name email phone avatar')
        .populate('vendor', 'name email phone businessName')
        .populate('job');
    }

    // 3. If still no booking found, check if this is an unbooked open Job request
    if (!booking) {
      let job = null;
      if (isHex24) {
        job = await Job.findById(rawId);
      }
      if (!job && rawId.toUpperCase().startsWith('REQ-')) {
        const suffix = rawId.slice(4);
        job = await Job.findOne({
          customer: currentUserId,
          _id: { $regex: new RegExp(suffix + '$', 'i') }
        });
      }
      if (job) {
        req.params.id = job._id.toString();
        return cancelJob(req, res, next);
      }

      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Verify customer ownership
    const bookingCustId = (booking.customer?._id || booking.customer)?.toString();
    if (bookingCustId !== currentUserId && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this booking' });
    }

    // Idempotent handling: If already cancelled, return success without error
    if (booking.status === 'cancelled') {
      return res.status(200).json({
        success: true,
        message: 'Booking is already cancelled',
        booking
      });
    }

    // Prevent cancellation of completed services
    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Completed bookings cannot be cancelled'
      });
    }

    // Check allowed cancellation states
    if (!['pending', 'pending_acceptance', 'awaiting_confirmation', 'assigned', 'confirmed', 'scheduled', 'open'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Booking cannot be cancelled because it is already ${booking.status}`
      });
    }

    const cancelReason = req.body.reason || req.body.cancellationReason || 'Cancelled by customer';
    const comments = req.body.comments ? ` - ${req.body.comments}` : '';
    const fullReason = `${cancelReason}${comments}`;

    booking.status = 'cancelled';
    booking.declineReason = fullReason;
    if (booking.pricing) {
      booking.pricing.paymentStatus = 'refunded';
    }
    booking.statusHistory = booking.statusHistory || [];
    booking.statusHistory.push({
      status: 'cancelled',
      updatedBy: currentUserId,
      timestamp: new Date(),
      note: fullReason
    });

    await booking.save();

    // Refund and settle any associated transactions
    await Transaction.updateMany(
      { booking: booking._id },
      { $set: { paymentStatus: 'refunded', settlementStatus: 'settled' } }
    );

    // If booking is linked to a Job, also cancel the Job and reject pending applications
    let jobIdStr = null;
    if (booking.job) {
      jobIdStr = (booking.job?._id || booking.job).toString();
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
            actor: currentUserId,
            timestamp: new Date()
          }
        }
      });

      await Application.updateMany(
        { job: jobIdStr, status: { $in: ['pending', 'submitted', 'shortlisted'] } },
        { status: 'rejected' }
      );
    }

    // Socket.IO synchronization across all WorkLogy surfaces
    const io = getIO();
    if (io) {
      const cancelPayload = {
        bookingId: booking._id.toString(),
        bookingReference: booking.bookingReference,
        jobId: jobIdStr,
        title: booking.serviceTitle,
        status: 'cancelled',
        reason: fullReason,
        cancelledAt: new Date().toISOString()
      };

      // 1. Emit booking events
      io.emit('booking_cancelled', cancelPayload);
      io.emit('booking_status_updated', { bookingId: booking._id.toString(), status: 'cancelled' });
      io.emit('booking_updated', { bookingId: booking._id.toString(), status: 'cancelled' });
      io.to('booking_' + booking._id.toString()).emit('booking_cancelled', cancelPayload);
      io.to('user_' + currentUserId).emit('booking_cancelled', cancelPayload);

      if (booking.vendor) {
        const vendorId = (booking.vendor?._id || booking.vendor).toString();
        io.to('user_' + vendorId).emit('booking_cancelled', cancelPayload);
        io.to('user_' + vendorId).emit('booking_status_updated', { bookingId: booking._id.toString(), status: 'cancelled' });
      }

      // 2. Emit job events if linked
      if (jobIdStr) {
        io.emit('job_cancelled', cancelPayload);
        io.emit('job_taken', { jobId: jobIdStr, title: booking.serviceTitle, reason: 'cancelled' });
        io.emit('job_status_updated', { jobId: jobIdStr, status: 'cancelled' });
        io.to('job_' + jobIdStr).emit('job_cancelled', cancelPayload);
        io.to('user_' + currentUserId).emit('job_cancelled', cancelPayload);
        if (booking.vendor) {
          const vendorId = (booking.vendor?._id || booking.vendor).toString();
          io.to('user_' + vendorId).emit('job_cancelled', cancelPayload);
        }
      }
    }

    // Persistent In-App & Email notification
    try {
      await notifyCancellation({
        customerId: booking.customer?._id || booking.customer,
        vendorId: booking.vendor?._id || booking.vendor,
        cancelledByUserId: currentUserId,
        jobTitle: booking.serviceTitle,
        resourceId: booking._id,
        resourceType: 'booking',
        reason: fullReason
      });
    } catch (notifErr) {
      console.warn('Notification error on booking cancel:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully and escrow refunded',
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

export const getCustomerStats = async (req, res, next) => {
  try {
    const customerId = req.user.id;

    const ACTIVE_BOOKING_STATUSES = [
      'open',
      'quotations_received',
      'pending_acceptance',
      'awaiting_confirmation',
      'assigned',
      'confirmed',
      'scheduled',
      'on_the_way',
      'arrived',
      'in_progress',
      'completion_pending',
      'payment_pending',
      'pending'
    ];

    const [
      activeBookings,
      openStandaloneJobs,
      totalJobsCount,
      totalBookingsCount,
      directTxCount,
      profile
    ] = await Promise.all([
      // 1. Active bookings
      Booking.find({
        customer: customerId,
        status: { $in: ACTIVE_BOOKING_STATUSES }
      }).select('_id status job'),

      // 2. Open standalone jobs that have no booking attached
      Job.find({
        customer: customerId,
        isDeleted: { $ne: true },
        status: { $in: ['open', 'quotations_received', 'dispatching'] },
        $or: [{ booking: { $exists: false } }, { booking: null }]
      }).select('_id status'),

      // 3. Total jobs ever posted
      Job.countDocuments({
        customer: customerId,
        isDeleted: { $ne: true }
      }),

      // 4. Total bookings
      Booking.countDocuments({
        customer: customerId
      }),

      // 5. Direct transactions count
      Transaction.countDocuments({
        customer: customerId
      }),

      // 6. Customer Profile for saved vendors & addresses
      CustomerProfile.findOne({ user: customerId }).select('savedVendors addresses')
    ]);

    // Deduplicate any job that might be referenced in active bookings
    const activeBookingJobIds = new Set(
      activeBookings.map(b => b.job?.toString()).filter(Boolean)
    );
    const deduplicatedOpenJobs = openStandaloneJobs.filter(
      j => !activeBookingJobIds.has(j._id.toString())
    );

    const activeBookingsCount = activeBookings.length;
    const openRequestsCount = deduplicatedOpenJobs.length;
    const activeJobsCount = activeBookingsCount + openRequestsCount;

    // Use actual transactions or fallback to bookings count if transactions collection is empty
    const transactionCount = directTxCount > 0 ? directTxCount : totalBookingsCount;
    const savedVendorsCount = profile?.savedVendors?.length || 0;
    const savedAddressesCount = profile?.addresses?.length || 0;

    res.status(200).json({
      success: true,
      activeJobsCount,
      activeBookingsCount,
      openRequestsCount,
      totalJobsCount,
      totalBookingsCount,
      transactionCount,
      savedVendorsCount,
      savedAddressesCount
    });
  } catch (error) {
    next(error);
  }
};

