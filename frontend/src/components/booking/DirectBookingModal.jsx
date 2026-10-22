import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  AlertCircle, 
  Wrench, 
  LocateFixed, 
  DollarSign, 
  Sparkles,
  ChevronRight,
  ArrowRight,
  Check,
  Info
} from 'lucide-react';
import Button from '../common/Button';
import Loader from '../common/Loader';
import { bookingAPI } from '../../api/booking.api';
import { customerAPI } from '../../api/customer.api';
import { locationAPI } from '../../api/location.api';
import { formatCurrency, formatFullAddress } from '../../utils/formatters';
import { getServiceImage } from '../../constants/serviceImages';

export default function DirectBookingModal({
  vendor,
  isOpen,
  onClose,
  preselectedService = null,
  onBookingSuccess
}) {
  const navigate = useNavigate();

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [successBooking, setSuccessBooking] = useState(null);

  // Form State
  const [serviceTitle, setServiceTitle] = useState('');
  const [servicePrice, setServicePrice] = useState(0);
  const [pricingType, setPricingType] = useState('fixed');
  const [serviceType, setServiceType] = useState('repair');
  const [problemDescription, setProblemDescription] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date(Date.now() + 86400000);
    return d.toISOString().split('T')[0];
  });
  const [timeSlot, setTimeSlot] = useState('10:00 AM - 01:00 PM');

  // Address
  const [addressMode, setAddressMode] = useState('saved'); // 'saved' | 'manual'
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [address, setAddress] = useState({
    addressLabel: 'Home',
    houseNumber: '',
    street: '',
    locality: '',
    landmark: '',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    zipCode: '226010',
    coordinates: { lat: 0, lng: 0 }
  });

  // Load vendor services and customer addresses
  useEffect(() => {
    if (!isOpen) {
      setSuccessBooking(null);
      setErrorBanner('');
      return;
    }

    if (preselectedService) {
      setServiceTitle(preselectedService.title);
      setServicePrice(preselectedService.price || 0);
      setPricingType(preselectedService.pricingType || 'fixed');
    } else if (vendor?.services && vendor.services.length > 0) {
      setServiceTitle(vendor.services[0].title);
      setServicePrice(vendor.services[0].price || 0);
      setPricingType('fixed');
    } else {
      setServiceTitle('General Diagnostic & Repair');
      setServicePrice(vendor?.hourlyRate || 500);
      setPricingType('hourly');
    }

    const loadCustomerData = async () => {
      try {
        setLoadingProfile(true);
        const res = await customerAPI.getProfile();
        if (res?.profile?.addresses?.length) {
          const addrs = res.profile.addresses;
          setSavedAddresses(addrs);
          const def = addrs.find(a => a.isDefault) || addrs[0];
          setSelectedAddressId(def._id);
          setAddress({
            addressLabel: def.label || 'Home',
            houseNumber: '',
            street: def.street || '',
            locality: '',
            landmark: '',
            city: def.city || 'Lucknow',
            state: def.state || 'Uttar Pradesh',
            zipCode: def.zipCode || '226010',
            coordinates: def.coordinates || { lat: 0, lng: 0 }
          });
        } else {
          setAddressMode('manual');
        }
      } catch (err) {
        setAddressMode('manual');
      } finally {
        setLoadingProfile(false);
      }
    };

    loadCustomerData();
  }, [isOpen, vendor, preselectedService]);

  const handleSavedAddressChange = (addrId) => {
    setSelectedAddressId(addrId);
    const chosen = savedAddresses.find(a => a._id === addrId);
    if (chosen) {
      setAddress({
        addressLabel: chosen.label || 'Home',
        houseNumber: '',
        street: chosen.street || '',
        locality: '',
        landmark: '',
        city: chosen.city || 'Lucknow',
        state: chosen.state || 'Uttar Pradesh',
        zipCode: chosen.zipCode || '226010',
        coordinates: chosen.coordinates || { lat: 0, lng: 0 }
      });
    }
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setErrorBanner('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setErrorBanner('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const geoRes = await locationAPI.reverseGeocode(lat, lng);
          const comp = geoRes?.addressComponents || {};
          setAddressMode('manual');
          setAddress(prev => ({
            ...prev,
            street: comp.road || comp.suburb || prev.street,
            locality: comp.suburb || comp.neighbourhood || prev.locality,
            city: comp.city || prev.city || 'Lucknow',
            state: comp.state || prev.state || 'Uttar Pradesh',
            zipCode: comp.postcode || prev.zipCode || '226010',
            coordinates: { lat, lng }
          }));
        } catch (err) {
          console.warn('Reverse geocode warning:', err);
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        setErrorBanner('Unable to retrieve your location: ' + err.message);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!serviceTitle.trim()) {
      setErrorBanner('Please select or specify a service.');
      return;
    }

    if (!address.street.trim() && !address.city.trim()) {
      setErrorBanner('Please provide your service location address.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorBanner('');

      const vendorUserId = vendor?.user?._id || vendor?.user?.id || vendor?._id;

      const payload = {
        vendorId: vendorUserId,
        serviceTitle,
        category: vendor?.categories?.[0]?.name || 'Home Services',
        serviceType,
        problemDescription: problemDescription.trim() || 'Direct booking requested by client.',
        urgency,
        scheduledDate,
        timeSlot,
        address: {
          ...address,
          address: formatFullAddress(address, { forceFull: true })
        },
        pricing: {
          amount: servicePrice || Number(vendor?.hourlyRate) || 500,
          isPaid: false
        }
      };

      const res = await bookingAPI.createDirectBooking(payload);

      if (res?.success) {
        setSuccessBooking(res.booking);
        if (onBookingSuccess) {
          onBookingSuccess(res.booking);
        }
      }
    } catch (err) {
      console.error('Direct booking error:', err);
      setErrorBanner(err.response?.data?.message || 'Failed to submit direct booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Direct Professional Booking</h3>
              <p className="text-xs text-slate-500">Book directly with this verified professional</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {successBooking ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Booking Request Sent</span>
                <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Booking Request Sent!</h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                  Your reservation reference is{' '}
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {successBooking.bookingReference}
                  </span>
                  . {vendor?.businessName || vendor?.user?.name} has been notified to accept your appointment window.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left max-w-md mx-auto space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Professional</span>
                  <span className="font-bold text-slate-900">{vendor?.businessName || vendor?.user?.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Service</span>
                  <span className="font-bold text-slate-900">{successBooking.serviceTitle}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Date & Slot</span>
                  <span className="font-bold text-slate-900">
                    {new Date(successBooking.scheduledDate).toLocaleDateString()} · {successBooking.timeSlot}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Status</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    Waiting for Response
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="primary"
                  size="md"
                  icon={ArrowRight}
                  onClick={() => {
                    onClose();
                    navigate('/customer/bookings');
                  }}
                >
                  View My Bookings
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={onClose}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorBanner && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorBanner}</span>
                </div>
              )}

              {/* Professional Profile Card Preview */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={vendor?.user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'}
                    alt={vendor?.businessName}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{vendor?.businessName}</h4>
                      <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                    </div>
                    <p className="text-xs text-slate-500 truncate">{vendor?.user?.name} · Verified Professional</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-slate-500 block">Starting Rate</span>
                  <span className="text-sm font-black text-emerald-800">
                    {formatCurrency(vendor?.hourlyRate || 500)}/hr
                  </span>
                </div>
              </div>

              {/* 1. Service Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Select Requested Service <span className="text-rose-500">*</span>
                </label>

                {(() => {
                  const servicesList = [];
                  if (preselectedService) {
                    servicesList.push({
                      title: preselectedService.title,
                      price: preselectedService.price || 0,
                      pricingType: preselectedService.pricingType || 'fixed',
                      duration: preselectedService.duration || '1 - 2 hours'
                    });
                  }
                  if (vendor?.services && vendor.services.length > 0) {
                    vendor.services.forEach(s => {
                      if (!servicesList.some(item => item.title.toLowerCase() === s.title.toLowerCase())) {
                        servicesList.push({
                          title: s.title,
                          price: s.price || 0,
                          pricingType: 'fixed',
                          duration: s.duration || '1 - 2 hours'
                        });
                      }
                    });
                  }

                  if (servicesList.length > 0) {
                    return (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {servicesList.map((srv, idx) => {
                            const isQuote = srv.pricingType === 'quote';
                            const isSelected = serviceTitle === srv.title;

                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setServiceTitle(srv.title);
                                  setServicePrice(srv.price || 0);
                                  setPricingType(srv.pricingType || 'fixed');
                                }}
                                className={`p-3 rounded-xl border text-left transition flex items-center justify-between gap-2.5 ${
                                  isSelected
                                    ? 'bg-emerald-50 border-emerald-700 shadow-2xs font-semibold'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 pr-1">
                                  <img
                                    src={getServiceImage(vendor?.category?.name || vendor?.category, srv.title)}
                                    alt=""
                                    className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-200"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs text-slate-900 truncate">{srv.title}</p>
                                    <span className="text-[10px] text-slate-500">
                                      {isQuote ? 'Quote Required' : srv.duration}
                                    </span>
                                  </div>
                                </div>
                                <span className="text-xs font-bold text-emerald-800 shrink-0">
                                  {isQuote ? 'On-Site Quote' : formatCurrency(srv.price)}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {pricingType === 'quote' && (
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <p>
                              <strong>Inspection Required:</strong> The final price for this service will be confirmed on-site after an assessment by your specialist before work commences.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <input
                      type="text"
                      value={serviceTitle}
                      onChange={(e) => setServiceTitle(e.target.value)}
                      placeholder="e.g. Electrical Short-Circuit Inspection"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-700"
                      required
                    />
                  );
                })()}
              </div>

              {/* Service Type & Urgency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Work Type</label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-700"
                  >
                    <option value="repair">Repair / Troubleshooting</option>
                    <option value="installation">New Installation / Replacement</option>
                    <option value="maintenance">Preventive Maintenance</option>
                    <option value="inspection">Comprehensive Inspection</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Urgency Level</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-700"
                  >
                    <option value="low">Standard (Within 2-3 Days)</option>
                    <option value="medium">Prompt (Tomorrow)</option>
                    <option value="high">Urgent (Within 6-12 Hours)</option>
                    <option value="emergency">⚡ Emergency (Immediate Dispatch)</option>
                  </select>
                </div>
              </div>

              {/* Problem Description */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Describe the Issue or Scope <span className="text-slate-400 font-normal">(Optional but recommended)</span>
                </label>
                <textarea
                  rows={3}
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="Describe observed symptoms, equipment brand, room location, or access instructions..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-700 leading-relaxed"
                />
              </div>

              {/* Schedule Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Preferred Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      value={scheduledDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-700"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Appointment Window <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-700"
                    >
                      <option value="09:00 AM - 12:00 PM">Morning (09:00 AM - 12:00 PM)</option>
                      <option value="12:00 PM - 03:00 PM">Afternoon (12:00 PM - 03:00 PM)</option>
                      <option value="03:00 PM - 06:00 PM">Evening (03:00 PM - 06:00 PM)</option>
                      <option value="Flexible Window">Flexible (Anytime during the day)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Location Selection */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Full Service Address <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    disabled={gpsLoading}
                    className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <LocateFixed className="w-3.5 h-3.5" />
                    <span>{gpsLoading ? 'Detecting...' : 'Use Current GPS'}</span>
                  </button>
                </div>

                {savedAddresses.length > 0 && (
                  <div className="flex items-center gap-3 text-xs mb-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="addrMode"
                        checked={addressMode === 'saved'}
                        onChange={() => setAddressMode('saved')}
                        className="text-emerald-700 focus:ring-emerald-700"
                      />
                      <span>Select Saved Address</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="addrMode"
                        checked={addressMode === 'manual'}
                        onChange={() => setAddressMode('manual')}
                        className="text-emerald-700 focus:ring-emerald-700"
                      />
                      <span>Enter Custom Address</span>
                    </label>
                  </div>
                )}

                {addressMode === 'saved' && savedAddresses.length > 0 ? (
                  <select
                    value={selectedAddressId}
                    onChange={(e) => handleSavedAddressChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-700"
                  >
                    {savedAddresses.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.label || 'Saved'} — {a.street}, {a.city}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="House / Flat / Floor (e.g. Flat 402, 4th Floor)"
                        value={address.houseNumber}
                        onChange={(e) => setAddress({ ...address, houseNumber: e.target.value })}
                        className="px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-700"
                      />
                      <input
                        type="text"
                        placeholder="Street / Colony / Road"
                        value={address.street}
                        onChange={(e) => setAddress({ ...address, street: e.target.value })}
                        className="px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-700"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Landmark (e.g. Near City Hospital)"
                        value={address.landmark}
                        onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                        className="px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-700"
                      />
                      <input
                        type="text"
                        placeholder="Locality / Area (e.g. Gomti Nagar)"
                        value={address.locality}
                        onChange={(e) => setAddress({ ...address, locality: e.target.value })}
                        className="px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-700"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="City"
                        value={address.city}
                        onChange={(e) => setAddress({ ...address, city: e.target.value })}
                        className="px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-700"
                        required
                      />
                      <input
                        type="text"
                        placeholder="State"
                        value={address.state}
                        onChange={(e) => setAddress({ ...address, state: e.target.value })}
                        className="px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-700"
                        required
                      />
                      <input
                        type="text"
                        placeholder="PIN Code"
                        value={address.zipCode}
                        onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                        className="px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-700"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Pricing & Payment Protection Summary */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Estimated Price</span>
                  <span className="font-bold text-slate-900">{formatCurrency(servicePrice || 500)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Convenience Fee</span>
                  <span className="font-bold text-emerald-700">₹0 (Free)</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-900">Total Price</span>
                  <span className="font-black text-emerald-800 text-base">
                    {formatCurrency(servicePrice || 500)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
                  🛡️ <strong>Payment Protected:</strong> Your payment is held securely and only released after the professional enters the Service Start OTP on arrival and you approve the completed work.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmitting}
                  className="shadow-sm"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Booking Request...</span>
                    </div>
                  ) : (
                    'Book Service Now'
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Loader2({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}
