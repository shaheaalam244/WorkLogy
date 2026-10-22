import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import VendorCard from '../../components/cards/VendorCard';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import { Bookmark, Search, Users, Trash2 } from 'lucide-react';
import { customerAPI } from '../../api/customer.api';

export default function CustomerSaved() {
  const [savedVendors, setSavedVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  const fetchSaved = async () => {
    try {
      setLoading(true);
      const res = await customerAPI.getProfile();
      if (res?.profile?.savedVendors) {
        setSavedVendors(res.profile.savedVendors.filter(Boolean));
      }
    } catch (err) {
      console.error('Failed to load saved contractors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaved();
  }, []);

  const handleRemove = async (vendorId) => {
    try {
      setRemovingId(vendorId);
      await customerAPI.toggleSavedVendor(vendorId);
      setSavedVendors(prev => prev.filter(v => (v._id || v) !== vendorId));
    } catch (err) {
      console.error('Failed to remove saved vendor:', err);
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-20">
        <Loader text="Loading your saved professionals..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Saved Professionals</h1>
          <p className="text-xs text-slate-600 mt-0.5">Your bookmarked certified trade contractors for quick re-hiring across Lucknow</p>
        </div>

        <Link to="/professionals">
          <Button variant="secondary" size="sm" icon={Search}>
            Browse Professionals
          </Button>
        </Link>
      </div>

      {savedVendors.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-10 text-center space-y-4 max-w-lg mx-auto my-6 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Bookmark className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No saved professionals yet</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Bookmark top-rated electricians, plumbers, HVAC technicians, and carpenters to easily contact and book them in the future.
            </p>
          </div>
          <Link to="/professionals">
            <Button variant="primary" size="sm">
              Discover Professionals
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {savedVendors.map((vendor) => (
            <div key={vendor._id} className="relative group">
              <VendorCard vendor={vendor} />
              <button
                onClick={() => handleRemove(vendor._id)}
                disabled={removingId === vendor._id}
                title="Remove from saved"
                className="absolute top-4 right-4 z-10 p-1.5 rounded-lg bg-white/90 border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 shadow-2xs transition"
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
