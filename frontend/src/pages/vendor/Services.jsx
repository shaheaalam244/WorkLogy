import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  Pause, 
  Play, 
  Clock, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Layers,
  Wrench
} from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { formatCurrency } from '../../utils/formatters';
import { vendorAPI } from '../../api/vendor.api';
import { getServiceImage } from '../../constants/serviceImages';

export default function VendorServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [actionMsg, setActionMsg] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const params = activeTab !== 'all' ? { status: activeTab } : {};
      const res = await vendorAPI.getMyServices(params);
      if (res?.services) {
        setServices(res.services);
      }
    } catch (err) {
      console.error('Error fetching vendor services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [activeTab]);

  const handleStatusToggle = async (id, currentStatus) => {
    try {
      const nextStatus = currentStatus === 'published' ? 'paused' : 'published';
      const res = await vendorAPI.updateServiceStatus(id, nextStatus);
      if (res?.success) {
        setActionMsg(`Service status changed to ${nextStatus}.`);
        fetchServices();
        setTimeout(() => setActionMsg(null), 3000);
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await vendorAPI.deleteService(id);
      if (res?.success) {
        setActionMsg('Service listing deleted successfully.');
        setConfirmDeleteId(null);
        fetchServices();
        setTimeout(() => setActionMsg(null), 3000);
      }
    } catch (err) {
      console.error('Error deleting service:', err);
    }
  };

  const filteredServices = services.filter(s => 
    s.title?.toLowerCase().includes(search.toLowerCase()) ||
    s.domain?.toLowerCase().includes(search.toLowerCase()) ||
    s.subcategory?.toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { id: 'all', label: 'All Listings' },
    { id: 'published', label: 'Published' },
    { id: 'draft', label: 'Drafts' },
    { id: 'pending_approval', label: 'Pending Approval' },
    { id: 'paused', label: 'Paused' },
    { id: 'archived', label: 'Archived' }
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'published':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">Published</span>;
      case 'draft':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">Draft</span>;
      case 'paused':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">Paused</span>;
      case 'pending_approval':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">Under Review</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">My Services</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">My Services</h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Manage your services and prices available for direct booking by customers.
          </p>
        </div>

        <Link to="/vendor/services/new">
          <Button variant="primary" size="md" icon={Plus}>
            Add New Service
          </Button>
        </Link>
      </div>

      {actionMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-emerald-800 text-white font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by title or domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
          />
        </div>
      </div>

      {/* Listings Body */}
      {loading ? (
        <div className="py-16">
          <Loader text="Fetching your service catalogue..." />
        </div>
      ) : filteredServices.length > 0 ? (
        <div className="space-y-4">
          {filteredServices.map((item) => (
            <div 
              key={item._id} 
              className="bg-white border border-slate-200 shadow-sm p-5 sm:p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:border-slate-300 transition"
            >
              <div className="flex items-start gap-4 flex-1">
                <img 
                  src={item.images?.[0] || getServiceImage(item.domain, item.subcategory)} 
                  alt={item.title || item.domain} 
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = getServiceImage(item.domain, item.subcategory);
                  }}
                  className="w-20 h-20 rounded-2xl object-cover shrink-0 border border-slate-200"
                />

                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(item.status)}
                    <span className="text-[11px] font-semibold text-slate-500">{item.domain} · {item.subcategory}</span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base leading-snug">{item.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2">{item.shortSummary || item.description}</p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                    <span>Coverage: <strong className="text-slate-700">{item.location?.city || 'Lucknow'} ({item.location?.radiusKm || 25} km)</strong></span>
                    <span>Views: <strong className="text-slate-700">{item.viewsCount || 0}</strong></span>
                    <span>Created: <strong className="text-slate-700">{new Date(item.createdAt).toLocaleDateString()}</strong></span>
                  </div>
                </div>
              </div>

              {/* Pricing & Actions */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-500 uppercase block font-medium">Customer Price</span>
                  <p className="text-xl font-black text-emerald-800">
                    {item.pricing?.type === 'quote' 
                      ? 'Quote Based' 
                      : formatCurrency(item.pricing?.amount || item.pricing?.minPrice || 0)}
                  </p>
                  <span className="text-[10px] text-slate-500">{item.pricing?.unit || 'per visit'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStatusToggle(item._id, item.status)}
                    title={item.status === 'published' ? 'Pause Listing' : 'Publish Listing'}
                    className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1 transition ${
                      item.status === 'published'
                        ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                        : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {item.status === 'published' ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Publish</span>
                      </>
                    )}
                  </button>

                  {confirmDeleteId === item._id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(item._id)}
                      title="Delete Service"
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Services Found</h3>
          <p className="text-xs text-slate-600 max-w-sm mx-auto">
            You don't have any service listings matching this status. Post a service to begin accepting direct homeowner appointments.
          </p>
          <Link to="/vendor/services/new" className="inline-block">
            <Button variant="primary" size="sm" icon={Plus}>
              Create First Service Package
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
