import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Edit3, ShieldCheck, MapPinned, Calendar } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/common/Button';
import { customerAPI } from '../../api/customer.api';
import { formatDate } from '../../utils/formatters';

export default function CustomerProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await customerAPI.getProfile();
        if (res?.profile) {
          setProfile(res.profile);
        }
      } catch (err) {
        console.error('Failed to load customer profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const defaultAddr = profile?.addresses?.find(a => a.isDefault) || profile?.addresses?.[0] || profile?.defaultAddress;
  const areaDisplay = defaultAddr?.locality 
    ? `${defaultAddr.locality}, ${defaultAddr.city || 'Lucknow'}`
    : (defaultAddr?.city ? `${defaultAddr.city}, Uttar Pradesh` : 'Lucknow, Uttar Pradesh');

  const memberSince = user?.createdAt ? formatDate(user.createdAt) : 'Recently Joined';

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Account Profile</h1>
          <p className="text-xs text-slate-600 mt-0.5">Your account information and verification status</p>
        </div>

        <Link to="/customer/edit-profile">
          <Button variant="secondary" size="sm" icon={Edit3}>
            Edit Profile
          </Button>
        </Link>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-5 pb-6 border-b border-slate-100">
          <img
            src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
            alt={user?.name}
            className="w-20 h-20 rounded-2xl object-cover ring-2 ring-emerald-600/30"
          />
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user?.name || 'Homeowner'}</h2>
            <p className="text-xs text-slate-600 mt-0.5">Verified Customer Account</p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold mt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Identity Verified</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              Email Address
            </span>
            <span className="font-semibold text-slate-900">{user?.email || 'customer@worklogy.in'}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              Phone Number
            </span>
            <span className="font-semibold text-slate-900">{user?.phone || 'Not provided'}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Primary Service Area
            </span>
            <span className="font-semibold text-slate-900">{areaDisplay}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Member Since
            </span>
            <span className="font-semibold text-slate-900">{memberSince}</span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Manage your saved addresses for one-click service dispatching
          </div>
          <Link to="/customer/addresses">
            <Button variant="ghost" size="sm" icon={MapPinned}>
              Manage Addresses
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
