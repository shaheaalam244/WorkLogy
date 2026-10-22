import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Users, ArrowRight, Tag } from 'lucide-react';
import { formatCurrency, formatRelativeTime, formatShortAddress } from '../../utils/formatters';
import { getServiceImage, resolveJobImage, getJobImage, handleImageFallback, FALLBACK_SERVICE_IMAGE } from '../../constants/serviceImages';

export default function JobCard({ job }) {
  const urgency = (job.urgency || 'medium').toLowerCase();
  const isEmergency = urgency === 'emergency';
  const isHigh = urgency === 'high';
  const isMedium = urgency === 'medium';

  const urgencyBadgeStyle = isEmergency
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : isHigh
    ? 'bg-amber-50 text-amber-800 border-amber-200'
    : isMedium
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-slate-100 text-slate-700 border-slate-200';

  const categoryName = job.category?.name || (typeof job.category === 'string' ? job.category : null);
  const locationText = formatShortAddress(job.location) || 'Lucknow, Uttar Pradesh';
  const budgetType = job.budget?.type === 'hourly' ? 'hourly' : 'fixed';
  const serviceImageUrl = getJobImage(job);

  return (
    <div className="bg-white border border-slate-200/90 hover:border-emerald-300 hover:shadow-md rounded-2xl overflow-hidden transition-all duration-200 flex flex-col justify-between h-full min-w-0 shadow-2xs group">
      <div>
        {/* Top 16:9 Service Image Container */}
        <div className="relative aspect-video w-full bg-slate-100 overflow-hidden border-b border-slate-100">
          <img
            src={serviceImageUrl}
            alt={job.title || 'Service Image'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => handleImageFallback(e, FALLBACK_SERVICE_IMAGE)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shadow-2xs backdrop-blur-xs ${urgencyBadgeStyle}`}>
              {job.urgency || 'Medium'} Urgency
            </span>
          </div>
          {categoryName && (
            <div className="absolute bottom-2.5 left-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-white/95 text-slate-800 shadow-2xs backdrop-blur-xs truncate max-w-[200px]">
                <Tag className="w-2.5 h-2.5 text-emerald-700 shrink-0" />
                <span className="truncate">{categoryName}</span>
              </span>
            </div>
          )}
        </div>

        <div className="p-5 sm:p-6 pb-2">
          {/* Header Strip: Relative Time */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3 text-slate-400" />
              {formatRelativeTime(job.createdAt)}
            </span>
          </div>

        {/* Job Title (wraps up to 2 lines cleanly) */}
        <h3 className="font-bold text-slate-900 text-base sm:text-[17px] group-hover:text-emerald-800 transition-colors mb-2 line-clamp-2 leading-snug break-words">
          <Link 
            to={`/jobs/${job._id}`}
            className="hover:underline focus:outline-none focus:text-emerald-800"
            title={job.title}
          >
            {job.title}
          </Link>
        </h3>

        {/* Job Description (clamped to 3 lines) */}
        <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed mb-4 flex-1 break-words">
          {job.description || 'Full details and requirements available upon viewing the job.'}
        </p>

        {/* Metadata Strip: Location & Proposal Count */}
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-2 bg-slate-50/80 p-2.5 sm:p-3 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-1.5 truncate" title={locationText}>
            <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="truncate font-medium">{locationText}</span>
          </div>
          <div className="flex items-center gap-1.5 justify-end text-slate-500 font-medium">
            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{job.applicantsCount || 0} offers</span>
          </div>
        </div>
      </div>
      </div>

      {/* Footer Area: Budget & View Job Action */}
      <div className="mt-auto px-5 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">
            Your Budget
          </span>
          <div className="flex items-baseline gap-1 truncate">
            <span className="text-base sm:text-lg font-black text-emerald-800 tracking-tight">
              {formatCurrency(job.budget?.amount || 0)}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              /{budgetType}
            </span>
          </div>
        </div>

        <Link 
          to={`/jobs/${job._id}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-all shadow-2xs hover:shadow-xs focus:ring-2 focus:ring-emerald-700 focus:outline-none shrink-0"
          aria-label={`View job ${job.title}`}
        >
          <span>View Job</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
