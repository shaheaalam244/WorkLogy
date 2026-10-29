import Application from '../models/Application.js';
import Job from '../models/Job.js';
import Booking from '../models/Booking.js';
import Notification from '../models/Notification.js';
import Transaction from '../models/Transaction.js';
import VendorProfile from '../models/VendorProfile.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { generateSecureOtp } from '../utils/otp.js';
import { getIO } from '../config/socket.js';
import { notifyNewQuotation, notifyBookingConfirmed } from '../services/notification.service.js';

/**
 * Synchronize a quotation into a dedicated chat conversation between customer and vendor
 */
export async function syncQuotationToChat({ application, job, vendorId, customerId }) {
  try {
    const custId = (customerId?._id || customerId).toString();
    const vendId = (vendorId?._id || vendorId).toString();
    const jId = (job?._id || job).toString();
    const jTitle = job?.title || 'Service Request';

    // 1. Find or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [custId, vendId] },
      relatedJob: jId
    });

    if (!conversation) {
      conversation = await Conversation.findOne({
        participants: { $all: [custId, vendId] }
      });
      if (conversation) {
        if (!conversation.relatedJob) {
          conversation.relatedJob = jId;
          await conversation.save();
        }
      } else {
        conversation = await Conversation.create({
          participants: [custId, vendId],
          relatedJob: jId
        });
      }
    }

    // 2. Prepare quotation message payload
    const quotationData = {
      quotationId: application._id,
      applicationId: application._id,
      jobId: jId,
      jobTitle: jTitle,
      proposedAmount: application.proposedAmount,
      pricingBasis: application.pricingBasis || 'fixed',
      proposedSchedule: application.proposedSchedule || 'Flexible',
      estimatedDuration: application.estimatedDuration || '1-2 hours',
      coverLetter: application.coverLetter || '',
      status: application.status || 'submitted'
    };

    const quoteText = `📋 Service Quotation: ₹${application.proposedAmount} for "${jTitle}". Proposed schedule: ${quotationData.proposedSchedule}.`;

    // 3. Check for existing quotation message to prevent duplicates on resubmissions
    let message = await Message.findOne({
      conversation: conversation._id,
      $or: [
        { 'quotationData.quotationId': application._id },
        { 'quotationData.applicationId': application._id }
      ]
    });

    if (message) {
      message.quotationData = quotationData;
      message.text = quoteText;
      await message.save();
    } else {
      message = await Message.create({
        conversation: conversation._id,
        sender: vendId,
        recipient: custId,
        text: quoteText,
        messageType: 'quotation',
        quotationData,
        isRead: false
      });

      await Conversation.findByIdAndUpdate(conversation._id, {
        lastMessage: message._id,
        lastMessageAt: message.createdAt
      });
    }

    // 4. Socket.IO Broadcast to conversation and recipient personal rooms
    const io = getIO();
    if (io) {
      const populated = await Message.findById(message._id)
        .populate('sender', 'name avatar role')
        .lean();

      io.to(`conversation_${conversation._id}`).emit('receive_message', populated);
      io.to(`user_${custId}`).emit('new_message_notification', {
        conversationId: conversation._id,
        message: populated,
        senderName: populated?.sender?.name || 'Service Professional'
      });
      io.to(`user_${custId}`).emit('job_quotation_received', {
        jobId: jId,
        quotationId: application._id.toString(),
        amount: application.proposedAmount,
        conversationId: conversation._id.toString()
      });
    }

    return { conversation, message };
  } catch (err) {
    console.warn('Non-fatal: syncQuotationToChat warning:', err.message);
    return null;
  }
}



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

        // Synchronize quotation message into dedicated customer-vendor chat
        await syncQuotationToChat({
          application: existing,
          job,
          vendorId: req.user.id,
          customerId: job.customer
        });

        // Notify the customer via unified notification service
        await notifyNewQuotation({
          customerId: job.customer,
          vendorId: req.user.id,
          job,
          proposedAmount: amountNum,
          quotationId: existing._id
        });

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

    // Synchronize quotation message into dedicated customer-vendor chat
    await syncQuotationToChat({
      application,
      job,
      vendorId: req.user.id,
      customerId: job.customer
    });

    // Notify the customer via unified notification service (in-app + email + push)
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
      .sort({ createdAt: -1 })
      .lean();

    // Attach vendorProfile info (businessName, rating, reviewCount)
    const vendorIds = applications.map(a => a.vendor?._id || a.vendor).filter(Boolean);
    const profiles = await VendorProfile.find({ user: { $in: vendorIds } })
      .select('user businessName rating reviewCount completedJobsCount bio avatar isAvailableNow')
      .lean();

    const profileMap = new Map();
    profiles.forEach(p => profileMap.set(p.user.toString(), p));

    const enrichedApplications = applications.map(a => {
      const vId = (a.vendor?._id || a.vendor || '').toString();
      const prof = profileMap.get(vId);
      return {
        ...a,
        vendorProfile: prof || null,
        vendorName: prof?.businessName || a.vendor?.name || 'Service Professional',
        vendorRating: prof?.rating || 4.9,
        vendorAvatar: a.vendor?.avatar || prof?.avatar || null
      };
    });

    res.status(200).json({ success: true, count: enrichedApplications.length, applications: enrichedApplications });
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

      if (['accepted', 'rejected', 'withdrawn'].includes(application.status)) {
        return res.status(400).json({
          success: false,
          message: `This quotation has already been ${application.status}.`
        });
      }

      if (status === 'accepted') {
        if (application.job.status !== 'open' || application.job.isDeleted || application.job.selectedVendor) {
          return res.status(409).json({ success: false, message: 'This request has already been assigned, cancelled, or is no longer available.' });
        }

        const vendorProfile = await VendorProfile.findOne({ user: application.vendor });
        if (!vendorProfile || vendorProfile.approvalStatus !== 'approved') {
          return res.status(400).json({
            success: false,
            message: 'The selected service professional is not currently verified or approved for assignments.'
          });
        }
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


      // Update quotation message status in conversation
      await Message.updateMany(
        { 'quotationData.quotationId': application._id },
        {
          $set: {
            'quotationData.status': 'accepted',
            text: `✓ Accepted Quotation: ₹${application.proposedAmount} for "${application.job.title}". Booking confirmed!`
          }
        }
      ).catch(() => {});

      // Update rejected messages for this job
      await Message.updateMany(
        {
          'quotationData.jobId': application.job._id,
          'quotationData.quotationId': { $ne: application._id }
        },
        {
          $set: {
            'quotationData.status': 'rejected',
            text: `Quotation not selected for "${application.job.title}".`
          }
        }
      ).catch(() => {});

      const io = getIO();
      if (io) {
        io.emit('job_taken', { jobId: application.job._id.toString(), title: application.job.title });
        io.emit('job_status_updated', { jobId: application.job._id.toString(), status: 'assigned' });
        io.to(`user_${application.job.customer.toString()}`).emit('quotation_status_updated', {
          jobId: application.job._id.toString(),
          quotationId: application._id.toString(),
          status: 'accepted',
          bookingId: newBooking._id.toString()
        });
        io.to(`user_${application.vendor.toString()}`).emit('quotation_status_updated', {
          jobId: application.job._id.toString(),
          quotationId: application._id.toString(),
          status: 'accepted',
          bookingId: newBooking._id.toString()
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Quotation accepted and booking confirmed with escrow protection.',
        application,
        booking: newBooking
      });
    } else if (status === 'rejected') {
      await Message.updateMany(
        { 'quotationData.quotationId': application._id },
        {
          $set: {
            'quotationData.status': 'rejected',
            text: `Quotation declined by client for "${application.job.title}".`
          }
        }
      ).catch(() => {});

      await Notification.create({
        recipient: application.vendor,
        sender: req.user.id,
        type: 'proposal_rejected',
        title: 'Quotation Status Update',
        message: `Your quotation on "${application.job.title}" was not selected by the property owner.`,
        link: `/jobs/${application.job._id}`
      });

      const io = getIO();
      if (io) {
        io.to(`user_${application.vendor.toString()}`).emit('quotation_status_updated', {
          jobId: application.job._id.toString(),
          quotationId: application._id.toString(),
          status: 'rejected'
        });
      }
    }


    res.status(200).json({ success: true, application });
  } catch (error) {
    next(error);
  }
};
