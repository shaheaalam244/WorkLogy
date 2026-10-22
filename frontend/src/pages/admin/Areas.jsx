import React, { useState, useEffect } from 'react';
import { Map, Plus, Trash2, MapPin, CheckCircle2, AlertCircle, X, RefreshCw } from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { adminAPI } from '../../api/admin.api';

export default function AdminAreas() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    zipCode: '226010',
    radiusKm: 25
  });

  const fetchAreas = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getAreas();
      if (res?.areas) {
        setAreas(res.areas);
      }
    } catch (err) {
      console.error('Failed to load service areas:', err);
      setError('Failed to load coverage zones from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  const handleCreateArea = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.city.trim()) {
      setError('Zone name and city are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await adminAPI.createArea({
        name: formData.name.trim(),
        city: formData.city.trim(),
        state: formData.state.trim() || 'Uttar Pradesh',
        zipCode: formData.zipCode.trim(),
        radiusKm: Number(formData.radiusKm) || 25
      });

      if (res?.success) {
        setSuccessMsg(`Coverage zone "${formData.name}" added successfully.`);
        setModalOpen(false);
        setFormData({
          name: '',
          city: 'Lucknow',
          state: 'Uttar Pradesh',
          zipCode: '226010',
          radiusKm: 25
        });
        fetchAreas();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error('Error creating service area:', err);
      setError(err.response?.data?.message || 'Failed to create service area.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteArea = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove the "${name}" service coverage zone?`)) return;

    try {
      setError(null);
      await adminAPI.deleteArea(id);
      setSuccessMsg(`Coverage zone removed.`);
      setAreas(prev => prev.filter(a => a._id !== id));
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Error deleting area:', err);
      setError(err.response?.data?.message || 'Failed to delete service area.');
    }
  };

  if (loading) {
    return (
      <div className="py-20">
        <Loader text="Loading service geo-zones & coverage rings..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60">
              Coverage & Geofencing
            </span>
            <span className="text-xs text-slate-500 font-medium">· Lucknow Metro</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Service Geo-Zones & Coverage
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mt-1">
            Geographic boundary rings for automatic socket tender routing and emergency contractor matching.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={fetchAreas}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setModalOpen(true)}>
            Add New Zone
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-700" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {areas.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-10 text-center space-y-3">
          <Map className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No coverage zones configured</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create coverage zones to define dispatch rings across Lucknow localities.
          </p>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setModalOpen(true)}>
            Add First Zone
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {areas.map((area) => (
            <div key={area._id} className="bg-white border border-slate-200 shadow-sm p-5 rounded-2xl space-y-3 relative group hover:border-purple-300 transition">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">{area.name}</h4>
                    <p className="text-[11px] text-slate-500">{area.city}, {area.state}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteArea(area._id, area.name)}
                  className="text-slate-400 hover:text-rose-600 p-1.5 transition rounded-lg hover:bg-rose-50"
                  title="Remove zone"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                <span className="text-emerald-800 font-bold">{area.radiusKm || 25} km radius</span>
                <span className="text-slate-600 font-medium">PIN: {area.zipCode || '226010'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Zone Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Add Coverage Geo-Zone</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateArea} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Zone Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gomti Nagar & Indiranagar Zone"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Postal PIN Code</label>
                  <input
                    type="text"
                    placeholder="226010"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Radius (km)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.radiusKm}
                    onChange={(e) => setFormData({ ...formData, radiusKm: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                  {submitting ? 'Saving Zone...' : 'Save Zone'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
