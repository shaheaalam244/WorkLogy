import ServiceCategory from '../models/ServiceCategory.js';
import { SERVICE_DOMAINS } from '../utils/catalogue.js';

export const getCategories = async (req, res, next) => {
  try {
    let categories = await ServiceCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    
    // Auto-seed or refresh canonical 30 domains if count is unexpected or images are missing
    const hasMissingImages = categories.some((c) => !c.image);
    if (categories.length < 30 || hasMissingImages) {
      for (const dom of SERVICE_DOMAINS) {
        await ServiceCategory.findOneAndUpdate(
          { slug: dom.slug },
          {
            $set: {
              name: dom.name,
              slug: dom.slug,
              icon: dom.icon,
              image: dom.image,
              description: dom.description,
              popular: dom.popular,
              sortOrder: dom.sortOrder,
              subcategories: dom.subcategories,
              filterGroup: dom.filterGroup,
              isActive: true
            }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
      categories = await ServiceCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    }

    res.status(200).json({ success: true, count: categories.length, categories });
  } catch (error) {
    next(error);
  }
};

export const getCategoryBySlug = async (req, res, next) => {
  try {
    let category = await ServiceCategory.findOne({ slug: req.params.slug, isActive: true });
    
    // Check legacy aliases if not found directly
    if (!category) {
      const aliasMap = {
        'electrician': 'electrical-services',
        'plumber': 'plumbing-services',
        'ac-repair': 'ac-hvac-services',
        'carpenter': 'carpentry-furniture',
        'painting': 'painting-services',
        'locksmith': 'locksmith-services',
        'vehicle-services': 'vehicle-repair'
      };
      const canonicalSlug = aliasMap[req.params.slug];
      if (canonicalSlug) {
        category = await ServiceCategory.findOne({ slug: canonicalSlug, isActive: true });
      }
    }

    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.status(200).json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const category = await ServiceCategory.create(req.body);
    res.status(201).json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const category = await ServiceCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    await ServiceCategory.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Category removed' });
  } catch (error) {
    next(error);
  }
};
