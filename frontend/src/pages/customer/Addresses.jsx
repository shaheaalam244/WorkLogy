import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { formatFullAddress } from '../../utils/formatters';
import { customerAPI } from '../../api/customer.api';

export default function CustomerAddresses() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [newAddr, setNewAddr] = useState({ 
    label: 'Home', 
    houseNumber: '', 
    street: '', 
    landmark: '', 
    locality: '', 
    city: 'Lucknow', 
    state: 'Uttar Pradesh', 
    zipCode: '226010',
    isDefault: false
  });

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const res = await customerAPI.getProfile();
      if (res?.profile?.addresses) {
        setAddresses(res.profile.addresses);
      }
    } catch (err) {
      console.error('Failed to load customer addresses:', err);
      setError('Could not load saved addresses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newAddr.street.trim() || !newAddr.city.trim() || !newAddr.zipCode.trim()) {
      setError('Street, City, and PIN code are required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const res = await customerAPI.addAddress({
        label: newAddr.label || 'Home',
        houseNumber: newAddr.houseNumber.trim(),
        street: newAddr.street.trim(),
        locality: newAddr.locality.trim(),
        landmark: newAddr.landmark.trim(),
        city: newAddr.city.trim(),
        state: newAddr.state.trim() || 'Uttar Pradesh',
        zipCode: newAddr.zipCode.trim(),
        isDefault: addresses.length === 0 ? true : Boolean(newAddr.isDefault)
      });

      if (res?.addresses) {
        setAddresses(res.addresses);
        setSuccessMsg('Address saved successfully to your account!');
        setTimeout(() => setSuccessMsg(null), 3000);
        setIsAdding(false);
        setNewAddr({ 
          label: 'Home', 
          houseNumber: '', 
          street: '', 
          landmark: '', 
          locality: '', 
          city: 'Lucknow', 
          state: 'Uttar Pradesh', 
          zipCode: '226010',
          isDefault: false
        });
      }
    } catch (err) {
      console.error('Error adding address:', err);
      setError(err.response?.data?.message || 'Failed to add address. Please verify your details.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (addressId) => {
    try {
      setDeletingId(addressId);
      setError(null);
      const res = await customerAPI.removeAddress(addressId);
      if (res?.addresses) {
        setAddresses(res.addresses);
        setSuccessMsg('Address removed successfully.');
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setAddresses(prev => prev.filter(a => a._id !== addressId));
      }
    } catch (err) {
      console.error('Error deleting address:', err);
      setError('Failed to remove address.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-20">
        <Loader text="Loading your saved addresses..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Saved Addresses</h1>
          <p className="text-xs text-slate-600 mt-0.5">Manage your saved delivery and service locations across Lucknow, UP</p>
        </div>

        <Button variant="primary" size="sm" icon={Plus} onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : 'Add New Address'}
        </Button>
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

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">New Location Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Label (e.g. Home, Office, Parents)</label>
              <input
                type="text"
                required
                placeholder="e.g. Home"
                value={newAddr.label}
                onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">House / Flat / Building</label>
              <input
                type="text"
                placeholder="e.g. Flat 402, 4th Floor"
                value={newAddr.houseNumber}
                onChange={(e) => setNewAddr({ ...newAddr, houseNumber: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Street / Colony / Road *</label>
              <input
                type="text"
                required
                placeholder="e.g. Vibhuti Khand"
                value={newAddr.street}
                onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Landmark</label>
              <input
                type="text"
                placeholder="e.g. Near Wave Mall"
                value={newAddr.landmark}
                onChange={(e) => setNewAddr({ ...newAddr, landmark: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Locality / Area</label>
              <input
                type="text"
                placeholder="e.g. Gomti Nagar"
                value={newAddr.locality}
                onChange={(e) => setNewAddr({ ...newAddr, locality: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
              <input
                type="text"
                required
                value={newAddr.city}
                onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code *</label>
              <input
                type="text"
                required
                placeholder="226010"
                value={newAddr.zipCode}
                onChange={(e) => setNewAddr({ ...newAddr, zipCode: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isDefaultAddr"
              checked={newAddr.isDefault}
              onChange={(e) => setNewAddr({ ...newAddr, isDefault: e.target.checked })}
              className="rounded text-emerald-700 focus:ring-emerald-600"
            />
            <label htmlFor="isDefaultAddr" className="text-xs text-slate-700 font-medium">
              Set as my default service address
            </label>
          </div>
          <div className="pt-2">
            <Button type="submit" variant="primary" size="sm" disabled={saving}>
              {saving ? 'Saving to Database...' : 'Save Address'}
            </Button>
          </div>
        </form>
      )}

      {addresses.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <MapPin className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No saved addresses yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Add your residential or commercial address in Lucknow for fast, one-click service request dispatch.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div key={addr._id || addr.id} className="bg-white border border-slate-200 shadow-sm p-5 rounded-2xl flex items-start justify-between">
              <div className="space-y-1.5 flex-1 pr-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="font-bold text-slate-900 text-sm">{addr.label || 'Home'}</span>
                  {addr.isDefault && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {formatFullAddress(addr, { forceFull: true })}
                </p>
              </div>

              <button
                onClick={() => handleDelete(addr._id || addr.id)}
                disabled={deletingId === (addr._id || addr.id)}
                className="text-slate-400 hover:text-rose-600 p-1.5 transition shrink-0 rounded-lg hover:bg-rose-50"
                title="Delete address"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
