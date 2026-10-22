import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight,
  User,
  Settings
} from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { vendorAPI } from '../../api/vendor.api';
import { formatCurrency } from '../../utils/formatters';

export default function VendorCalendar() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);

  useEffect(() => {
    const fetchCalendar = async () => {
      try {
        setLoading(true);
        const res = await vendorAPI.getCalendar();
        if (res?.bookings) setBookings(res.bookings);
        if (res?.availability) setAvailability(res.availability);
        if (res?.timeSlots) setTimeSlots(res.timeSlots);
      } catch (err) {
        console.error('Error fetching calendar:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCalendar();
  }, []);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  if (loading) return <div className="py-20"><Loader text="Loading your contractor calendar..." /></div>;

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Calendar</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">Calendar & Schedule</h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Confirmed jobs, reserved times, and your availability.
          </p>
        </div>

        <Link to="/vendor/availability">
          <Button variant="secondary" size="md" icon={Settings}>
            Configure Working Hours
          </Button>
        </Link>
      </div>

      {/* Working Days Status Banner */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
          <span className="font-bold text-slate-900">Standard Working Hours:</span>
          <span className="text-slate-600">{availability?.hours?.start || '09:00'} to {availability?.hours?.end || '19:00'} IST</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-slate-500">Active Days:</span>
          {daysOfWeek.map(d => {
            const active = availability?.days?.includes(d);
            return (
              <span 
                key={d} 
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                  active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400 line-through'
                }`}
              >
                {d.slice(0, 3)}
              </span>
            );
          })}
        </div>
      </div>

      {/* Bookings Agenda List */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Scheduled Appointments</h3>
          <span className="text-xs text-slate-500 font-semibold">{bookings.length} Orders in Calendar</span>
        </div>

        {bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((b) => (
              <div 
                key={b._id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-slate-500">{b.bookingReference}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      b.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {b.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{b.serviceTitle}</h4>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" /> {b.customer?.name}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-emerald-700" /> {b.address?.locality || 'Gomti Nagar'}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-blue-600" /> {new Date(b.scheduledDate).toLocaleDateString()} ({b.timeSlot})</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-base font-black text-emerald-800">
                    {formatCurrency(b.pricing?.vendorNet || b.pricing?.amount || 0)}
                  </span>
                  <Link to={`/vendor/manage-job/${b._id}`}>
                    <Button variant="secondary" size="sm">
                      Manage
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-500">
            No active appointments in this schedule window.
          </div>
        )}
      </div>

      {/* Available Daily Slots Overview */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8 space-y-4">
        <h3 className="text-base font-bold text-slate-900">Standard Daily Dispatch Slots</h3>
        <p className="text-xs text-slate-600">Homeowners can book you during any of these calibrated appointment windows:</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          {timeSlots.map((slot, i) => (
            <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <Clock className="w-4 h-4 text-emerald-700 mx-auto mb-1" />
              <span className="text-xs font-bold text-slate-800 block">{slot}</span>
              <span className="text-[10px] text-emerald-700 font-medium">Open for Dispatch</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
