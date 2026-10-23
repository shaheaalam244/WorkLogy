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
  houseNumber?: string;
  street: string;
  city: string;
  state?: string;
  pincode: string;
  landmark?: string;
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
    coordinates?: {
      lat?: number;
      lng?: number;
    };
  };
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
  jobId: Job;
  customer: User;
  vendor: any;
  serviceTitle: string;
  status: 'pending' | 'pending_acceptance' | 'awaiting_confirmation' | 'scheduled' | 'assigned' | 'confirmed' | 'on_the_way' | 'arrived' | 'in_progress' | 'completion_pending' | 'completed' | 'cancelled' | 'disputed' | 'declined' | 'payment_pending';
  totalAmount: number;
  scheduledDate?: string;
  scheduledTime?: string;
  pricing: {
    totalAmount: number;
    paymentStatus: 'pending' | 'held_in_escrow' | 'released' | 'refunded';
    diagnosticFee?: number;
    platformFee?: number;
  };
  address: ServiceAddress;
  arrivalOtp?: string;
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
  categories: string[] | ServiceCategory[];
  servicesOffered?: string[];
  serviceAreas?: string[];
  experienceYears?: number;
  isVerified?: boolean;
  verificationStatus?: 'unverified' | 'submitted' | 'in_review' | 'verified' | 'rejected';
  isAvailable?: boolean;
  rating?: number;
  reviewsCount?: number;
  completedJobsCount?: number;
  earningsTotal?: number;
}

export interface ChatMessage {
  _id: string;
  conversationId: string;
  sender: string | User;
  receiver: string | User;
  text: string;
  read: boolean;
  createdAt: string;
}

export interface ServiceListing {
  _id: string;
  vendor: string | User;
  vendorProfile?: string | VendorProfile;
  title: string;
  domain: string;
  category?: string | ServiceCategory;
  subcategory: string;
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
