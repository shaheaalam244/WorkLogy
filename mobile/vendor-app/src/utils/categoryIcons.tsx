import React from 'react';
import { MaterialCommunityIcons, Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export interface CategoryVisual {
  iconName: string;
  iconFamily: 'MaterialCommunityIcons' | 'Ionicons' | 'FontAwesome5' | 'Feather';
  bgColor: string;
  color: string;
  displayName: string;
}

/**
 * Mapping of canonical service category slugs and Lucide names to native vector icons.
 * Guarantees that no icon name is ever rendered as raw text.
 */
export const CATEGORY_ICON_MAP: Record<string, CategoryVisual> = {
  // Electrical
  'electrical-services': {
    iconName: 'lightning-bolt',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#FEF3C7',
    color: '#D97706',
    displayName: 'Electrical'
  },
  'zap': {
    iconName: 'lightning-bolt',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#FEF3C7',
    color: '#D97706',
    displayName: 'Electrical'
  },

  // Plumbing
  'plumbing-services': {
    iconName: 'water',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#E0F2FE',
    color: '#0284C7',
    displayName: 'Plumbing'
  },
  'droplets': {
    iconName: 'water',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#E0F2FE',
    color: '#0284C7',
    displayName: 'Plumbing'
  },

  // AC & HVAC
  'ac-hvac-services': {
    iconName: 'air-conditioner',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#E0E7FF',
    color: '#4F46E5',
    displayName: 'AC & HVAC'
  },
  'wind': {
    iconName: 'weather-windy',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#E0E7FF',
    color: '#4F46E5',
    displayName: 'AC & HVAC'
  },

  // Appliance Repair
  'appliance-repair': {
    iconName: 'tools',
    iconFamily: 'FontAwesome5',
    bgColor: '#FEE2E2',
    color: '#DC2626',
    displayName: 'Appliance Repair'
  },
  'wrench': {
    iconName: 'wrench',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#FEE2E2',
    color: '#DC2626',
    displayName: 'Appliance Repair'
  },

  // Carpentry
  'carpentry-furniture': {
    iconName: 'hammer',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#FEF3C7',
    color: '#B45309',
    displayName: 'Carpentry'
  },
  'hammer': {
    iconName: 'hammer',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#FEF3C7',
    color: '#B45309',
    displayName: 'Carpentry'
  },

  // Cleaning
  'home-cleaning': {
    iconName: 'broom',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#DCFCE7',
    color: '#16A34A',
    displayName: 'Home Cleaning'
  },
  'sparkles': {
    iconName: 'sparkles',
    iconFamily: 'Ionicons',
    bgColor: '#DCFCE7',
    color: '#16A34A',
    displayName: 'Home Cleaning'
  },

  // Painting
  'painting-services': {
    iconName: 'format-paint',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#F3E8FF',
    color: '#9333EA',
    displayName: 'Painting'
  },
  'paint-roller': {
    iconName: 'format-paint',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#F3E8FF',
    color: '#9333EA',
    displayName: 'Painting'
  },

  // Pest Control
  'pest-control': {
    iconName: 'bug',
    iconFamily: 'FontAwesome5',
    bgColor: '#FFEDD5',
    color: '#EA580C',
    displayName: 'Pest Control'
  },
  'shield-alert': {
    iconName: 'shield-alert',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#FFEDD5',
    color: '#EA580C',
    displayName: 'Pest Control'
  },

  // Locksmith
  'locksmith-services': {
    iconName: 'lock-open-variant',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#F1F5F9',
    color: '#475569',
    displayName: 'Locksmith'
  },
  'lock': {
    iconName: 'lock',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#F1F5F9',
    color: '#475569',
    displayName: 'Locksmith'
  },

  // RO & Water Purifier
  'water-purifier-ro': {
    iconName: 'cup-water',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#CCFBF1',
    color: '#0D9488',
    displayName: 'RO Water'
  },

  // CCTV & Security
  'cctv-security-systems': {
    iconName: 'cctv',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#F1F5F9',
    color: '#334155',
    displayName: 'CCTV & Security'
  },
  'camera': {
    iconName: 'video',
    iconFamily: 'Feather',
    bgColor: '#F1F5F9',
    color: '#334155',
    displayName: 'CCTV & Security'
  },

  // Solar
  'solar-panel-services': {
    iconName: 'solar-power',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#FEF9C3',
    color: '#CA8A04',
    displayName: 'Solar Panels'
  },

  // Packers & Movers
  'packers-movers': {
    iconName: 'truck-fast',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#E0E7FF',
    color: '#3730A3',
    displayName: 'Packers & Movers'
  },
  'truck': {
    iconName: 'truck',
    iconFamily: 'Feather',
    bgColor: '#E0E7FF',
    color: '#3730A3',
    displayName: 'Packers & Movers'
  },

  // Geyser & Heating
  'geyser-water-heater': {
    iconName: 'water-boiler',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#FFE4E6',
    color: '#E11D48',
    displayName: 'Water Heater'
  },
  'flame': {
    iconName: 'fire',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#FFE4E6',
    color: '#E11D48',
    displayName: 'Water Heater'
  },

  // Tiling & Flooring
  'tiling-flooring': {
    iconName: 'view-grid-plus',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#E2E8F0',
    color: '#475569',
    displayName: 'Tiling & Flooring'
  },

  // Construction
  'masonry-construction': {
    iconName: 'home-city',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#FEF3C7',
    color: '#92400E',
    displayName: 'Construction'
  },

  // Gardening
  'gardening-landscaping': {
    iconName: 'tree',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#DCFCE7',
    color: '#15803D',
    displayName: 'Gardening'
  },

  // Salon & Grooming
  'salon-grooming-at-home': {
    iconName: 'content-cut',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#FCE7F3',
    color: '#DB2777',
    displayName: 'Home Salon'
  },
  'scissors': {
    iconName: 'content-cut',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#FCE7F3',
    color: '#DB2777',
    displayName: 'Home Salon'
  },

  // Internet & Networking
  'internet-networking': {
    iconName: 'wifi',
    iconFamily: 'Feather',
    bgColor: '#E0F2FE',
    color: '#0369A1',
    displayName: 'Networking'
  },

  // Computer & Laptop Repair
  'computer-laptop-repair': {
    iconName: 'laptop',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#F1F5F9',
    color: '#1E293B',
    displayName: 'Laptop Repair'
  },

  // Laundry
  'laundry-dry-cleaning': {
    iconName: 'washing-machine',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#DBEAFE',
    color: '#1D4ED8',
    displayName: 'Laundry'
  },

  // Interior Design
  'interior-design-decor': {
    iconName: 'sofa',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#EDE9FE',
    color: '#6D28D9',
    displayName: 'Interior Design'
  },

  // Driver & Chauffeur
  'driver-chauffeur-services': {
    iconName: 'car',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#F8FAFC',
    color: '#334155',
    displayName: 'Chauffeur'
  },

  // Waterproofing
  'waterproofing-solutions': {
    iconName: 'water-percent',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#E0F2FE',
    color: '#0284C7',
    displayName: 'Waterproofing'
  },

  // Glass & Aluminium
  'glass-aluminium-works': {
    iconName: 'door-sliding',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#F1F5F9',
    color: '#64748B',
    displayName: 'Glass & Doors'
  },

  // TV & Electronics
  'tv-home-electronics': {
    iconName: 'television',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#FEE2E2',
    color: '#B91C1C',
    displayName: 'TV & Sound'
  },

  // Curtains & Blinds
  'curtains-blinds-installation': {
    iconName: 'blinds',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#FEF3C7',
    color: '#D97706',
    displayName: 'Curtains & Blinds'
  },

  // Vehicle Mechanic
  'vehicle-mechanic-services': {
    iconName: 'car-wrench',
    iconFamily: 'MaterialCommunityIcons',
    bgColor: '#FFE4E6',
    color: '#BE123C',
    displayName: 'Vehicle Mechanic'
  },

  // Event Photography
  'event-photography-videography': {
    iconName: 'camera',
    iconFamily: 'Feather',
    bgColor: '#F3E8FF',
    color: '#7E22CE',
    displayName: 'Photography'
  }
};

export const DEFAULT_CATEGORY_VISUAL: CategoryVisual = {
  iconName: 'toolbox',
  iconFamily: 'MaterialCommunityIcons',
  bgColor: '#F1F5F9',
  color: COLORS.primary,
  displayName: 'Home Service'
};

/**
 * Returns the proper vector icon definition for any category slug or icon name.
 */
export function getCategoryVisual(slugOrIcon?: string): CategoryVisual {
  if (!slugOrIcon) return DEFAULT_CATEGORY_VISUAL;
  const key = slugOrIcon.toLowerCase().trim();
  return CATEGORY_ICON_MAP[key] || DEFAULT_CATEGORY_VISUAL;
}

/**
 * Renders the actual vector icon component for a category.
 */
export function renderCategoryIcon(slugOrIcon?: string, size: number = 24, customColor?: string) {
  const visual = getCategoryVisual(slugOrIcon);
  const color = customColor || visual.color;

  switch (visual.iconFamily) {
    case 'MaterialCommunityIcons':
      return <MaterialCommunityIcons name={visual.iconName as any} size={size} color={color} />;
    case 'Ionicons':
      return <Ionicons name={visual.iconName as any} size={size} color={color} />;
    case 'FontAwesome5':
      return <FontAwesome5 name={visual.iconName as any} size={size} color={color} />;
    case 'Feather':
      return <Feather name={visual.iconName as any} size={size} color={color} />;
    default:
      return <MaterialCommunityIcons name="toolbox" size={size} color={color} />;
  }
}
