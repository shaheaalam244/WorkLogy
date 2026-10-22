import mongoose from 'mongoose';
import Dispute from '../models/Dispute.js';
import Booking from '../models/Booking.js';
import Job from '../models/Job.js';
import ActivityLog from '../models/ActivityLog.js';
import { notificationService } from '../services/notification.service.js';

/**
 * Raise a booking-related dispute
 * Only authorized booking participants (customer or assigned vendor) can raise disputes.
 */
export const createDispute = async (req, res, next) => {
  try {
    const { bookingId, jobId, disputeCategory, reason, description, evidence } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Dispute reason is required.' });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Detailed description is required to investigate the dispute.' });
    }

    let targetBooking = null;
    let targetJob = null;
    let againstUserId = null;

    if (bookingId) {
      if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
      }

      targetBooking = await Booking.findById(bookingId).populate('customer vendor job');
      if (!targetBooking) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }

      // Authorization: Caller must be the customer or the assigned vendor
      const isCustomer = targetBooking.customer?._id?.toString() === req.user.id || targetBooking.customer?.toString() === req.user.id;
      const isVendor = targetBooking.vendor?._id?.toString() === req.user.id || targetBooking.vendor?.toString() === req.user.id;

      if (!isCustomer && !isVendor && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to raise a dispute for a booking you are not part of.'
        });
      }

      // Derive counter-party authoritatively
      againstUserId = isCustomer
        ? (targetBooking.vendor?._id || targetBooking.vendor)
        : (targetBooking.customer?._id || targetBooking.customer);

      targetJob = targetBooking.job?._id || targetBooking.job;
    } else if (jobId) {
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return res.status(400).json({ success: false, message: 'Invalid job ID.' });
      }

      targetJob = await Job.findById(jobId).populate('customer selectedVendor');
      if (!targetJob) {
        return res.status(404).json({ success: false, message: 'Job not found.' });
      }

      const isCustomer = targetJob.customer?._id?.toString() === req.user.id;
      const isVendor = targetJob.selectedVendor?._id?.toString() === req.user.id;

      if (!isCustomer && !isVendor && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized to raise a dispute for this job.' });
      }

      againstUserId = isCustomer ? targetJob.selectedVendor?._id : targetJob.customer?._id;
    } else {
      return res.status(400).json({
        success: false,
        message: 'A valid booking reference or job reference is required to raise a dispute.'
      });
    }

    if (!againstUserId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot raise dispute: No assigned contractor or counter-party exists on this record.'
      });
    }

    // Check for existing active dispute
    const existingActiveDispute = await Dispute.findOne({
      $or: [
        ...(targetBooking ? [{ booking: targetBooking._id }] : []),
        ...(targetJob ? [{ job: targetJob._id || targetJob }] : [])
      ],
      raisedBy: req.user.id,
      status: { $in: ['open', 'under_review', 'investigating', 'awaiting_information'] }
    });

    if (existingActiveDispute) {
      return res.status(409).json({
        success: false,
        code: 'DISPUTE_ALREADY_OPEN',
        message: 'An active dispute is already open for this service. Our operations team is reviewing it.'
      });
    }

    const dispute = await Dispute.create({
      booking: targetBooking?._id || null,
      job: targetJob?._id || targetJob || null,
      raisedBy: req.user.id,
      against: againstUserId,
      disputeCategory: disputeCategory || 'other',
      reason: reason.trim(),
      description: description.trim().slice(0, 3000),
      evidence: Array.isArray(evidence) ? evidence : [],
      status: 'open'
    });

    // Mark booking status as disputed if active
    if (targetBooking && !['completed', 'cancelled'].includes(targetBooking.status)) {
      targetBooking.status = 'disputed';
      await targetBooking.save();
    }

    // Notify counter-party of dispute filing
    try {
      await notificationService.createNotification({
        recipient: againstUserId.toString(),
        sender: req.user.id,
        type: 'system_alert',
        title: 'Dispute Filed on Service',
        message: `A dispute has been initiated regarding "${targetBooking?.serviceTitle || 'your booking'}". Operations has been notified for investigation.`,
        link: req.user.role === 'customer' ? '/vendor/support' : '/customer/support',
        relatedResource: { resourceType: 'Dispute', resourceId: dispute._id }
      });
    } catch (notifErr) {
      console.warn('Could not dispatch dispute notification:', notifErr.message);
    }

    const populatedDispute = await Dispute.findById(dispute._id)
      .populate('booking', 'serviceTitle bookingReference status')
      .populate('job', 'title status')
      .populate('raisedBy against', 'name email avatar role');

    res.status(201).json({
      success: true,
      message: 'Dispute filed successfully. WorkLogy Trust & Safety team has received your ticket.',
      dispute: populatedDispute
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch disputes with authorization isolation
 */
export const getDisputes = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role !== 'admin') {
      // Regular customer or vendor sees only their own disputes
      query.$or = [{ raisedBy: req.user.id }, { against: req.user.id }];
    } else {
      // Admin filter
      const { status, disputeCategory } = req.query;
      if (status && status !== 'all') {
        query.status = status;
      }
      if (disputeCategory && disputeCategory !== 'all') {
        query.disputeCategory = disputeCategory;
      }
    }

    const disputes = await Dispute.find(query)
      .populate('booking', 'serviceTitle bookingReference status scheduledDate pricing')
      .populate('job', 'title status location budget')
      .populate('raisedBy against', 'name email phone avatar role')
      .populate('resolution.resolvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: disputes.length, disputes });
  } catch (error) {
    next(error);
  }
};

/**
 * Get dispute details by ID with strict ownership validation
 */
export const getDisputeById = async (req, res, next) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate('booking')
      .populate('job')
      .populate('raisedBy against', 'name email avatar phone role')
      .populate('resolution.resolvedBy', 'name email');

    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Dispute not found' });
    }

    const isParty = dispute.raisedBy?._id?.toString() === req.user.id || dispute.against?._id?.toString() === req.user.id;
    if (!isParty && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view this dispute dossier.' });
    }

    res.status(200).json({ success: true, dispute });
  } catch (error) {
    next(error);
  }
};

/**
 * Update dispute status / resolve dispute (Admin only or status progression)
 */
export const updateDisputeStatus = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only authorized administrators can resolve disputes.' });
    }

    const { status, outcome, notes, bookingAction } = req.body;
    const dispute = await Dispute.findById(req.params.id).populate('raisedBy against booking job');
    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Dispute not found' });
    }

    const previousStatus = dispute.status;
    dispute.status = status || dispute.status;

    if (outcome || notes) {
      dispute.resolution = {
        outcome: outcome ? outcome.trim() : dispute.resolution?.outcome,
        notes: notes ? notes.trim() : dispute.resolution?.notes,
        resolvedBy: req.user._id || req.user.id,
        resolvedAt: new Date(),
        bookingAction: bookingAction || 'none'
      };
    }

    // Apply authorized booking actions if specified
    if (dispute.booking && bookingAction) {
      const booking = await Booking.findById(dispute.booking._id || dispute.booking);
      if (booking) {
        if (bookingAction === 'refund_processed') {
          booking.pricing = booking.pricing || {};
          booking.pricing.paymentStatus = 'refunded';
          booking.status = 'cancelled';
          await booking.save();
        } else if (bookingAction === 'escrow_released') {
          booking.pricing = booking.pricing || {};
          booking.pricing.paymentStatus = 'released';
          booking.status = 'completed';
          await booking.save();
        } else if (bookingAction === 'booking_cancelled') {
          booking.status = 'cancelled';
          await booking.save();
        }
      }
    }

    await dispute.save();

    // Log administrative action
    await ActivityLog.create({
      user: req.user._id || req.user.id,
      role: req.user.adminRole || req.user.role || 'admin',
      action: 'DISPUTE_RESOLVED',
      targetType: 'Dispute',
      targetId: dispute._id.toString(),
      details: {
        previousStatus,
        newStatus: dispute.status,
        outcome: dispute.resolution?.outcome,
        notes: dispute.resolution?.notes,
        bookingAction: dispute.resolution?.bookingAction
      },
      ipAddress: req.ip || '127.0.0.1'
    });

    // Notify parties
    try {
      const parties = [dispute.raisedBy, dispute.against].filter(Boolean);
      for (const party of parties) {
        await notificationService.createNotification({
          recipient: party._id.toString(),
          sender: req.user.id,
          type: 'system_alert',
          title: `Dispute Case Update (${dispute.status})`,
          message: `Dispute regarding "${dispute.booking?.serviceTitle || 'service'}" has been updated: ${dispute.resolution?.notes || 'Decision recorded'}`,
          link: party.role === 'customer' ? '/customer/bookings' : '/vendor/support',
          relatedResource: { resourceType: 'Dispute', resourceId: dispute._id }
        });
      }
    } catch (notifErr) {
      console.warn('Dispute notification warning:', notifErr.message);
    }

    const updatedDispute = await Dispute.findById(dispute._id)
      .populate('booking')
      .populate('job')
      .populate('raisedBy against', 'name email avatar role')
      .populate('resolution.resolvedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Dispute resolution recorded successfully.',
      dispute: updatedDispute
    });
  } catch (error) {
    next(error);
  }
};
