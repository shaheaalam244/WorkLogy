import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Layers, 
  Tag, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Power, 
  Search, 
  ShieldAlert, 
  AlertCircle,
  Briefcase,
  Zap,
  Clock,
  DollarSign,
  X
} from 'lucide-react';
import { adminAPI } from '../../api/admin.api';
import Loader from '../../components/common/Loader';
import { formatCurrency } from '../../utils/formatters';
import { getCategoryMedia, handleImageFallback } from '../../utils/categoryMedia';
import { getServiceImage } from '../../constants/serviceImages';

export default function AdminCategories() {
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'services'
  const [categories, setCategories] = useState([]);
  const [catalogServices, setCatalogServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Category Modal State
  const [categoryModal, setCategoryModal] = useState({
    open: false,
    isEdit: false,
    id: null,
    name: '',
    slug: '',
    icon: 'Wrench',
    image: '',
    description: '',
    sortOrder: 0,
    popular: false,
    isActive: true,
    filterGroup: 'home-maintenance',
    submitting: false,
    error: ''
  });

  // Service Modal State
  const [serviceModal, setServiceModal] = useState({
    open: false,
    isEdit: false,
    id: null,
    category: '',
    name: '',
    description: '',
    requiredSkills: '',
    allowedPricingTypes: ['fixed', 'hourly', 'quote'],
    minPrice: 299,
    maxPrice: 5000,
    supportsEmergency: true,
    isActive: true,
    verificationRequired: false,
    estimatedDuration: '1 - 2 hours',
    sortOrder: 0,
    submitting: false,
    error: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catRes, srvRes] = await Promise.all([
        adminAPI.getCategories(),
        adminAPI.getCatalogServices({ category: selectedCategoryFilter })
      ]);

      if (catRes?.categories) setCategories(catRes.categories);
      if (srvRes?.services) setCatalogServices(srvRes.services);
    } catch (err) {
      console.error('Failed to load taxonomy:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategoryFilter]);

  // CATEGORY HANDLERS
  const openAddCategory = () => {
    setCategoryModal({
      open: true,
      isEdit: false,
      id: null,
      name: '',
      slug: '',
      icon: 'Wrench',
      image: '',
      description: '',
      sortOrder: categories.length,
      popular: false,
      isActive: true,
      filterGroup: 'home-maintenance',
      submitting: false,
      error: ''
    });
  };

  const openEditCategory = (cat) => {
    setCategoryModal({
      open: true,
      isEdit: true,
      id: cat._id,
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon || 'Wrench',
      image: cat.image || '',
      description: cat.description || '',
      sortOrder: cat.sortOrder || 0,
      popular: !!cat.popular,
      isActive: !!cat.isActive,
      filterGroup: cat.filterGroup || 'home-maintenance',
      submitting: false,
      error: ''
    });
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    const { isEdit, id, name, slug, icon, image, description, sortOrder, popular, isActive, filterGroup } = categoryModal;

    if (!name.trim()) {
      setCategoryModal(prev => ({ ...prev, error: 'Category name is required' }));
      return;
    }

    try {
      setCategoryModal(prev => ({ ...prev, submitting: true, error: '' }));
      const payload = {
        name: name.trim(),
        slug: (slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        icon,
        image: image?.trim() || '',
        description: description.trim(),
        sortOrder: Number(sortOrder),
        popular,
        isActive,
        filterGroup
      };

      if (isEdit) {
        await adminAPI.updateCategory(id, payload);
      } else {
        await adminAPI.createCategory(payload);
      }

      setCategoryModal(prev => ({ ...prev, open: false, submitting: false }));
      fetchData();
    } catch (err) {
      setCategoryModal(prev => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || 'Failed to save category'
      }));
    }
  };

  const handleToggleCategory = async (id) => {
    try {
      await adminAPI.toggleCategoryStatus(id);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update category status');
    }
  };

  // SERVICE HANDLERS
  const openAddService = () => {
    const defaultCat = categories[0]?._id || '';
    setServiceModal({
      open: true,
      isEdit: false,
      id: null,
      category: defaultCat,
      name: '',
      description: '',
      requiredSkills: '',
      allowedPricingTypes: ['fixed', 'hourly', 'quote'],
      minPrice: 299,
      maxPrice: 4999,
      supportsEmergency: true,
      isActive: true,
      verificationRequired: false,
      estimatedDuration: '1 - 2 hours',
      sortOrder: catalogServices.length,
      submitting: false,
      error: ''
    });
  };

  const openEditService = (srv) => {
    setServiceModal({
      open: true,
      isEdit: true,
      id: srv._id,
      category: srv.category?._id || srv.category,
      name: srv.name,
      description: srv.description || '',
      requiredSkills: srv.requiredSkills?.join(', ') || '',
      allowedPricingTypes: srv.allowedPricingTypes || ['fixed', 'hourly'],
      minPrice: srv.minPrice || 0,
      maxPrice: srv.maxPrice || 0,
      supportsEmergency: !!srv.supportsEmergency,
      isActive: !!srv.isActive,
      verificationRequired: !!srv.verificationRequired,
      estimatedDuration: srv.estimatedDuration || '1 - 2 hours',
      sortOrder: srv.sortOrder || 0,
      submitting: false,
      error: ''
    });
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    const {
      isEdit,
      id,
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
    } = serviceModal;

    if (!category || !name.trim()) {
      setServiceModal(prev => ({ ...prev, error: 'Category and service name are required' }));
      return;
    }

    try {
      setServiceModal(prev => ({ ...prev, submitting: true, error: '' }));
      const payload = {
        category,
        name: name.trim(),
        description: description.trim(),
        requiredSkills: requiredSkills.split(',').map(s => s.trim()).filter(Boolean),
        allowedPricingTypes,
        minPrice: Number(minPrice),
        maxPrice: Number(maxPrice),
        supportsEmergency,
        isActive,
        verificationRequired,
        estimatedDuration,
        sortOrder: Number(sortOrder)
      };

      if (isEdit) {
        await adminAPI.updateCatalogService(id, payload);
      } else {
        await adminAPI.createCatalogService(payload);
      }

      setServiceModal(prev => ({ ...prev, open: false, submitting: false }));
      fetchData();
    } catch (err) {
      setServiceModal(prev => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || 'Failed to save service'
      }));
    }
  };

  const handleToggleService = async (id) => {
    try {
      await adminAPI.toggleCatalogServiceStatus(id);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update service status');
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60">
              Taxonomy & Service Rules
            </span>
            <span className="text-xs text-slate-500 font-medium">· Platform Catalog</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Categories & Service Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mt-1">
            Configure primary trade categories, standardize individual service catalog offerings, and enforce qualification and emergency dispatch rules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'categories' ? (
            <button
              onClick={openAddCategory}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          ) : (
            <button
              onClick={openAddService}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Catalog Service</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-xl transition ${
            activeTab === 'categories'
              ? 'border-b-2 border-purple-800 text-purple-800 bg-white shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Primary Categories ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-xl transition ${
            activeTab === 'services'
              ? 'border-b-2 border-purple-800 text-purple-800 bg-white shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Catalog Services ({catalogServices.length})</span>
        </button>
      </div>

      {/* TAB 1: CATEGORIES LIST */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-20">
              <Loader text="Loading categories..." />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat._id}
                  className={`bg-white border p-5 rounded-2xl shadow-2xs flex flex-col justify-between transition ${
                    cat.isActive ? 'border-slate-200/90' : 'border-rose-200 bg-slate-50/50 opacity-75'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                          <img
                            src={getCategoryMedia(cat).image || cat.image}
                            alt={cat.name}
                            onError={handleImageFallback}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{cat.name}</h3>
                          <span className="text-[10px] text-slate-400 font-mono">/{cat.slug}</span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        cat.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {cat.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {cat.description || 'General trade and service category.'}
                    </p>

                    <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                      <span>Order: {cat.sortOrder}</span>
                      {cat.popular && (
                        <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md">
                          ★ Featured
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
                    <button
                      onClick={() => openEditCategory(cat)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleToggleCategory(cat._id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                        cat.isActive ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{cat.isActive ? 'Deactivate' : 'Activate'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CATALOG SERVICES LIST */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategoryFilter === 'all'
                  ? 'bg-purple-800 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              All Categories
            </button>
            {categories.map((c) => (
              <button
                key={c._id}
                onClick={() => setSelectedCategoryFilter(c._id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategoryFilter === c._id
                    ? 'bg-purple-800 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-20">
              <Loader text="Loading catalog services..." />
            </div>
          ) : catalogServices.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No catalog services found</h3>
              <p className="text-xs text-slate-500 mt-1">Add specific services under this category</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogServices.map((srv) => (
                <div
                  key={srv._id}
                  className={`bg-white border p-5 rounded-2xl shadow-2xs flex flex-col justify-between transition ${
                    srv.isActive ? 'border-slate-200/90' : 'border-rose-200 bg-slate-50/50 opacity-75'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <img 
                        src={getServiceImage(srv.category?.name, srv.name)}
                        alt={srv.name}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getCategoryMedia(srv.category?.name).image;
                        }}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200 shadow-2xs"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md truncate">
                            {srv.category?.name || 'Trade'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            srv.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {srv.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm mt-1 truncate" title={srv.name}>{srv.name}</h3>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {srv.description || 'Standard service offering.'}
                    </p>

                    <div className="space-y-1 pt-1 text-xs text-slate-600">
                      <p className="flex items-center gap-1 font-semibold text-slate-800">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Range: {formatCurrency(srv.minPrice || 0)} - {formatCurrency(srv.maxPrice || 0)}</span>
                      </p>
                      <p className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Est: {srv.estimatedDuration}</span>
                      </p>
                      <p className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>Emergency: {srv.supportsEmergency ? 'Supported' : 'Standard Only'}</span>
                      </p>
                    </div>

                    {srv.requiredSkills?.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {srv.requiredSkills.map((sk, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                            {sk}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
                    <button
                      onClick={() => openEditService(srv)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleToggleService(srv._id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                        srv.isActive ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{srv.isActive ? 'Deactivate' : 'Activate'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CATEGORY ADD/EDIT MODAL */}
      {categoryModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveCategory} className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">
                {categoryModal.isEdit ? 'Edit Primary Category' : 'Create Primary Category'}
              </h3>
              <button
                type="button"
                onClick={() => setCategoryModal(prev => ({ ...prev, open: false }))}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {categoryModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {categoryModal.error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electrical Services"
                  value={categoryModal.name}
                  onChange={(e) => setCategoryModal(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Slug</label>
                <input
                  type="text"
                  placeholder="e.g. electrical-services"
                  value={categoryModal.slug}
                  onChange={(e) => setCategoryModal(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Image URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={categoryModal.image}
                  onChange={(e) => setCategoryModal(prev => ({ ...prev, image: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600 font-mono"
                />
                {categoryModal.image && (
                  <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                    <img
                      src={categoryModal.image}
                      alt="Preview"
                      onError={handleImageFallback}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Description</label>
              <textarea
                rows={2}
                placeholder="Brief summary of work covered under this trade..."
                value={categoryModal.description}
                onChange={(e) => setCategoryModal(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Display Order</label>
                <input
                  type="number"
                  value={categoryModal.sortOrder}
                  onChange={(e) => setCategoryModal(prev => ({ ...prev, sortOrder: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="flex items-center gap-4 pt-5">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={categoryModal.popular}
                    onChange={(e) => setCategoryModal(prev => ({ ...prev, popular: e.target.checked }))}
                    className="rounded text-purple-800"
                  />
                  <span>Popular / Featured</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCategoryModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={categoryModal.submitting}
                className="px-4 py-2 rounded-xl bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {categoryModal.submitting ? 'Saving...' : 'Save Category'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CATALOG SERVICE ADD/EDIT MODAL */}
      {serviceModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveService} className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">
                {serviceModal.isEdit ? 'Edit Catalog Service' : 'Add Catalog Service'}
              </h3>
              <button
                type="button"
                onClick={() => setServiceModal(prev => ({ ...prev, open: false }))}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {serviceModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {serviceModal.error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Category *</label>
              <select
                required
                value={serviceModal.category}
                onChange={(e) => setServiceModal(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600 bg-white"
              >
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Service Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Subpanel Installation & Rewiring"
                value={serviceModal.name}
                onChange={(e) => setServiceModal(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Description</label>
              <textarea
                rows={2}
                placeholder="Detailed scope of service for customer and professional reference..."
                value={serviceModal.description}
                onChange={(e) => setServiceModal(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Min Price (₹)</label>
                <input
                  type="number"
                  value={serviceModal.minPrice}
                  onChange={(e) => setServiceModal(prev => ({ ...prev, minPrice: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Max Price (₹)</label>
                <input
                  type="number"
                  value={serviceModal.maxPrice}
                  onChange={(e) => setServiceModal(prev => ({ ...prev, maxPrice: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Required Skills (Comma-separated)</label>
              <input
                type="text"
                placeholder="e.g. Master Electrician, Circuit Breaker, 3-Phase"
                value={serviceModal.requiredSkills}
                onChange={(e) => setServiceModal(prev => ({ ...prev, requiredSkills: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={serviceModal.supportsEmergency}
                  onChange={(e) => setServiceModal(prev => ({ ...prev, supportsEmergency: e.target.checked }))}
                  className="rounded text-purple-800"
                />
                <span>Supports Emergency Dispatch</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={serviceModal.verificationRequired}
                  onChange={(e) => setServiceModal(prev => ({ ...prev, verificationRequired: e.target.checked }))}
                  className="rounded text-purple-800"
                />
                <span>License Required</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setServiceModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={serviceModal.submitting}
                className="px-4 py-2 rounded-xl bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {serviceModal.submitting ? 'Saving...' : 'Save Service'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
