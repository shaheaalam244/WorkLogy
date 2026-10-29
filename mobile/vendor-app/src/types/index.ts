export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'vendor' | 'admin';
  avatar?: string;
  isVerified?: boolean;
  status?: string;
  createdAt: string;
}

export interface ServiceCategory {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  subcategories: Array<{
    name: string;
    description?: string;
    basePrice?: number;
    priceUnit?: string;
  }>;
}

export interface ServiceAddress {
  addressLabel?: string;
  address?: string;
  houseNumber?: string;
  street: string;
  locality?: string;
  city: string;
  state?: string;
  pincode?: string;
  zipCode?: string;
  landmark?: string;
  locationAccuracyMeters?: number | null;
  coordinates?: {
    lat?: number;
    lng?: number;
  };
}

export interface Job {
  _id: string;
  customer: string | User | any;
  category: string | ServiceCategory | any;
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency' | 'normal';
  isEmergency?: boolean;
  status: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'dispatching';
  address?: ServiceAddress;
  location?: {
    addressLabel?: string;
    houseNumber?: string;
    street?: string;
    locality?: string;
    landmark?: string;
    address?: string;
    city: string;
    state?: string;
    zipCode?: string;
    isMaskedForPrivacy?: boolean;
    locationSource?: string;
    locationAccuracyMeters?: number | null;
    coordinates?: {
      lat?: number;
      lng?: number;
    };
  };
  accessInstructions?: string;
  contactPhone?: string;
  photos?: string[];
  preferredDate?: string;
  preferredTime?: string;
  pricing?: {
    type: 'fixed' | 'quote' | 'range';
    amount?: number;
    minPrice?: number;
    maxPrice?: number;
  };
  budget?: {
    type?: string;
    amount?: number;
    minAmount?: number;
    maxAmount?: number;
    currency?: string;
  };
  selectedVendor?: string | any;
  proposalsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  _id: string;
  bookingReference?: string;
  jobId?: Job | any;
  job?: Job | any;
  category?: string;
  customer: User;
  vendor: any;
  serviceTitle: string;
  status: 'pending' | 'pending_acceptance' | 'awaiting_confirmation' | 'scheduled' | 'assigned' | 'confirmed' | 'on_the_way' | 'arrived' | 'in_progress' | 'completion_pending' | 'completed' | 'cancelled' | 'disputed' | 'declined' | 'payment_pending';
  totalAmount?: number;
  scheduledDate?: string;
  scheduledTime?: string;
  pricing?: {
    amount?: number;
    totalAmount?: number;
    vendorNet?: number;
    paymentStatus?: 'pending' | 'held_in_escrow' | 'released' | 'refunded' | 'escrow_locked';
    diagnosticFee?: number;
    platformFee?: number;
    isPaid?: boolean;
    paymentMethod?: string;
  };
  address: ServiceAddress;
  arrivalOtp?: string;
  startOtp?: {
    otp?: string;
    attempts?: number;
    maxAttempts?: number;
    isConsumed?: boolean;
    consumedAt?: string;
    expiresAt?: string;
  };
  arrivalEvidence?: {
    verified?: boolean;
    verifiedAt?: string;
  };
  isOtpVerified?: boolean;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorProfile {
  _id: string;
  user: string | User;
  businessName: string;
  bio?: string;
  onboardingStep?: 'profile_pending' | 'domains_pending' | 'first_service_pending' | 'completed' | string;
  categories: string[] | ServiceCategory[];
  locality?: string;
  city?: string;
  zoneId?: string;
  zoneName?: string;
  servicesOffered?: string[];
  serviceAreas?: string[];
  experienceYears?: number;
  isVerified?: boolean;
  verificationStatus?: 'unverified' | 'submitted' | 'in_review' | 'verified' | 'rejected';
  skills?: string[];
  vendorServiceRadiusKm?: number;
  coordinates?: { lat: number; lng: number };
  serviceAreaCoverage?: {
    baseAddress?: string;
    pincode?: string;
    coordinates?: { lat: number; lng: number };
    radiusKm?: number;
    selectedLocalityIds?: string[];
    selectedZoneIds?: string[];
    excludedLocalityIds?: string[];
    version?: number;
    updatedAt?: string;
  };
  emergencyAvailability?: {
    isAvailable?: boolean;
    maxDailyJobs?: number;
    hours?: { start?: string; end?: string; is24x7?: boolean };
  };
  verifiedBadge?: {
    status?: string;
    verificationType?: string;
    maskedIdNumber?: string;
    documents?: Array<{ name: string; url: string; docType?: string; uploadedAt?: string }>;
    rejectionReason?: string;
  };
  isAvailable?: boolean;
  rating?: number;
  reviewsCount?: number;
  reviewCount?: number;
  completedJobsCount?: number;
  earningsTotal?: number;
  avatar?: string;
  availability?: {
    isAvailableNow?: boolean;
    serviceDays?: string[];
    days?: string[];
    hours?: { start?: string; end?: string };
  };
}

export interface ChatMessage {
  _id: string;
  conversationId?: string;
  conversation?: any;
  sender: string | User;
  recipient?: string | User;
  receiver?: string | User;
  text: string;
  read?: boolean;
  isRead?: boolean;
  readAt?: string;
  clientTempId?: string;
  attachments?: any[];
  createdAt: string;
}

export interface NotificationItem {
  _id: string;
  recipient?: string;
  sender?: string | User;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead?: boolean;
  read?: boolean;
  readAt?: string;
  relatedResource?: {
    resourceType?: 'job' | 'booking' | 'application' | 'quotation' | 'user' | 'conversation' | 'chat';
    resourceId?: string;
  };
  data?: any;
  createdAt: string;
  updatedAt?: string;
}

export interface ServiceListing {
  _id: string;
  vendor: string | User;
  vendorProfile?: string | VendorProfile;
  title: string;
  domain: string;
  category?: string | ServiceCategory;
  subcategory: string;
  isCustom?: boolean;
  customSubcategory?: string;
  idempotencyKey?: string;
  bookingCount?: number;
  shortSummary?: string;
  description: string;
  experienceYears?: number;
  deliveryType?: 'home_service' | 'workshop' | 'remote' | 'onsite';
  languages?: string[];
  pricing: {
    type: 'fixed' | 'starting' | 'range' | 'quote';
    amount?: number;
    minPrice?: number;
    maxPrice?: number;
    currency?: string;
    unit?: 'per visit' | 'per hour' | 'per item' | 'per project';
    visitFee?: number;
    materialCostIncluded?: boolean;
    cancellationTerms?: string;
  };
  images?: string[];
  location?: {
    country?: string;
    state?: string;
    city?: string;
    locality?: string;
    serviceAddress?: string;
    radiusKm?: number;
    supportedLocalities?: string[];
    homeVisitAvailable?: boolean;
    travelCharge?: number;
  };
  availability?: {
    days?: string[];
    hours?: {
      start?: string;
      end?: string;
    };
    emergencyAvailable?: boolean;
    maxDailyBookings?: number;
  };
  requirements?: {
    toolsProvided?: boolean;
    customerRequirements?: string;
    safetyInstructions?: string;
    warranty?: string;
  };
  status: 'draft' | 'pending_approval' | 'published' | 'rejected' | 'paused' | 'archived';
  viewsCount?: number;
  inquiriesCount?: number;
  rating?: number;
  reviewCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RouteEntry {
  name: string;
  params?: any;
}

export interface AppNavigation {
  navigate: (screen: string, params?: any) => void;
  goBack: (force?: boolean) => void;
  canGoBack: () => boolean;
  replace: (screen: string, params?: any) => void;
  resetTo: (screen: string, params?: any) => void;
  registerBackHandler: (handler: () => boolean) => () => void;
  currentRoute: string;
  routeParams: any;
}
