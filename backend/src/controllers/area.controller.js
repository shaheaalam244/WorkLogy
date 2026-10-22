import ServiceArea from '../models/ServiceArea.js';

export const getAreas = async (req, res, next) => {
  try {
    const areas = await ServiceArea.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json({ success: true, count: areas.length, areas });
  } catch (error) {
    next(error);
  }
};

export const createArea = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (!data.coordinates || !data.coordinates.lat || !data.coordinates.lng) {
      data.coordinates = { lat: 26.8467, lng: 80.9462 };
    }
    const area = await ServiceArea.create(data);
    res.status(201).json({ success: true, area });
  } catch (error) {
    next(error);
  }
};

export const updateArea = async (req, res, next) => {
  try {
    const area = await ServiceArea.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, area });
  } catch (error) {
    next(error);
  }
};

export const deleteArea = async (req, res, next) => {
  try {
    await ServiceArea.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Area deleted' });
  } catch (error) {
    next(error);
  }
};
