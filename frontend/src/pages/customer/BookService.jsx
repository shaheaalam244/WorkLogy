import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Wrench,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Tag,
  ArrowRight,
  ArrowLeft,
  Lock,
  DollarSign,
  Sparkles,
  LocateFixed,
  FileText,
  UserCheck,
  Check,
  Plus
} from 'lucide-react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { bookingAPI } from '../../api/booking.api';
import { vendorAPI } from '../../api/vendor.api';
import { customerAPI } from '../../api/customer.api';
import { locationAPI } from '../../api/location.api';
import { formatCurrency, formatFullAddress } from '../../utils/formatters';
import { getServiceImage } from '../../constants/serviceImages';
import { useAuth } from '../../hooks/useAuth';

export default function BookService() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const vendorIdParam = searchParams.get('vendorId');
  const serviceParam = searchParams.get('service');
  const categoryParam = searchParams.get('category');
  const priceParam = searchParams.get('price');

  // Vendor state
  const [vendor, setVendor] = useState(null);
  const [loadingVendor, setLoadingVendor] = useState(false);

  // Address state
  const [savedAddresses, setSavedAddresses] = useState([]);
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
  const [gpsLoading, setGpsLoading] = useState(false);

  // Booking details state
  const [serviceTitle, setServiceTitle] = useState(serviceParam || 'General Repair & Diagnostic');
  const [category, setCategory] = useState(categoryParam || 'Home Services');
  const [serviceType, setServiceType] = useState('repair');
  const [problemDescription, setProblemDescription] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date(Date.now() + 86400000);
    return d.toISOString().split('T')[0];
  });
  const [timeSlot, setTimeSlot] = useState('10:00 AM - 01:00 PM');
  const [paymentMethod, setPaymentMethod] = useState('escrow_upi');

  // Pricing & Coupon state
  const baseRate = Number(priceParam) || Number(vendor?.hourlyRate) || 499;
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponMessage, setCouponMessage] = useState(null);

  // Submission & Confirmation state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Load Vendor Data if vendorIdParam present
  useEffect(() => {
    if (!vendorIdParam) return;
    const fetchVendor = async () => {
      try {
        setLoadingVendor(true);
        const res = await vendorAPI.getById(vendorIdParam);
        if (res?.success && res.vendor) {
          setVendor(res.vendor);
          if (!categoryParam && res.vendor.category?.name) {
            setCategory(res.vendor.category.name);
          }
        }
      } catch (err) {
        console.warn('Could not fetch vendor profile for booking:', err);
      } finally {
        setLoadingVendor(false);
      }
    };
    fetchVendor();
  }, [vendorIdParam, categoryParam]);

  // Load Customer Addresses
  useEffect(() => {
    const fetchCustomerProfile = async () => {
      try {
        const res = await customerAPI.getProfile();
        if (res?.profile?.addresses?.length) {
          const addrs = res.profile.addresses;
          setSavedAddresses(addrs);
          const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
          setSelectedAddressId(defaultAddr._id);
          setAddress({
            addressLabel: defaultAddr.label || 'Home',
            houseNumber: '',
            street: defaultAddr.street || '',
            locality: '',
            landmark: '',
            city: defaultAddr.city || 'Lucknow',
            state: defaultAddr.state || 'Uttar Pradesh',
            zipCode: defaultAddr.zipCode || '226010',
            coordinates: defaultAddr.coordinates || { lat: 0, lng: 0 }
          });
        } else {
          setAddressMode('manual');
        }
      } catch (err) {
        setAddressMode('manual');
      }
    };
    fetchCustomerProfile();
  }, []);

  // Handle saved address switch
  const handleSelectSavedAddress = (id) => {
    setSelectedAddressId(id);
    const chosen = savedAddresses.find((a) => a._id === id);
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

  // Detect GPS
  const handleAutoDetectGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await locationAPI.reverseGeocode(latitude, longitude);
          if (res?.success) {
            setAddress((prev) => ({
              ...prev,
              street: res.address?.street || prev.street,
              city: res.address?.city || prev.city,
              state: res.address?.state || prev.state,
              zipCode: res.address?.zipCode || prev.zipCode,
              coordinates: { lat: latitude, lng: longitude }
            }));
          }
        } catch {
          // Fallback coords
          setAddress((prev) => ({
            ...prev,
            coordinates: { lat: pos.coords.latitude, lng: pos.coords.longitude }
          }));
        } finally {
          setGpsLoading(false);
        }
      },
      () => {
        setGpsLoading(false);
        alert('Could not retrieve GPS location. Please type your address manually.');
      },
      { timeout: 8000 }
    );
  };

  // Coupon handling
  const handleApplyCoupon = (e) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (code === 'FIRST50') {
      setDiscountAmount(50);
      setCouponMessage({ type: 'success', text: '₹50 welcome discount applied!' });
    } else if (code === 'WORKLOGY100') {
      setDiscountAmount(100);
      setCouponMessage({ type: 'success', text: '₹100 festive savings applied!' });
    } else {
      setDiscountAmount(0);
      setCouponMessage({ type: 'error', text: 'Invalid coupon code. Try FIRST50' });
    }
  };

  // Calculations
  const platformFee = Math.round(baseRate * 0.05);
  const totalAmount = Math.max(0, baseRate + platformFee - discountAmount);

  // Submit Booking
  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submit

    setErrorBanner('');

    if (!problemDescription.trim()) {
      setErrorBanner('Please describe the problem or work required.');
      return;
    }

    if (addressMode === 'manual' && (!address.street.trim() || !address.city.trim())) {
      setErrorBanner('Please provide your complete street address and city.');
      return;
    }

    // Require target vendor
    const targetVendorId = vendorIdParam || vendor?._id || vendor?.user?._id;
    if (!targetVendorId) {
      setErrorBanner('Please select a verified service professional to proceed.');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        vendorId: targetVendorId,
        serviceTitle: serviceTitle.trim(),
        category: category.trim(),
        serviceType,
        problemDescription: problemDescription.trim(),
        urgency,
        scheduledDate: new Date(scheduledDate),
        timeSlot,
        address: {
          ...address,
          addressLabel: address.addressLabel || 'Service Address'
        },
        pricing: {
          amount: totalAmount,
          baseRate,
          platformFee,
          discountAmount,
          paymentMethod: 'escrow'
        }
      };

      const res = await bookingAPI.createDirectBooking(payload);
      if (res?.success && res.booking) {
        setConfirmedBooking(res.booking);
      } else {
        setErrorBanner(res?.message || 'Could not place booking. Please check details.');
      }
    } catch (err) {
      console.error('Booking submission error:', err);
      setErrorBanner(err.response?.data?.message || 'Booking request failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If confirmed, render receipt screen
  if (confirmedBooking) {
    return (
      <div className="bg-[#F7F9FC] min-h-[85vh] py-12 px-4 sm:px-6">
        <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm text-center space-y-6 animate-in zoom-in-95 duration-200">
          
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-[#06684F] flex items-center justify-center mx-auto shadow-2xs">
            <CheckCircle2 className="w-10 h-10 stroke-[2.2]" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#06684F] block">
              Booking Confirmed
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] mt-1">
              Your Service is Booked!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Booking Reference: <strong className="text-slate-900 font-mono">{confirmedBooking.bookingReference}</strong>
            </p>
          </div>

          {/* Booking Summary Box */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500">Service:</span>
              <strong className="text-slate-900 font-bold">{confirmedBooking.serviceTitle}</strong>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500">Scheduled Time:</span>
              <span className="text-slate-800 font-semibold">
                {new Date(confirmedBooking.scheduledDate).toLocaleDateString()} · {confirmedBooking.timeSlot}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500">Service Address:</span>
              <span className="text-slate-800 font-semibold truncate max-w-[220px]">
                {formatFullAddress(confirmedBooking.address)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-700 font-bold">Escrow Total:</span>
              <span className="text-base font-black text-[#06684F]">
                {formatCurrency(confirmedBooking.pricing?.amount || totalAmount)}
              </span>
            </div>
          </div>

          {/* Security Notice */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-emerald-900 flex items-center gap-2 text-left">
            <ShieldCheck className="w-5 h-5 text-[#06684F] shrink-0" />
            <span>Escrow is locked. Your specialist will receive payment only after you inspect and sign off on completion.</span>
          </div>

          {/* Action CTAs */}
          <div className="space-y-3 pt-2">
            <Link
              to={`/customer/tracking?bookingId=${confirmedBooking._id}`}
              className="w-full py-3 bg-[#06684F] hover:bg-[#055742] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2"
            >
              <span>Track Booking Progress</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/customer/bookings"
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition block"
            >
              View All My Bookings
            </Link>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F7F9FC] min-h-screen py-8 lg:py-12 text-[#111827]">
      <div className="page-container max-w-4xl">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-4">
          <Link to="/" className="hover:text-slate-900">Home</Link>
          <span>/</span>
          <Link to="/categories" className="hover:text-slate-900">Services</Link>
          <span>/</span>
          <span className="text-[#06684F] font-bold">Schedule Booking</span>
        </div>

        {/* Page Header */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#06684F] block">
                Instant Doorstep Service
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight mt-1">
                Book a Verified Professional
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Zero advance risk. Fixed upfront pricing with protected escrow release.
              </p>
            </div>

            {vendor && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 shrink-0">
                <img
                  src={vendor.user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80'}
                  alt={vendor.businessName}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                />
                <div>
                  <h3 className="font-bold text-xs text-slate-900 leading-snug">{vendor.businessName}</h3>
                  <p className="text-[11px] text-slate-500">{vendor.tagline || 'Verified Specialist'}</p>
                  <p className="text-xs font-black text-[#06684F] mt-0.5">{formatCurrency(baseRate)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {errorBanner && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span className="font-medium">{errorBanner}</span>
          </div>
        )}

        <form onSubmit={handleConfirmBooking} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Cols: Form Steps */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Step 1: Service Details */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-emerald-50 text-[#06684F] font-bold text-xs flex items-center justify-center">1</div>
                <h2 className="font-bold text-base text-slate-900">Service & Problem Details</h2>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Service Title *</label>
                <input
                  type="text"
                  required
                  value={serviceTitle}
                  onChange={(e) => setServiceTitle(e.target.value)}
                  placeholder="E.g. AC Deep Servicing & Filter Cleaning"
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#06684F]/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Service Nature</label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#06684F]/20"
                  >
                    <option value="repair">Repair & Troubleshooting</option>
                    <option value="installation">New Installation</option>
                    <option value="maintenance">Periodic Maintenance</option>
                    <option value="inspection">Diagnostic / Inspection Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Urgency Level</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#06684F]/20"
                  >
                    <option value="medium">Standard (Within 24 Hours)</option>
                    <option value="high">High Priority (Today)</option>
                    <option value="emergency">Emergency (Immediate Dispatch)</option>
                    <option value="low">Flexible</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Describe the Issue *</label>
                <textarea
                  rows={3}
                  required
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="Explain symptoms, brand or model, specific floor or room, and any tools/parts already available..."
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#06684F]/20 leading-relaxed"
                />
              </div>
            </div>

            {/* Step 2: Address Selection */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-emerald-50 text-[#06684F] font-bold text-xs flex items-center justify-center">2</div>
                  <h2 className="font-bold text-base text-slate-900">Service Location</h2>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  {savedAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAddressMode('saved')}
                      className={`px-3 py-1 rounded-lg font-semibold transition ${
                        addressMode === 'saved' ? 'bg-[#06684F] text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Saved Addresses
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setAddressMode('manual')}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      addressMode === 'manual' ? 'bg-[#06684F] text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Enter Address
                  </button>
                </div>
              </div>

              {addressMode === 'saved' && savedAddresses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {savedAddresses.map((addr) => (
                    <div
                      key={addr._id}
                      onClick={() => handleSelectSavedAddress(addr._id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                        selectedAddressId === addr._id
                          ? 'border-[#06684F] bg-emerald-50/50 ring-2 ring-[#06684F]/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900">{addr.label || 'Saved Location'}</span>
                        {selectedAddressId === addr._id && (
                          <CheckCircle2 className="w-4 h-4 text-[#06684F]" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2">
                        {addr.street}, {addr.city} {addr.zipCode}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Provide full delivery/service address:</span>
                    <button
                      type="button"
                      onClick={handleAutoDetectGPS}
                      disabled={gpsLoading}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#06684F] hover:underline"
                    >
                      <LocateFixed className="w-3.5 h-3.5" />
                      <span>{gpsLoading ? 'Detecting GPS...' : 'Auto-detect GPS'}</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">House / Flat / Street Address *</label>
                    <input
                      type="text"
                      required={addressMode === 'manual'}
                      value={address.street}
                      onChange={(e) => setAddress({ ...address, street: e.target.value })}
                      placeholder="E.g. Flat 402, Royal Residency, Gomti Nagar"
                      className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#06684F]/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">City *</label>
                      <input
                        type="text"
                        required
                        value={address.city}
                        onChange={(e) => setAddress({ ...address, city: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#06684F]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Pincode *</label>
                      <input
                        type="text"
                        required
                        value={address.zipCode}
                        onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#06684F]/20"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Landmark</label>
                      <input
                        type="text"
                        value={address.landmark}
                        onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                        placeholder="Near Metro Gate"
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#06684F]/20"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Date & Slot */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-emerald-50 text-[#06684F] font-bold text-xs flex items-center justify-center">3</div>
                <h2 className="font-bold text-base text-slate-900">Preferred Date & Time Slot</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#06684F]/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Slot Window *</label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#06684F]/20"
                  >
                    <option value="09:00 AM - 12:00 PM">Morning (09:00 AM - 12:00 PM)</option>
                    <option value="12:00 PM - 03:00 PM">Afternoon (12:00 PM - 03:00 PM)</option>
                    <option value="03:00 PM - 06:00 PM">Evening (03:00 PM - 06:00 PM)</option>
                    <option value="06:00 PM - 09:00 PM">Late Evening (06:00 PM - 09:00 PM)</option>
                  </select>
                </div>
              </div>
            </div>

          </div>

          {/* Right Col: Price Breakdown & Escrow Confirmation */}
          <div className="space-y-6">
            
            {/* Price Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-base text-slate-900 pb-2 border-b border-slate-100">
                Payment Summary
              </h3>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Standard Service Charge</span>
                  <span className="font-bold text-slate-900">{formatCurrency(baseRate)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Platform Escrow Protection Fee</span>
                  <span className="font-bold text-slate-900">{formatCurrency(platformFee)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-[#06684F] font-bold">
                    <span>Promotional Discount</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm">
                  <span className="font-extrabold text-slate-900">Total Payable</span>
                  <span className="text-xl font-black text-[#06684F]">{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              {/* Coupon Box */}
              <div className="pt-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Coupon code (FIRST50)"
                    className="flex-1 text-xs uppercase bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#06684F]/20"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
                  >
                    Apply
                  </button>
                </div>
                {couponMessage && (
                  <p className={`text-[11px] mt-1.5 font-medium ${couponMessage.type === 'success' ? 'text-[#06684F]' : 'text-rose-600'}`}>
                    {couponMessage.text}
                  </p>
                )}
              </div>

              {/* Payment Method Selector */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Payment Method</label>
                <div className="space-y-2">
                  {[
                    { id: 'escrow_upi', label: 'UPI / QR / Instant Bank', sub: 'Instant escrow lock via UPI' },
                    { id: 'escrow_card', label: 'Credit or Debit Card', sub: 'Visa, Mastercard, RuPay' },
                    { id: 'pay_on_completion', label: 'Pay On Work Sign-Off', sub: 'Inspect on site before paying' }
                  ].map((m) => (
                    <label
                      key={m.id}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                        paymentMethod === m.id ? 'border-[#06684F] bg-emerald-50/40 ring-1 ring-[#06684F]' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payMethod"
                        value={m.id}
                        checked={paymentMethod === m.id}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="mt-0.5 text-[#06684F] focus:ring-[#06684F]"
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-slate-900 block">{m.label}</span>
                        <span className="text-[10px] text-slate-500 block">{m.sub}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full bg-[#06684F] hover:bg-[#055742] text-white font-bold shadow-sm"
                >
                  {isSubmitting ? 'Confirming Booking...' : `Confirm & Lock Escrow · ${formatCurrency(totalAmount)}`}
                </Button>
                <p className="text-[10px] text-slate-500 text-center mt-2 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3 text-[#06684F]" />
                  <span>256-bit bank encryption · Zero advance payment risk</span>
                </p>
              </div>

            </div>

            {/* Platform Guarantees Box */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs space-y-2.5 shadow-xs">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                WorkLogy Promise
              </h4>
              <ul className="space-y-1.5 text-[11px] text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#06684F]" />
                  <span>Background checked & trade certified specialists</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#06684F]" />
                  <span>Free cancellation up to 2 hours before appointment</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#06684F]" />
                  <span>Dedicated dispute resolution & re-work guarantee</span>
                </li>
              </ul>
            </div>

          </div>

        </form>

      </div>
    </div>
  );
}
