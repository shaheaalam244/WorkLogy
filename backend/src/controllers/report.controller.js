import mongoose from 'mongoose';
import Report from '../models/Report.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Review from '../models/Review.js';
import VendorProfile from '../models/VendorProfile.js';
import ServiceCategory from '../models/ServiceCategory.js';
import ActivityLog from '../models/ActivityLog.js';
import { notificationService } from '../services/notification.service.js';

/**
 * Submit a report against a job, vendor, customer, service, or review
 * Derived from authenticated user credentials.
 */
export const createReport = async (req, res, next) => {
  try {
    const { targetType, targetId, reason, description, evidence } = req.body;

    const validTargetTypes = ['job', 'vendor', 'customer', 'service', 'review'];
    if (!targetType || !validTargetTypes.includes(targetType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid target type. Must be one of: ${validTargetTypes.join(', ')}`
      });
    }

    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid target ID is required'
      });
    }

    const validReasons = [
      'spam_fake',
      'suspected_fraud',
      'misleading_info',
      'harassment_abuse',
      'suspicious_payment',
      'repeated_cancellations',
      'other'
    ];
    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: `Invalid reason category. Must be one of: ${validReasons.join(', ')}`
      });
    }

    // Verify target entity exists in real database and snapshot details
    let targetSnapshot = { title: '', name: '', reference: '' };

    if (targetType === 'job') {
      const job = await Job.findById(targetId);
      if (!job) {
        return res.status(404).json({ success: false, message: 'Reported job listing not found' });
      }
      targetSnapshot = {
        title: job.title,
        name: `Job #${job._id.toString().slice(-6)}`,
        reference: job._id.toString()
      };
    } else if (targetType === 'vendor') {
      let vendor = await VendorProfile.findById(targetId).populate('user', 'name email');
      if (!vendor) {
        vendor = await VendorProfile.findOne({ user: targetId }).populate('user', 'name email');
      }
      if (!vendor) {
        // Also check if user with vendor role
        const vendorUser = await User.findOne({ _id: targetId, role: 'vendor' });
        if (!vendorUser) {
          return res.status(404).json({ success: false, message: 'Reported professional account not found' });
        }
        targetSnapshot = {
          title: 'Professional Service Provider',
          name: vendorUser.name,
          reference: vendorUser._id.toString()
        };
      } else {
        targetSnapshot = {
          title: vendor.businessName || 'Professional Profile',
          name: vendor.user?.name || vendor.businessName,
          reference: vendor._id.toString()
        };
      }
    } else if (targetType === 'customer') {
      const customer = await User.findOne({ _id: targetId, role: 'customer' });
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Reported customer account not found' });
      }
      targetSnapshot = {
        title: 'Customer Account',
        name: customer.name,
        reference: customer._id.toString()
      };
    } else if (targetType === 'service') {
      const category = await ServiceCategory.findById(targetId);
      targetSnapshot = {
        title: category?.name || 'Service Listing',
        name: category?.name || 'Service',
        reference: targetId.toString()
      };
    } else if (targetType === 'review') {
      const review = await Review.findById(targetId);
      if (!review) {
        return res.status(404).json({ success: false, message: 'Reported review not found' });
      }
      targetSnapshot = {
        title: `Review (${review.rating} Stars)`,
        name: review.title || review.comment?.slice(0, 30) || 'Review',
        reference: review._id.toString()
      };
    }

    // Duplicate check: Prevent multiple active reports from same user on same target
    const existingActiveReport = await Report.findOne({
      reportedBy: req.user.id,
      targetType,
      targetId,
      status: { $in: ['new', 'under_review'] }
    });

    if (existingActiveReport) {
      return res.status(409).json({
        success: false,
        code: 'REPORT_ALREADY_SUBMITTED',
        message: 'You have already submitted a report for this item that is currently under review by our moderation team.'
      });
    }

    const report = await Report.create({
      reportedBy: req.user.id,
      targetType,
      targetId,
      targetSnapshot,
      reason,
      description: description ? description.trim().slice(0, 2000) : '',
      evidence: Array.isArray(evidence) ? evidence : [],
      status: 'new'
    });

    const populatedReport = await Report.findById(report._id)
      .populate('reportedBy', 'name email role avatar');

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully. Our Trust & Safety team will review the issue.',
      report: populatedReport
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get reports submitted by authenticated user
 */
export const getMyReports = async (req, res, next) => {
  try {
    const reports = await Report.find({ reportedBy: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get reports for administrative moderation queue
 */
export const getAdminReports = async (req, res, next) => {
  try {
    const { status, targetType, reason, search, page = 1, limit = 20 } = req.query;
    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (targetType && targetType !== 'all') {
      query.targetType = targetType;
    }

    if (reason && reason !== 'all') {
      query.reason = reason;
    }

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { 'targetSnapshot.title': new RegExp(term, 'i') },
        { 'targetSnapshot.name': new RegExp(term, 'i') },
        { description: new RegExp(term, 'i') }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('reportedBy', 'name email role phone avatar')
        .populate('resolution.resolvedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Report.countDocuments(query)
    ]);

    // Calculate related reports count for the target IDs in batch
    const targetIds = reports.map(r => r.targetId);
    const relatedCounts = await Report.aggregate([
      { $match: { targetId: { $in: targetIds } } },
      { $group: { _id: '$targetId', count: { $sum: 1 } } }
    ]);
    const countsMap = {};
    relatedCounts.forEach(c => {
      countsMap[c._id.toString()] = c.count;
    });

    const enrichedReports = reports.map(r => ({
      ...r.toObject(),
      relatedReportsCount: countsMap[r.targetId.toString()] || 1
    }));

    res.status(200).json({
      success: true,
      count: enrichedReports.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)) || 1,
      reports: enrichedReports
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single report details
 */
export const getReportById = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('reportedBy', 'name email role phone avatar')
      .populate('resolution.resolvedBy', 'name email');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const isReporter = report.reportedBy?._id?.toString() === req.user.id;
    if (!isReporter && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to inspect this report' });
    }

    res.status(200).json({ success: true, report });
  } catch (error) {
    next(error);
  }
};

/**
 * Resolve or dismiss a report (Admin only)
 */
export const resolveReport = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin authorization required' });
    }

    const { status, outcome, notes } = req.body;

    if (!['resolved', 'dismissed', 'under_review'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be one of: under_review, resolved, dismissed'
      });
    }

    if (['resolved', 'dismissed'].includes(status) && (!notes || !notes.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Resolution notes are required for audit trail'
      });
    }

    const report = await Report.findById(req.params.id).populate('reportedBy');
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const previousStatus = report.status;
    report.status = status;
    report.resolution = {
      outcome: outcome ? outcome.trim() : (status === 'resolved' ? 'Violation confirmed and action taken' : 'Report dismissed after review'),
      notes: notes ? notes.trim() : '',
      resolvedBy: req.user._id || req.user.id,
      resolvedAt: new Date()
    };

    await report.save();

    // Log administrative action
    await ActivityLog.create({
      user: req.user._id || req.user.id,
      role: req.user.adminRole || req.user.role || 'admin',
      action: status === 'resolved' ? 'REPORT_RESOLVED' : 'REPORT_DISMISSED',
      targetType: 'Report',
      targetId: report._id.toString(),
      details: {
        previousStatus,
        newStatus: status,
        reportedTargetType: report.targetType,
        reportedTargetId: report.targetId.toString(),
        outcome: report.resolution.outcome,
        notes: report.resolution.notes
      },
      ipAddress: req.ip || '127.0.0.1'
    });

    // Notify the reporter if resolved or dismissed
    if (report.reportedBy?._id) {
      try {
        await notificationService.createNotification({
          recipient: report.reportedBy._id.toString(),
          sender: req.user.id,
          type: 'system_alert',
          title: `Report Status Update (${status === 'resolved' ? 'Resolved' : 'Closed'})`,
          message: `Your report regarding "${report.targetSnapshot?.title || 'listing'}" has been reviewed by our Trust & Safety team.`,
          link: '/customer/support',
          relatedResource: { resourceType: 'Report', resourceId: report._id }
        });
      } catch (notifErr) {
        console.warn('Could not dispatch report notification:', notifErr.message);
      }
    }

    const updatedReport = await Report.findById(report._id)
      .populate('reportedBy', 'name email role avatar')
      .populate('resolution.resolvedBy', 'name email');

    res.status(200).json({
      success: true,
      message: `Report marked as ${status}`,
      report: updatedReport
    });
  } catch (error) {
    next(error);
  }
};
