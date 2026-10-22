import JobRequest from '../models/JobRequest.js';

export const createJobRequest = async (req, res, next) => {
  try {
    const request = await JobRequest.create({
      ...req.body,
      customer: req.user.id
    });
    res.status(201).json({ success: true, request });
  } catch (error) {
    next(error);
  }
};

export const getVendorRequests = async (req, res, next) => {
  try {
    const requests = await JobRequest.find({ vendor: req.user.id })
      .populate('customer', 'name email avatar phone')
      .populate('category', 'name slug icon')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, requests });
  } catch (error) {
    next(error);
  }
};

export const getCustomerRequests = async (req, res, next) => {
  try {
    const requests = await JobRequest.find({ customer: req.user.id })
      .populate('vendor', 'name email avatar phone')
      .populate('category', 'name slug icon')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, requests });
  } catch (error) {
    next(error);
  }
};

export const updateRequestStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const request = await JobRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    request.status = status || request.status;
    if (notes) request.notes = notes;
    await request.save();

    res.status(200).json({ success: true, request });
  } catch (error) {
    next(error);
  }
};
