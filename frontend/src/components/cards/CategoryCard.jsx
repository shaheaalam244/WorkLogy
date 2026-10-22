import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, 
  Droplets, 
  Wind, 
  Cpu, 
  Hammer, 
  Sparkles, 
  Paintbrush, 
  Bug, 
  KeyRound, 
  Key,
  Car, 
  Truck, 
  HardHat, 
  Building2,
  Layers, 
  Shield, 
  Sprout, 
  TreePine,
  Shirt, 
  Scissors, 
  Laptop, 
  Camera, 
  Router, 
  Wifi,
  Gauge, 
  Flame, 
  Sun, 
  Home, 
  PanelTop, 
  Maximize2, 
  CheckSquare, 
  CarFront, 
  Video, 
  Wrench,
  ArrowRight
} from 'lucide-react';
import { getCategoryMedia, handleImageFallback } from '../../utils/categoryMedia';

const iconMap = {
  Zap,
  Droplets,
  Wind,
  Cpu,
  Hammer,
  Sparkles,
  Paintbrush,
  Bug,
  KeyRound,
  Key: KeyRound,
  Car,
  Truck,
  HardHat,
  Building2: HardHat,
  Layers,
  Shield,
  Sprout,
  TreePine: Sprout,
  Shirt,
  Scissors,
  Laptop,
  Camera,
  Router,
  Wifi: Router,
  Gauge,
  Flame,
  Sun,
  Home,
  PanelTop,
  Maximize2,
  CheckSquare,
  CarFront,
  Video,
  Wrench
};

export default function CategoryCard({ category, showServiceCount = true, to }) {
  const IconComponent = iconMap[category?.icon] || Wrench;
  const subCount = Array.isArray(category?.subcategories) ? category.subcategories.length : 6;
  const { image, alt } = getCategoryMedia(category);
  const targetUrl = to || `/categories/${encodeURIComponent(category?.slug || category?.id || '')}`;

  return (
    <Link 
      to={targetUrl}
      className="bg-white border border-slate-200 hover:border-[#06684F] hover:shadow-md rounded-2xl overflow-hidden group transition-all duration-200 flex flex-col justify-between h-[270px] sm:h-[300px] min-w-0 focus:outline-none focus:ring-2 focus:ring-[#06684F] focus:ring-offset-2"
      aria-label={`Explore ${category?.name} professionals and services`}
    >
      {/* 1. 16:9 Landscape Image Header */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100 shrink-0">
        <img
          src={image}
          alt={alt}
          loading="lazy"
          onError={handleImageFallback}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
        />

        {/* Gradient Overlay for subtle contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none opacity-60 group-hover:opacity-40 transition-opacity" />

        {/* Floating Category Icon */}
        <div className="absolute bottom-2 left-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/95 backdrop-blur-xs text-[#06684F] shadow-sm flex items-center justify-center transition-transform group-hover:scale-110">
          <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>

        {/* Real Service Count Badge */}
        {showServiceCount && (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-white/95 backdrop-blur-xs text-[9px] sm:text-[10px] font-bold text-slate-700 shadow-2xs border border-white/60">
            {subCount} Services
          </div>
        )}
      </div>

      {/* 2. Card Content (Title & Description) */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Category Title */}
          <h3 
            className="font-bold text-[#111827] text-xs sm:text-sm group-hover:text-[#06684F] transition-colors leading-snug line-clamp-1"
            title={category?.name}
          >
            {category?.name}
          </h3>

          {/* Short Description */}
          <p className="text-[10px] sm:text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
            {category?.description || 'Find verified local trade professionals and licensed specialists.'}
          </p>
        </div>

        {/* 3. Bottom Action: Explore / Find Professionals */}
        <div className="pt-2 sm:pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-semibold text-[#06684F] group-hover:text-[#055742] transition-colors">
          <span>Explore Services</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}
