import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from '../models/User.js';
import VendorProfile from '../models/VendorProfile.js';
import Job from '../models/Job.js';
import Booking from '../models/Booking.js';
import Dispute from '../models/Dispute.js';
import Report from '../models/Report.js';
import ActivityLog from '../models/ActivityLog.js';
import Transaction from '../models/Transaction.js';
import ServiceCategory from '../models/ServiceCategory.js';
import CatalogService from '../models/CatalogService.js';
import ServiceArea from '../models/ServiceArea.js';
import Notification from '../models/Notification.js';
import PlatformSettings from '../models/PlatformSettings.js';
import Review from '../models/Review.js';
import { recalculateVendorRating } from '../utils/ratingAggregator.js';
import { matchEligibleVendors } from '../services/vendorMatching.service.js';
import { getIO } from '../config/socket.js';
import { getAdminReports, resolveReport as handleResolveReport } from './report.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Central audit logging helper
const logAdminAction = async (adminUser, action, targetType, targetId, details = {}, ipAddress = '127.0.0.1') => {
  try {
    await ActivityLog.create({
      user: adminUser._id || adminUser.id,
      role: adminUser.adminRole || adminUser.role || 'admin',
      action,
      targetType,
      targetId: String(targetId || ''),
      details,
      ipAddress
    });
  } catch (err) {
    console.warn('Failed to record admin activity log:', err.message);
  }
};

// ==========================================
// 1. ADMIN DASHBOARD OVERVIEW & METRICS
// ==========================================

export const getAdminStats = async (req, res, next) => {
  try {
    const [
      totalCustomers,
      totalProfessionals,
      pendingApplications,
      approvedProfessionals,
      suspendedProfessionals,
      openJobs,
      activeBookings,
      completedJobs,
      pendingPayments,
      openDisputes,
      pendingReports
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      VendorProfile.countDocuments(),
      VendorProfile.countDocuments({ approvalStatus: { $in: ['pending', 'under_review', 'changes_required'] } }),
      VendorProfile.countDocuments({ approvalStatus: 'approved' }),
      VendorProfile.countDocuments({ approvalStatus: 'suspended' }),
      Job.countDocuments({ status: 'open', isDeleted: { $ne: true } }),
      Booking.countDocuments({ status: { $in: ['confirmed', 'scheduled', 'on_the_way', 'arrived', 'in_progress'] } }),
      Job.countDocuments({ status: 'completed', isDeleted: { $ne: true } }),
      Transaction.countDocuments({ paymentStatus: { $in: ['pending', 'held_in_escrow'] } }),
      Dispute.countDocuments({ status: { $in: ['open', 'under_review', 'investigating', 'awaiting_information'] } }),
      Report.countDocuments({ status: { $in: ['new', 'under_review'] } })
    ]);

    // Financial aggregates calculated directly from real database transactions
    const financialAggregates = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalGross: { $sum: '$grossAmount' },
          totalPlatformFees: { $sum: '$platformFee' },
          escrowHeld: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'held_in_escrow'] }, '$grossAmount', 0]
            }
          },
          totalPayouts: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'paid_to_bank'] }, '$netAmount', 0]
            }
          },
          totalRefunds: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'refunded'] }, '$grossAmount', 0]
            }
          }
        }
      }
    ]);

    const financials = financialAggregates[0] || {
      totalGross: 0,
      totalPlatformFees: 0,
      escrowHeld: 0,
      totalPayouts: 0,
      totalRefunds: 0
    };

    // Live dashboard activity lists
    const [
      recentRegistrations,
      applicationsAwaitingReview,
      recentCustomerRequests,
      emergencyRequests,
      recentBookings,
      recentPayments,
      unresolvedDisputes,
      recentReports,
      recentAuditActions
    ] = await Promise.all([
      User.find().sort({ createdAt: -1 }).limit(5).select('name email role status createdAt avatar'),
      VendorProfile.find({ approvalStatus: { $in: ['pending', 'under_review', 'changes_required'] } })
        .populate('user', 'name email phone avatar')
        .populate('categories', 'name')
        .sort({ submittedForReviewAt: -1, createdAt: -1 })
        .limit(5),
      Job.find({ isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .populate('customer', 'name email phone')
        .populate('category', 'name')
        .limit(5),
      Job.find({ urgency: 'emergency', status: { $in: ['open', 'dispatching'] }, isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .populate('customer', 'name email phone')
        .populate('category', 'name')
        .populate('selectedVendor', 'name email phone')
        .limit(5),
      Booking.find()
        .sort({ createdAt: -1 })
        .populate('customer', 'name email')
        .populate('vendor', 'name email')
        .limit(5),
      Transaction.find()
        .sort({ createdAt: -1 })
        .populate('customer', 'name email')
        .populate('vendor', 'name email')
        .limit(5),
      Dispute.find({ status: { $in: ['open', 'under_review', 'investigating', 'awaiting_information'] } })
        .populate('raisedBy', 'name email avatar')
        .populate('job', 'title')
        .populate('booking', 'serviceTitle bookingReference')
        .sort({ createdAt: -1 })
        .limit(5),
      Report.find({ status: { $in: ['new', 'under_review'] } })
        .populate('reportedBy', 'name email avatar')
        .sort({ createdAt: -1 })
        .limit(5),
      ActivityLog.find()
        .populate('user', 'name email role')
        .sort({ createdAt: -1 })
        .limit(6)
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalCustomers,
        totalProfessionals,
        pendingApplications,
        approvedProfessionals,
        suspendedProfessionals,
        openJobs,
        activeBookings,
        completedJobs,
        pendingPayments,
        openDisputes,
        pendingReports,
        platformRevenue: financials.totalPlatformFees,
        escrowHeld: financials.escrowHeld,
        totalGross: financials.totalGross,
        totalPayouts: financials.totalPayouts,
        totalRefunds: financials.totalRefunds
      },
      recent: {
        registrations: recentRegistrations,
        applications: applicationsAwaitingReview,
        customerRequests: recentCustomerRequests,
        emergencyRequests,
        bookings: recentBookings,
        payments: recentPayments,
        disputes: unresolvedDisputes,
        reports: recentReports,
        auditActions: recentAuditActions
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. PROFESSIONAL APPROVALS & MANAGEMENT
// ==========================================

export const getVendors = async (req, res, next) => {
  try {
    const { status, verificationStatus, category, search, page = 1, limit = 20 } = req.query;
    let query = {};

    if (status && status !== 'all') {
      query.approvalStatus = status;
    }

    if (verificationStatus && verificationStatus !== 'all') {
      query['verifiedBadge.status'] = verificationStatus;
    }

    if (category && category !== 'all' && mongoose.Types.ObjectId.isValid(category)) {
      query.categories = category;
    }

    if (search && search.trim()) {
      const term = search.trim();
      const matchedUsers = await User.find({
        $or: [
          { name: new RegExp(term, 'i') },
          { email: new RegExp(term, 'i') },
          { phone: new RegExp(term, 'i') }
        ]
      }).select('_id');

      const userIds = matchedUsers.map(u => u._id);
      query.$or = [
        { businessName: new RegExp(term, 'i') },
        { user: { $in: userIds } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [vendors, total] = await Promise.all([
      VendorProfile.find(query)
        .populate('user', 'name email phone avatar status createdAt')
        .populate('categories', 'name slug')
        .sort({ submittedForReviewAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      VendorProfile.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: vendors.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)) || 1,
      vendors
    });
  } catch (error) {
    next(error);
  }
};

export const getVendorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let vendor = null;

    const populateOpts = [
      { path: 'user', select: 'name email phone avatar status createdAt suspensionReason', strictPopulate: false },
      { path: 'categories', select: 'name slug icon', strictPopulate: false },
      { path: 'approvalHistory.reviewedBy', select: 'name email', strictPopulate: false },
      { path: 'approvalHistory.changedBy', select: 'name email', strictPopulate: false },
      { path: 'verifiedBadge.reviewedBy', select: 'name email', strictPopulate: false },
      { path: 'verifiedBadge.documents.reviewedBy', select: 'name email', strictPopulate: false },
      { path: 'adminNotes.author', select: 'name email', strictPopulate: false }
    ];

    if (mongoose.Types.ObjectId.isValid(id)) {
      vendor = await VendorProfile.findById(id).populate(populateOpts);
      if (!vendor) {
        vendor = await VendorProfile.findOne({ user: id }).populate(populateOpts);
      }
    }

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Professional profile not found' });
    }

    // Attach past bookings, reviews, assigned jobs, and financial transactions
    const vendorUserId = vendor.user?._id;
    const [recentBookings, reviews, recentJobs, transactions] = await Promise.all([
      Booking.find({ vendor: vendorUserId })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('customer', 'name email phone'),
      Review.find({ vendor: vendorUserId })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('customer', 'name avatar'),
      Job.find({ selectedVendor: vendorUserId })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('customer', 'name email phone')
        .populate('category', 'name'),
      Transaction.find({ vendor: vendorUserId })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('customer', 'name email')
    ]);

    res.status(200).json({
      success: true,
      vendor,
      recentBookings,
      reviews,
      recentJobs,
      transactions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/vendors/:id/documents/:docIndex
 * Review an individual vendor KYC document (Approve, Reject, or Request Changes)
 */
export const reviewVendorDocument = async (req, res, next) => {
  try {
    const { id, docIndex } = req.params;
    const { action, reason } = req.body; // 'approved' | 'rejected' | 'changes_required' | 'pending'

    if (!['approved', 'rejected', 'changes_required', 'pending'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document review action. Must be: approved, rejected, changes_required, or pending'
      });
    }

    if (['rejected', 'changes_required'].includes(action) && (!reason || !reason.trim())) {
      return res.status(400).json({
        success: false,
        message: 'A mandatory reason is required when rejecting or requesting changes on a KYC document'
      });
    }

    let vendor = await VendorProfile.findById(id).populate('user');
    if (!vendor && mongoose.Types.ObjectId.isValid(id)) {
      vendor = await VendorProfile.findOne({ user: id }).populate('user');
    }
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const idx = parseInt(docIndex, 10);
    if (isNaN(idx) || !vendor.verifiedBadge?.documents?.[idx]) {
      return res.status(404).json({ success: false, message: 'Document not found at specified index' });
    }

    const doc = vendor.verifiedBadge.documents[idx];
    doc.status = action;
    doc.rejectionReason = reason ? reason.trim() : '';
    doc.reviewedAt = new Date();
    doc.reviewedBy = req.user._id;

    // Synchronize overall verifiedBadge.status
    const allDocs = vendor.verifiedBadge.documents;
    const allApproved = allDocs.length > 0 && allDocs.every(d => d.status === 'approved');
    const hasRejected = allDocs.some(d => d.status === 'rejected');
    const hasChangesReq = allDocs.some(d => d.status === 'changes_required');

    if (hasRejected) {
      vendor.verifiedBadge.status = 'rejected';
      vendor.verifiedBadge.rejectionReason = reason ? reason.trim() : `Document ${doc.name} was rejected.`;
    } else if (hasChangesReq) {
      vendor.verifiedBadge.status = 'changes_required';
      vendor.verifiedBadge.resubmissionInstructions = reason ? reason.trim() : `Changes requested on document ${doc.name}.`;
    } else if (allApproved) {
      vendor.verifiedBadge.status = 'verified';
      vendor.verifiedBadge.verifiedAt = new Date();
      vendor.verifiedBadge.rejectionReason = '';
      vendor.verifiedBadge.resubmissionInstructions = '';
      vendor.approvalStatus = 'approved';
      if (vendor.user) {
        await User.findByIdAndUpdate(vendor.user._id, { status: 'active', isActive: true });
      }
    } else {
      vendor.verifiedBadge.status = 'under_review';
    }

    vendor.verifiedBadge.reviewedBy = req.user._id;
    vendor.verifiedBadge.reviewedAt = new Date();

    await vendor.save();

    // Log admin audit action
    await logAdminAction(
      req.user,
      'VENDOR_DOCUMENT_REVIEWED',
      'VendorProfile',
      vendor._id,
      {
        documentName: doc.name,
        documentIndex: idx,
        docAction: action,
        overallStatus: vendor.verifiedBadge.status,
        reason: reason || ''
      },
      req.ip
    );

    // In-app notification to the vendor
    if (vendor.user) {
      try {
        await Notification.create({
          recipient: vendor.user._id,
          sender: req.user._id,
          title: `Document ${doc.name} Reviewed: ${action.replace('_', ' ').toUpperCase()}`,
          message: action === 'approved'
            ? `Your verification document "${doc.name}" has been approved by our compliance team.`
            : `Your verification document "${doc.name}" requires attention: "${reason?.trim()}".`,
          type: 'system',
          link: '/vendor/verification'
        });
      } catch (err) {
        console.warn('Failed to send notification for document review:', err.message);
      }
    }

    res.status(200).json({
      success: true,
      message: `Document ${doc.name} marked as ${action}`,
      document: doc,
      verifiedBadge: vendor.verifiedBadge
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/vendors/:id/documents/:docIndex/:mode?
 * Authenticated document access for inspection or downloading by authorized admins
 */
export const serveVendorDocument = async (req, res, next) => {
  try {
    const { id, docIndex, mode = 'view' } = req.params;

    let vendor = await VendorProfile.findById(id);
    if (!vendor && mongoose.Types.ObjectId.isValid(id)) {
      vendor = await VendorProfile.findOne({ user: id });
    }
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const idx = parseInt(docIndex, 10);
    const doc = vendor.verifiedBadge?.documents?.[idx];
    if (!doc || !doc.url) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const isRemote = doc.url.startsWith('http://') || doc.url.startsWith('https://');

    if (isRemote) {
      return res.redirect(doc.url);
    }

    // Local file fallback
    const cleanPath = doc.url.replace(/^\/?uploads\//, '');
    const filePath = path.join(__dirname, '../../uploads', cleanPath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Document file not found on server' });
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    if (mode === 'download') {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.name || 'document' + ext)}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.name || 'document' + ext)}"`);
    }

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

export const updateVendorApproval = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason, notes } = req.body;

    const validStatuses = ['pending', 'under_review', 'changes_required', 'approved', 'rejected', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Mandatory reason check
    if (['changes_required', 'rejected', 'suspended'].includes(status) && (!reason || !reason.trim())) {
      return res.status(400).json({
        success: false,
        message: 'A clear reason is required when requesting changes, rejecting, or suspending a professional'
      });
    }

    let vendor = await VendorProfile.findById(id).populate('user');
    if (!vendor && mongoose.Types.ObjectId.isValid(id)) {
      vendor = await VendorProfile.findOne({ user: id }).populate('user');
    }

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Professional not found' });
    }

    const previousStatus = vendor.approvalStatus;
    vendor.approvalStatus = status;

    if (reason && reason.trim()) {
      vendor.rejectionReason = reason.trim();
    }

    // Append to audit history
    vendor.approvalHistory.push({
      status,
      reason: reason ? reason.trim() : `Status updated to ${status} by administrator`,
      reviewedBy: req.user._id,
      reviewedAt: new Date()
    });

    if (notes && notes.trim()) {
      vendor.adminNotes.push({
        note: notes.trim(),
        createdBy: req.user._id,
        createdAt: new Date()
      });
    }

    // Verification synchronization
    if (status === 'approved') {
      if (vendor.verifiedBadge) {
        vendor.verifiedBadge.status = 'verified';
        vendor.verifiedBadge.verifiedAt = new Date();
      }
      if (vendor.user) {
        await User.findByIdAndUpdate(vendor.user._id, {
          status: 'active',
          isActive: true,
          suspensionReason: ''
        });
      }
    } else if (status === 'suspended') {
      if (vendor.user) {
        await User.findByIdAndUpdate(vendor.user._id, {
          status: 'suspended',
          isActive: false,
          suspensionReason: reason.trim()
        });
      }
    }

    await vendor.save();

    // Log administrative action
    await logAdminAction(
      req.user,
      'VENDOR_APPROVAL_UPDATED',
      'VendorProfile',
      vendor._id,
      {
        previousStatus,
        newStatus: status,
        reason: reason || 'Admin review completed',
        professionalName: vendor.user?.name || vendor.businessName
      },
      req.ip
    );

    // Send in-app notification to the professional
    if (vendor.user) {
      let notifTitle = 'Application Status Updated';
      let notifMessage = `Your professional profile status is now ${status.replace('_', ' ')}.`;

      if (status === 'approved') {
        notifTitle = 'Professional Application Approved! 🎉';
        notifMessage = 'Congratulations! Your profile has been approved. You are now visible to customers and can receive and accept service jobs.';
      } else if (status === 'changes_required') {
        notifTitle = 'Changes Required on Your Profile';
        notifMessage = `The verification team reviewed your application: "${reason.trim()}". Please update your profile and resubmit for approval.`;
      } else if (status === 'rejected') {
        notifTitle = 'Application Decision: Not Approved';
        notifMessage = `Your application was not approved: "${reason.trim()}". If you believe this is an error, please contact support.`;
      } else if (status === 'suspended') {
        notifTitle = 'Account Notice: Account Suspended';
        notifMessage = `Your professional account has been suspended: "${reason.trim()}". Current listings are paused. Please contact platform support.`;
      }

      try {
        await Notification.create({
          recipient: vendor.user._id,
          sender: req.user._id,
          title: notifTitle,
          message: notifMessage,
          type: 'system',
          link: '/vendor/profile'
        });
      } catch (notifErr) {
        console.warn('Failed to notify professional:', notifErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: `Professional status successfully updated to ${status.replace('_', ' ')}`,
      vendor
    });
  } catch (error) {
    next(error);
  }
};

export const addVendorAdminNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, message: 'Note text cannot be empty' });
    }

    const vendor = await VendorProfile.findById(id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Professional not found' });
    }

    vendor.adminNotes.push({
      note: note.trim(),
      createdBy: req.user._id,
      createdAt: new Date()
    });

    await vendor.save();

    await logAdminAction(
      req.user,
      'VENDOR_NOTE_ADDED',
      'VendorProfile',
      vendor._id,
      { notePreview: note.trim().slice(0, 50) },
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Administrative note saved',
      adminNotes: vendor.adminNotes
    });
  } catch (error) {
    next(error);
  }
};

export const toggleVendorService = async (req, res, next) => {
  try {
    const { vendorId, serviceId } = req.params;
    const { isApproved, isActive } = req.body;

    const vendor = await VendorProfile.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Professional not found' });
    }

    const service = vendor.servicesOffered.id(serviceId);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found in professional catalog' });
    }

    if (typeof isApproved === 'boolean') service.isApproved = isApproved;
    if (typeof isActive === 'boolean') service.isActive = isActive;

    await vendor.save();

    await logAdminAction(
      req.user,
      'VENDOR_SERVICE_TOGGLED',
      'VendorProfile',
      vendor._id,
      { serviceName: service.serviceName, isApproved, isActive },
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Service status updated',
      servicesOffered: vendor.servicesOffered
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. CUSTOMER MANAGEMENT
// ==========================================

export const getCustomers = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    let query = { role: 'customer' };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { name: new RegExp(term, 'i') },
        { email: new RegExp(term, 'i') },
        { phone: new RegExp(term, 'i') }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [customers, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    // Aggregate job and booking counts for these customers
    const customerIds = customers.map(c => c._id);
    const [jobCounts, bookingCounts] = await Promise.all([
      Job.aggregate([
        { $match: { customer: { $in: customerIds } } },
        { $group: { _id: '$customer', count: { $sum: 1 } } }
      ]),
      Booking.aggregate([
        { $match: { customer: { $in: customerIds } } },
        {
          $group: {
            _id: '$customer',
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            cancelled: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    const jobCountMap = {};
    jobCounts.forEach(j => { jobCountMap[String(j._id)] = j.count; });

    const bookingCountMap = {};
    bookingCounts.forEach(b => { bookingCountMap[String(b._id)] = b; });

    const formattedCustomers = customers.map(c => {
      const bData = bookingCountMap[String(c._id)] || { total: 0, completed: 0, cancelled: 0 };
      return {
        ...c.toObject(),
        totalRequests: jobCountMap[String(c._id)] || 0,
        totalBookings: bData.total,
        completedBookings: bData.completed,
        cancelledBookings: bData.cancelled
      };
    });

    res.status(200).json({
      success: true,
      count: formattedCustomers.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)) || 1,
      customers: formattedCustomers
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be active or suspended' });
    }

    if (status === 'suspended' && (!reason || !reason.trim())) {
      return res.status(400).json({
        success: false,
        message: 'A clear reason is required to suspend a customer account'
      });
    }

    const customer = await User.findById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const previousStatus = customer.status;
    customer.status = status;
    customer.isActive = status === 'active';
    customer.suspensionReason = status === 'suspended' ? reason.trim() : '';
    await customer.save();

    await logAdminAction(
      req.user,
      'CUSTOMER_STATUS_UPDATED',
      'User',
      customer._id,
      { previousStatus, newStatus: status, reason },
      req.ip
    );

    // Send notification
    try {
      await Notification.create({
        recipient: customer._id,
        sender: req.user._id,
        title: status === 'active' ? 'Account Reactivated' : 'Account Notice: Suspended',
        message: status === 'active'
          ? 'Your WorkLogy customer account has been reactivated. You can now request services.'
          : `Your account has been suspended: "${reason.trim()}". Please contact support for assistance.`,
        type: 'system',
        link: '/customer/support'
      });
    } catch (notifErr) {
      console.warn('Failed to notify customer:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Customer account is now ${status}`,
      customer: {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        status: customer.status,
        isActive: customer.isActive,
        suspensionReason: customer.suspensionReason
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. CATEGORIES & CATALOG SERVICES MANAGEMENT
// ==========================================

export const getCategories = async (req, res, next) => {
  try {
    const categories = await ServiceCategory.find().sort({ sortOrder: 1, name: 1 });
    res.status(200).json({ success: true, count: categories.length, categories });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const { name, slug, icon, description, sortOrder, popular, isActive, filterGroup } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const cleanSlug = (slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const existing = await ServiceCategory.findOne({
      $or: [{ name: name.trim() }, { slug: cleanSlug }]
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A category with this name or slug already exists'
      });
    }

    const category = await ServiceCategory.create({
      name: name.trim(),
      slug: cleanSlug,
      icon: icon || 'Wrench',
      image: req.body.image || '',
      description: description || '',
      sortOrder: sortOrder || 0,
      popular: !!popular,
      isActive: typeof isActive === 'boolean' ? isActive : true,
      filterGroup: filterGroup || 'home-maintenance'
    });

    await logAdminAction(
      req.user,
      'CATEGORY_CREATED',
      'ServiceCategory',
      category._id,
      { name: category.name, slug: category.slug },
      req.ip
    );

    res.status(201).json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, icon, image, description, sortOrder, popular, isActive, filterGroup } = req.body;

    const category = await ServiceCategory.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (name) category.name = name.trim();
    if (slug) category.slug = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (icon) category.icon = icon;
    if (typeof image === 'string') category.image = image.trim();
    if (typeof description === 'string') category.description = description;
    if (typeof sortOrder === 'number') category.sortOrder = sortOrder;
    if (typeof popular === 'boolean') category.popular = popular;
    if (typeof isActive === 'boolean') category.isActive = isActive;
    if (filterGroup) category.filterGroup = filterGroup;

    await category.save();

    await logAdminAction(
      req.user,
      'CATEGORY_UPDATED',
      'ServiceCategory',
      category._id,
      { name: category.name, isActive: category.isActive },
      req.ip
    );

    res.status(200).json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

export const toggleCategoryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await ServiceCategory.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    category.isActive = !category.isActive;
    await category.save();

    await logAdminAction(
      req.user,
      'CATEGORY_STATUS_TOGGLED',
      'ServiceCategory',
      category._id,
      { name: category.name, isActive: category.isActive },
      req.ip
    );

    res.status(200).json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

// Catalog Services
export const getCatalogServices = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    let query = {};

    if (category && category !== 'all' && mongoose.Types.ObjectId.isValid(category)) {
      query.category = category;
    }

    if (search && search.trim()) {
      query.name = new RegExp(search.trim(), 'i');
    }

    const services = await CatalogService.find(query)
      .populate('category', 'name slug')
      .sort({ sortOrder: 1, name: 1 });

    res.status(200).json({ success: true, count: services.length, services });
  } catch (error) {
    next(error);
  }
};

export const createCatalogService = async (req, res, next) => {
  try {
    const {
      category,
      name,
      description,
      requiredSkills,
      allowedPricingTypes,
      minPrice,
      maxPrice,
      supportsEmergency,
      isActive,
      verificationRequired,
      estimatedDuration,
      sortOrder
    } = req.body;

    if (!category || !name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category and service name are required'
      });
    }

    const service = await CatalogService.create({
      category,
      name: name.trim(),
      description: description || '',
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : [],
      allowedPricingTypes: allowedPricingTypes || ['fixed', 'hourly', 'quote'],
      minPrice: minPrice || 0,
      maxPrice: maxPrice || 0,
      supportsEmergency: typeof supportsEmergency === 'boolean' ? supportsEmergency : true,
      isActive: typeof isActive === 'boolean' ? isActive : true,
      verificationRequired: !!verificationRequired,
      estimatedDuration: estimatedDuration || '1 - 2 hours',
      sortOrder: sortOrder || 0
    });

    const populated = await CatalogService.findById(service._id).populate('category', 'name slug');

    await logAdminAction(
      req.user,
      'CATALOG_SERVICE_CREATED',
      'CatalogService',
      service._id,
      { name: service.name, categoryId: category },
      req.ip
    );

    res.status(201).json({ success: true, service: populated });
  } catch (error) {
    next(error);
  }
};

export const updateCatalogService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const service = await CatalogService.findById(id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found in catalog' });
    }

    const updateFields = [
      'name', 'description', 'requiredSkills', 'allowedPricingTypes',
      'minPrice', 'maxPrice', 'supportsEmergency', 'isActive',
      'verificationRequired', 'estimatedDuration', 'sortOrder', 'category'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        service[field] = req.body[field];
      }
    });

    await service.save();
    const populated = await CatalogService.findById(service._id).populate('category', 'name slug');

    await logAdminAction(
      req.user,
      'CATALOG_SERVICE_UPDATED',
      'CatalogService',
      service._id,
      { name: service.name, isActive: service.isActive },
      req.ip
    );

    res.status(200).json({ success: true, service: populated });
  } catch (error) {
    next(error);
  }
};

export const toggleCatalogServiceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const service = await CatalogService.findById(id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Catalog service not found' });
    }

    service.isActive = !service.isActive;
    await service.save();

    await logAdminAction(
      req.user,
      'CATALOG_SERVICE_STATUS_TOGGLED',
      'CatalogService',
      service._id,
      { name: service.name, isActive: service.isActive },
      req.ip
    );

    res.status(200).json({ success: true, service });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. JOBS, BOOKINGS & EMERGENCY CONTROL
// ==========================================

export const getAdminJobs = async (req, res, next) => {
  try {
    const { urgency, status, category, search, page = 1, limit = 20 } = req.query;
    let query = { isDeleted: { $ne: true } };

    if (urgency && urgency !== 'all') {
      query.urgency = urgency;
      // If viewing emergency dispatch queue and status is not specifically requested, show active dispatching/open emergency requests
      if (!status || status === 'all') {
        query.status = { $in: ['open', 'dispatching'] };
      }
    }

    if (status && status !== 'all') {
      if (status === 'active') {
        query.status = { $in: ['open', 'dispatching'] };
      } else {
        query.status = status;
      }
    }

    if (category && category !== 'all' && mongoose.Types.ObjectId.isValid(category)) {
      query.category = category;
    }

    if (search && search.trim()) {
      query.title = new RegExp(search.trim(), 'i');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [jobs, total] = await Promise.all([
      Job.find(query)
        .populate('customer', 'name email phone avatar')
        .populate('selectedVendor', 'name email phone avatar')
        .populate('category', 'name slug')
        .populate('booking')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Job.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: jobs.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)) || 1,
      jobs
    });
  } catch (error) {
    next(error);
  }
};

export const reassignJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newVendorId, reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A clear reason is required to reassign a job or booking'
      });
    }

    const job = await Job.findById(id).populate('selectedVendor customer booking');
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const newVendorUser = await User.findById(newVendorId);
    if (!newVendorUser || newVendorUser.role !== 'vendor') {
      return res.status(400).json({ success: false, message: 'Invalid replacement professional selected' });
    }

    // Verify replacement pro is approved
    const newVendorProfile = await VendorProfile.findOne({ user: newVendorId });
    if (!newVendorProfile || newVendorProfile.approvalStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reassign: selected professional is not approved'
      });
    }

    const oldVendorUser = job.selectedVendor;
    job.assignmentHistory.push({
      vendor: oldVendorUser ? oldVendorUser._id : null,
      assignedAt: job.assignedAt || new Date(),
      status: 'reassigned_by_admin'
    });

    job.selectedVendor = newVendorId;
    job.assignedAt = new Date();
    await job.save();

    // Synchronize associated booking if present
    if (job.booking) {
      await Booking.findByIdAndUpdate(job.booking._id, {
        vendor: newVendorId,
        status: 'assigned'
      });
    }

    await logAdminAction(
      req.user,
      'JOB_REASSIGNED',
      'Job',
      job._id,
      {
        previousVendor: oldVendorUser?._id,
        newVendor: newVendorId,
        reason: reason.trim()
      },
      req.ip
    );

    // Notify parties
    const io = getIO();
    if (oldVendorUser) {
      try {
        await Notification.create({
          recipient: oldVendorUser._id,
          sender: req.user._id,
          title: 'Job Reassigned by Admin',
          message: `Job "${job.title}" has been reassigned to another contractor by platform admin: ${reason.trim()}`,
          type: 'system',
          link: '/vendor/active-jobs'
        });
      } catch (e) {
        console.warn(e.message);
      }
    }

    try {
      await Notification.create({
        recipient: newVendorId,
        sender: req.user._id,
        title: 'New Job Assigned to You',
        message: `Admin has assigned job "${job.title}" to you. Please review details immediately.`,
        type: 'job_assigned',
        link: `/vendor/jobs/${job._id}`
      });

      await Notification.create({
        recipient: job.customer._id,
        sender: req.user._id,
        title: 'Professional Reassigned',
        message: `Your job "${job.title}" has been reassigned to ${newVendorUser.name}.`,
        type: 'system',
        link: '/customer/tracking'
      });
    } catch (e) {
      console.warn(e.message);
    }

    res.status(200).json({
      success: true,
      message: `Job successfully reassigned to ${newVendorUser.name}`,
      job
    });
  } catch (error) {
    next(error);
  }
};

export const retryEmergencyDispatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await Job.findById(id).populate('category customer');

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Only open jobs can be dispatched to professionals'
      });
    }

    const eligibleVendors = await matchEligibleVendors(job);
    const io = getIO();

    if (eligibleVendors.length > 0) {
      await Job.findByIdAndUpdate(job._id, {
        notifiedVendors: eligibleVendors.map(v => v.userId)
      });
    }

    for (const vendor of eligibleVendors) {
      try {
        await Notification.create({
          recipient: vendor.userId,
          sender: req.user._id,
          title: `🚨 Emergency Job Redispatched: ${job.title}`,
          message: `Emergency request in ${job.location?.locality || job.location?.city}. First contractor to accept gets the job!`,
          type: 'job_alert',
          link: `/vendor/jobs/${job._id}`
        });

        if (io) {
          io.to(`user_${vendor.userId.toString()}`).emit('emergency_job_lead', {
            jobId: job._id,
            title: job.title,
            category: job.category?.name,
            urgency: job.urgency,
            budget: job.budget,
            location: {
              locality: job.location?.locality,
              city: job.location?.city
            }
          });
        }
      } catch (notifErr) {
        console.warn('Dispatch error for vendor:', vendor.userId, notifErr.message);
      }
    }

    await logAdminAction(
      req.user,
      'EMERGENCY_DISPATCH_RETRIED',
      'Job',
      job._id,
      { notifiedCount: eligibleVendors.length },
      req.ip
    );

    res.status(200).json({
      success: true,
      message: `Dispatched emergency request to ${eligibleVendors.length} eligible professionals`,
      eligibleCount: eligibleVendors.length
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 6. PAYMENTS & TRANSACTIONS LEDGER
// ==========================================

export const getTransactions = async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    let query = {};

    if (status && status !== 'all') {
      query.paymentStatus = status;
    }

    if (type && type !== 'all') {
      query.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, total, totalsAgg] = await Promise.all([
      Transaction.find(query)
        .populate('customer', 'name email')
        .populate('vendor', 'name email')
        .populate('booking')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments(query),
      Transaction.aggregate([
        {
          $group: {
            _id: null,
            totalGross: { $sum: '$grossAmount' },
            totalFees: { $sum: '$platformFee' },
            totalNet: { $sum: '$netAmount' },
            totalEscrow: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'held_in_escrow'] }, '$grossAmount', 0]
              }
            }
          }
        }
      ])
    ]);

    const summary = totalsAgg[0] || { totalGross: 0, totalFees: 0, totalNet: 0, totalEscrow: 0 };

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)) || 1,
      summary,
      transactions
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 7. DISPUTES & REVIEW MODERATION
// ==========================================

export const getDisputes = async (req, res, next) => {
  try {
    const { status, disputeCategory } = req.query;
    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (disputeCategory && disputeCategory !== 'all') {
      query.disputeCategory = disputeCategory;
    }

    const disputes = await Dispute.find(query)
      .populate('booking', 'serviceTitle bookingReference status scheduledDate pricing')
      .populate('job', 'title status location budget')
      .populate('raisedBy', 'name email phone role avatar')
      .populate('against', 'name email phone role avatar')
      .populate('resolution.resolvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: disputes.length, disputes });
  } catch (error) {
    next(error);
  }
};

export const resolveDispute = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { outcome, notes, status = 'resolved', bookingAction } = req.body;

    if (!notes || !notes.trim()) {
      return res.status(400).json({ success: false, message: 'Resolution notes are required' });
    }

    const dispute = await Dispute.findById(id).populate('raisedBy against job booking');
    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Dispute record not found' });
    }

    const previousStatus = dispute.status;
    dispute.status = status;
    dispute.resolution = {
      outcome: outcome || 'Resolved by Platform Administrator',
      notes: notes.trim(),
      resolvedBy: req.user._id,
      resolvedAt: new Date(),
      bookingAction: bookingAction || 'none'
    };

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

    await logAdminAction(
      req.user,
      'DISPUTE_RESOLVED',
      'Dispute',
      dispute._id,
      {
        previousStatus,
        newStatus: status,
        outcome: dispute.resolution.outcome,
        notes: dispute.resolution.notes,
        bookingAction: dispute.resolution.bookingAction
      },
      req.ip
    );

    // Notify both parties
    try {
      const parties = [dispute.raisedBy, dispute.against].filter(Boolean);
      for (const party of parties) {
        await Notification.create({
          recipient: party._id,
          sender: req.user._id,
          title: `Dispute Case Update (${status})`,
          message: `Dispute regarding "${dispute.booking?.serviceTitle || dispute.job?.title || 'service'}" has been updated: ${notes.trim()}`,
          type: 'system',
          link: party.role === 'customer' ? '/customer/bookings' : '/vendor/support'
        });
      }
    } catch (e) {
      console.warn(e.message);
    }

    const updatedDispute = await Dispute.findById(dispute._id)
      .populate('booking', 'serviceTitle bookingReference status')
      .populate('job', 'title status')
      .populate('raisedBy against', 'name email avatar role')
      .populate('resolution.resolvedBy', 'name email');

    res.status(200).json({ success: true, message: 'Dispute resolved successfully', dispute: updatedDispute });
  } catch (error) {
    next(error);
  }
};

// Re-export report moderation handlers for admin routes
export { getAdminReports, handleResolveReport as resolveAdminReport };

export const getReviews = async (req, res, next) => {
  try {
    const { status, moderationStatus, reported, rating, vendor, search } = req.query;
    let query = {};

    const effectiveStatus = moderationStatus || status;
    if (effectiveStatus && effectiveStatus !== 'all') {
      query.moderationStatus = effectiveStatus;
    }

    if (reported === 'true') {
      query.isReported = true;
    }

    if (rating && !isNaN(rating)) {
      query.rating = Number(rating);
    }

    if (vendor && mongoose.Types.ObjectId.isValid(vendor)) {
      query.vendor = vendor;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.comment = searchRegex;
    }

    const reviews = await Review.find(query)
      .populate('customer', 'name email avatar')
      .populate('vendor', 'name email avatar businessName')
      .populate('job', 'title')
      .populate('booking', 'serviceTitle bookingReference scheduledDate status')
      .populate('moderatedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    next(error);
  }
};

export const moderateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, moderationStatus, isPublic, moderationReason } = req.body;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const previousStatus = review.moderationStatus;
    const previousIsPublic = review.isPublic;

    // Apply moderation decision
    if (action === 'approve' || moderationStatus === 'approved') {
      review.moderationStatus = 'approved';
      review.isPublic = true;
    } else if (action === 'reject' || moderationStatus === 'rejected') {
      review.moderationStatus = 'rejected';
      review.isPublic = false;
    } else if (action === 'hide' || moderationStatus === 'hidden') {
      review.moderationStatus = 'hidden';
      review.isPublic = false;
    } else if (action === 'restore') {
      review.moderationStatus = 'approved';
      review.isPublic = true;
    } else if (typeof isPublic === 'boolean') {
      review.isPublic = isPublic;
      review.moderationStatus = isPublic ? 'approved' : 'hidden';
    }

    review.moderatedBy = req.user._id;
    review.moderatedAt = new Date();
    review.moderationReason = (moderationReason || '').trim() || 'Admin policy moderation';
    review.isReported = false; // clear reported flag once reviewed

    await review.save();

    // Re-aggregate vendor's authoritative public rating immediately
    await recalculateVendorRating(review.vendor);

    await logAdminAction(
      req.user,
      'REVIEW_MODERATED',
      'Review',
      review._id,
      {
        previousStatus,
        previousIsPublic,
        newStatus: review.moderationStatus,
        newIsPublic: review.isPublic,
        moderationReason: review.moderationReason
      },
      req.ip
    );

    const populatedReview = await Review.findById(review._id)
      .populate('customer', 'name email avatar')
      .populate('vendor', 'name email avatar businessName')
      .populate('booking', 'serviceTitle bookingReference')
      .populate('moderatedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Review moderated successfully and vendor rating re-aggregated.',
      review: populatedReview
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 8. ADMIN NOTIFICATIONS
// ==========================================

export const getAdminNotifications = async (req, res, next) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({
        $or: [
          { type: 'admin_alert' },
          { recipient: req.user._id }
        ]
      })
        .populate('sender', 'name email avatar')
        .sort({ createdAt: -1 })
        .limit(50),
      Notification.countDocuments({
        $or: [
          { type: 'admin_alert' },
          { recipient: req.user._id }
        ],
        isRead: false
      })
    ]);

    res.status(200).json({ success: true, count: notifications.length, unreadCount, notifications });
  } catch (error) {
    next(error);
  }
};

export const markAdminNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === 'all') {
      await Notification.updateMany(
        {
          $or: [
            { type: 'admin_alert' },
            { recipient: req.user._id }
          ],
          isRead: false
        },
        { isRead: true }
      );
    } else {
      await Notification.findByIdAndUpdate(id, { isRead: true });
    }

    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 9. PLATFORM SETTINGS
// ==========================================

export const getPlatformSettings = async (req, res, next) => {
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({
        platformName: 'WorkLogy',
        supportEmail: 'support@worklogy.in',
        supportPhone: '+91 522 400 8900',
        operatingCity: 'Lucknow',
        commissionRate: 5,
        emergencyDispatch: {
          defaultRadiusKm: 15,
          responseTimeoutMins: 30,
          defaultCallOutFee: 499,
          enabled: true
        },
        approvalRules: {
          requireAdminApproval: true,
          requireDocuments: true,
          autoApproveVerified: false
        },
        cancellationRules: {
          freeCancellationMins: 15,
          cancellationPenaltyPercent: 10
        }
      });
    }

    res.status(200).json({ success: true, settings });
  } catch (error) {
    next(error);
  }
};

export const updatePlatformSettings = async (req, res, next) => {
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = new PlatformSettings();
    }

    const {
      platformName,
      supportEmail,
      supportPhone,
      operatingCity,
      commissionRate,
      emergencyDispatch,
      approvalRules,
      cancellationRules
    } = req.body;

    if (platformName) settings.platformName = platformName;
    if (supportEmail) settings.supportEmail = supportEmail;
    if (supportPhone) settings.supportPhone = supportPhone;
    if (operatingCity) settings.operatingCity = operatingCity;
    if (typeof commissionRate === 'number') settings.commissionRate = commissionRate;
    if (emergencyDispatch) settings.emergencyDispatch = { ...settings.emergencyDispatch, ...emergencyDispatch };
    if (approvalRules) settings.approvalRules = { ...settings.approvalRules, ...approvalRules };
    if (cancellationRules) settings.cancellationRules = { ...settings.cancellationRules, ...cancellationRules };

    settings.updatedBy = req.user._id;
    await settings.save();

    await logAdminAction(
      req.user,
      'PLATFORM_SETTINGS_UPDATED',
      'PlatformSettings',
      settings._id,
      { commissionRate: settings.commissionRate, emergencyEnabled: settings.emergencyDispatch?.enabled },
      req.ip
    );

    res.status(200).json({ success: true, message: 'Platform settings saved', settings });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 10. SYSTEM ACTIVITY LOGS
// ==========================================

export const getSystemLogs = async (req, res, next) => {
  try {
    const { action, targetType, page = 1, limit = 50 } = req.query;
    let query = {};

    if (action && action !== 'all') {
      query.action = action;
    }

    if (targetType && targetType !== 'all') {
      query.targetType = targetType;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .populate('user', 'name email role adminRole')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ActivityLog.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)) || 1,
      logs
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 11. VERIFICATION REQUESTS MANAGEMENT
// ==========================================

export const getVerificationRequests = async (req, res, next) => {
  try {
    const { status = 'all', search, page = 1, limit = 20 } = req.query;
    let query = {};

    if (status && status !== 'all') {
      query['verifiedBadge.status'] = status;
    } else {
      query['verifiedBadge.status'] = { $in: ['pending_review', 'under_review', 'verified', 'rejected', 'changes_required', 'pending', 'expired'] };
    }

    if (search && search.trim()) {
      const term = search.trim();
      const matchedUsers = await User.find({
        $or: [
          { name: new RegExp(term, 'i') },
          { email: new RegExp(term, 'i') },
          { phone: new RegExp(term, 'i') }
        ]
      }).select('_id');

      const userIds = matchedUsers.map(u => u._id);
      query.$or = [
        { businessName: new RegExp(term, 'i') },
        { user: { $in: userIds } },
        { 'verifiedBadge.verificationRequestId': new RegExp(term, 'i') },
        { 'verifiedBadge.maskedIdNumber': new RegExp(term, 'i') }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [verifications, total] = await Promise.all([
      VendorProfile.find(query)
        .populate('user', 'name email phone avatar')
        .populate('verifiedBadge.reviewedBy', 'name email')
        .select('user businessName verifiedBadge approvalStatus createdAt')
        .sort({ 'verifiedBadge.submittedAt': -1, updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      VendorProfile.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: verifications.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)) || 1,
      verifications
    });
  } catch (error) {
    next(error);
  }
};

export const getVerificationRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let vendor = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      vendor = await VendorProfile.findById(id)
        .populate('user', 'name email phone avatar')
        .populate('categories', 'name')
        .populate('verifiedBadge.reviewedBy', 'name email adminRole');

      if (!vendor) {
        vendor = await VendorProfile.findOne({ user: id })
          .populate('user', 'name email phone avatar')
          .populate('categories', 'name')
          .populate('verifiedBadge.reviewedBy', 'name email adminRole');
      }
    }

    if (!vendor) {
      vendor = await VendorProfile.findOne({ 'verifiedBadge.verificationRequestId': id })
        .populate('user', 'name email phone avatar')
        .populate('categories', 'name')
        .populate('verifiedBadge.reviewedBy', 'name email adminRole');
    }

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Verification request not found' });
    }

    // Record access in administrative audit log for compliance
    await logAdminAction(
      req.user,
      'VERIFICATION_REQUEST_INSPECTED',
      'VendorProfile',
      vendor._id,
      {
        verificationRequestId: vendor.verifiedBadge?.verificationRequestId,
        professionalName: vendor.user?.name || vendor.businessName,
        status: vendor.verifiedBadge?.status
      },
      req.ip
    );

    res.status(200).json({
      success: true,
      verification: {
        vendorId: vendor._id,
        userId: vendor.user?._id,
        userName: vendor.user?.name,
        userEmail: vendor.user?.email,
        userPhone: vendor.user?.phone,
        userAvatar: vendor.user?.avatar,
        businessName: vendor.businessName,
        categories: vendor.categories,
        approvalStatus: vendor.approvalStatus,
        verifiedBadge: vendor.verifiedBadge
      }
    });
  } catch (error) {
    next(error);
  }
};

export const reviewVerificationRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, reason, resubmissionInstructions, adminNotes } = req.body;

    const validActions = ['approve', 'reject', 'request_resubmission', 'changes_required', 'under_review'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: `Invalid action. Must be one of: ${validActions.join(', ')}`
      });
    }

    if (['reject', 'request_resubmission', 'changes_required'].includes(action) && (!reason || !reason.trim())) {
      return res.status(400).json({
        success: false,
        message: 'A mandatory reason must be specified when rejecting or requesting changes on a verification request.'
      });
    }

    let vendor = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      vendor = await VendorProfile.findById(id).populate('user');
      if (!vendor) {
        vendor = await VendorProfile.findOne({ user: id }).populate('user');
      }
    }
    if (!vendor) {
      vendor = await VendorProfile.findOne({ 'verifiedBadge.verificationRequestId': id }).populate('user');
    }

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor verification record not found' });
    }

    const previousStatus = vendor.verifiedBadge?.status || 'not_submitted';
    const now = new Date();

    if (action === 'approve') {
      vendor.verifiedBadge.status = 'verified';
      vendor.verifiedBadge.verifiedAt = now;
      vendor.verifiedBadge.reviewedBy = req.user._id;
      vendor.verifiedBadge.reviewedAt = now;
      vendor.verifiedBadge.rejectionReason = '';
      vendor.verifiedBadge.resubmissionInstructions = '';
      vendor.approvalStatus = 'approved';
      if (vendor.user) {
        await User.findByIdAndUpdate(vendor.user._id, { status: 'active', isActive: true });
      }
    } else if (action === 'reject') {
      vendor.verifiedBadge.status = 'rejected';
      vendor.verifiedBadge.reviewedBy = req.user._id;
      vendor.verifiedBadge.reviewedAt = now;
      vendor.verifiedBadge.rejectionReason = reason.trim();
    } else if (action === 'request_resubmission' || action === 'changes_required') {
      vendor.verifiedBadge.status = 'changes_required';
      vendor.verifiedBadge.reviewedBy = req.user._id;
      vendor.verifiedBadge.reviewedAt = now;
      vendor.verifiedBadge.rejectionReason = reason.trim();
      vendor.verifiedBadge.resubmissionInstructions = (resubmissionInstructions || reason).trim();
    } else if (action === 'under_review') {
      vendor.verifiedBadge.status = 'under_review';
      vendor.verifiedBadge.reviewedBy = req.user._id;
    }

    if (adminNotes && adminNotes.trim()) {
      vendor.adminNotes.push({
        author: req.user._id,
        note: `[Verification Review] ${adminNotes.trim()}`,
        createdAt: now
      });
    }

    await vendor.save();

    // Log admin audit action
    await logAdminAction(
      req.user,
      'VERIFICATION_REQUEST_REVIEWED',
      'VendorProfile',
      vendor._id,
      {
        previousStatus,
        action,
        newStatus: vendor.verifiedBadge.status,
        reason: reason || 'Identity verification reviewed',
        verificationRequestId: vendor.verifiedBadge.verificationRequestId
      },
      req.ip
    );

    // In-app notification to the professional
    if (vendor.user) {
      let notifTitle = 'Verification Status Update';
      let notifMessage = `Your identity verification status has been updated to ${vendor.verifiedBadge.status.replace('_', ' ')}.`;

      if (action === 'approve') {
        notifTitle = 'Identity Verification Approved! 🛡️';
        notifMessage = 'Congratulations! Your identity verification has been approved. Your public profile now displays the official Verified Professional badge.';
      } else if (action === 'reject') {
        notifTitle = 'Identity Verification Decision: Not Approved';
        notifMessage = `Your identity verification submission was not approved: "${reason.trim()}". You may review requirements and submit an appeal.`;
      } else if (action === 'request_resubmission' || action === 'changes_required') {
        notifTitle = 'Verification Resubmission Requested';
        notifMessage = `Additional information is required for your verification: "${(resubmissionInstructions || reason).trim()}". Please update your documents.`;
      }

      try {
        await Notification.create({
          recipient: vendor.user._id,
          sender: req.user._id,
          title: notifTitle,
          message: notifMessage,
          type: 'system',
          link: '/vendor/verification'
        });
      } catch (notifErr) {
        console.warn('Failed to notify vendor on verification review:', notifErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: `Verification request successfully updated to ${vendor.verifiedBadge.status}`,
      verifiedBadge: vendor.verifiedBadge
    });
  } catch (error) {
    next(error);
  }
};
