import React from 'react';
import { Link } from 'react-router-dom';
import { Star, CheckCircle } from 'lucide-react';
import VerifiedBadge from '../vendor/VerifiedBadge';
import Button from '../common/Button';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';
import { getServiceImage } from '../../constants/serviceImages';

export default function VendorCard({ vendor, onBookDirect }) {
  const { user } = useAuth();
  const experienceYears = vendor.experienceYears || vendor.yearsOfExperience || 1;
  const completedJobs = vendor.completedJobsCount || 0;
  const city = vendor.city || vendor.serviceArea?.city || (vendor.serviceAreas?.[0]?.city) || 'Lucknow';

  return (
    <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <img
              src={vendor.user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'}
              alt={vendor.businessName}
              className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200 group-hover:border-emerald-600 transition shadow-2xs"
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-emerald-800 transition-colors truncate">
                {vendor.businessName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {vendor.user?.name || 'Service Professional'} · {city}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <VerifiedBadge status={vendor.verifiedBadge?.status || 'not_submitted'} size="xs" />
          </div>
        </div>

        <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
          {vendor.tagline || vendor.bio || 'Specialized in repairs, installations, and maintenance.'}
        </p>

        {/* Badges / Meta */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mb-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-1 text-amber-600 font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>{(vendor.rating || 5.0).toFixed(1)}</span>
            <span className="text-slate-400 font-normal">({vendor.reviewCount || 0})</span>
          </div>

          <div className="flex items-center gap-1 text-slate-700">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
            <span>{completedJobs} completed</span>
          </div>

          <div className="text-slate-500 text-[11px]">
            {experienceYears} yr{experienceYears === 1 ? '' : 's'} exp
          </div>

          <div className="ml-auto text-emerald-800 font-black text-sm">
            {formatCurrency(vendor.hourlyRate || 65)}<span className="text-[10px] text-slate-500 font-normal">/hr</span>
          </div>
        </div>

        {/* Services Chips */}
        {vendor.services && vendor.services.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {vendor.services.slice(0, 2).map((srv, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 text-slate-700 border border-slate-200 truncate max-w-[150px]">
                <img
                  src={getServiceImage(vendor.category?.name || vendor.category, srv.title)}
                  alt=""
                  className="w-3 h-3 rounded-full object-cover shrink-0"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span className="truncate">{srv.title}</span>
              </span>
            ))}
            {vendor.services.length > 2 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] text-slate-400">
                +{vendor.services.length - 2} more
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <Link to={`/professionals/${vendor._id}`} className={isVendor ? 'w-full' : 'flex-1'}>
          <Button variant="secondary" size="sm" className="w-full">
            View Profile
          </Button>
        </Link>
        {!isVendor && (
          onBookDirect ? (
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => onBookDirect(vendor)}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold"
            >
              Book Now
            </Button>
          ) : (
            <Link to={`/customer/explore?vendorId=${vendor._id}`}>
              <Button variant="primary" size="sm">
                Book Now
              </Button>
            </Link>
          )
        )}
      </div>
    </div>
  );
}
