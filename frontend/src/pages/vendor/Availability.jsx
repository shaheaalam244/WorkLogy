import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Save,
  ShieldCheck
} from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { vendorAPI } from '../../api/vendor.api';

export default function VendorAvailability() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [error, setError] = useState(null);

  const [availability, setAvailability] = useState({
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    hours: { start: '08:00', end: '19:00' },
    isAvailableNow: true,
    emergencyAvailable: false
  });

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        setLoading(true);
        const res = await vendorAPI.getAvailability();
        if (res?.availability) {
          setAvailability(prev => ({ ...prev, ...res.availability }));
        }
      } catch (err) {
        console.error('Error fetching availability:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAvailability();
  }, []);

  const handleDayToggle = (day) => {
    const current = availability.days;
    const exists = current.includes(day);
    const updated = exists ? current.filter(d => d !== day) : [...current, day];
    setAvailability({ ...availability, days: updated });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const res = await vendorAPI.updateAvailability(availability);
      if (res?.success) {
        setSuccessMsg('Working hours and dispatch schedule saved successfully.');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error('Error saving availability:', err);
      setError('Failed to update availability. Please retry.');
    } finally {
      setSaving(false);
    }
  };

  const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  if (loading) return <div className="py-20"><Loader text="Loading contractor schedule..." /></div>;

  return (
    <div className="w-full space-y-8">
      <div>
        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Scheduling Controls</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">Working Hours & Availability</h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Configure when your technicians are active for instant homeowner bookings and urgent emergency leads.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Working Days */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-4">
          <h3 className="text-base font-bold text-slate-900">Standard Working Days</h3>
          <p className="text-xs text-slate-600">Select the days your team accepts service calls and dispatches:</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            {daysList.map((day) => {
              const active = availability.days?.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayToggle(day)}
                  className={`p-3 rounded-2xl text-xs font-semibold border transition text-left flex items-center justify-between ${
                    active 
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-sm' 
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <span>{day}</span>
                  {active && <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Operating Hours */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-4">
          <h3 className="text-base font-bold text-slate-900">Daily Operating Window</h3>
          <p className="text-xs text-slate-600">Appointments can only be reserved within this time range:</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Shift Start Time</label>
              <input
                type="time"
                value={availability.hours?.start || '08:00'}
                onChange={(e) => setAvailability({
                  ...availability,
                  hours: { ...availability.hours, start: e.target.value }
                })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Shift End Time</label>
              <input
                type="time"
                value={availability.hours?.end || '19:00'}
                onChange={(e) => setAvailability({
                  ...availability,
                  hours: { ...availability.hours, end: e.target.value }
                })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-emerald-700"
              />
            </div>
          </div>
        </div>

        {/* Live Availability Switches */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-4">
          <h3 className="text-base font-bold text-slate-900">Emergency & On-Demand Dispatch</h3>

          <div className="space-y-4 pt-2">
            <label className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={availability.isAvailableNow}
                onChange={(e) => setAvailability({ ...availability, isAvailableNow: e.target.checked })}
                className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-700 w-4 h-4 mt-0.5"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Accepting Same-Day Direct Job Bookings</span>
                <span className="text-[11px] text-slate-500">Your profile badge will display 'Available for Leads' to homeowners across Lucknow.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={availability.emergencyAvailable}
                onChange={(e) => setAvailability({ ...availability, emergencyAvailable: e.target.checked })}
                className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-700 w-4 h-4 mt-0.5"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Emergency 24x7 Night Calls</span>
                <span className="text-[11px] text-slate-500">Receive high-ticket emergency pipe burst and circuit short-circuit leads after 8:00 PM.</span>
              </div>
            </label>
          </div>
        </div>

        {/* Save CTA */}
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            icon={Save}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Availability & Hours'}
          </Button>
        </div>
      </form>
    </div>
  );
}
