export interface NotificationPreferences {
  emailBookings?: boolean;
  emailStatusUpdates?: boolean;
  emailQuotations?: boolean;
  emailCancellations?: boolean;
  emailMarketing?: boolean;
}

export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'vendor' | 'admin';
  avatar?: string;
  isVerified?: boolean;
  isEmailVerified?: boolean;
  status?: string;
  notificationPreferences?: NotificationPreferences;
  createdAt: string;
}

export interface ServiceCategory {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  description?: string;
  subcategories: Array<{
    name: string;
    description?: string;
    basePrice?: number;
    priceUnit?: string;
  }>;
  isActive: boolean;
}

export interface ServiceAddress {
  _id?: string;
  label?: string;
  houseNumber?: string;
  locality?: string;
  landmark?: string;
  street: string;
  city: string;
  state?: string;
  pincode?: string;
  zipCode?: string;
  isDefault?: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface TransactionItem {
  _id: string;
  transactionId: string;
  jobTitle?: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  type: string;
  paymentStatus: string;
  settlementStatus: string;
  createdAt: string;
  booking?: any;
  vendor?: {
    _id: string;
    name: string;
    avatar?: string;
    businessName?: string;
  };
}

export interface SupportTicketItem {
  _id: string;
  ticketNumber: string;
  category: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  responses?: Array<{
    sender: string | { name?: string; role?: string };
    message: string;
    createdAt?: string;
  }>;
}

export interface Job {
  _id: string;
  id?: string;
  customer: string | User;
  category: string | ServiceCategory;
  subcategory?: string;
  title: string;
  description: string;
  urgency: 'normal' | 'emergency' | 'medium' | 'urgent';
  isEmergency?: boolean;
  status: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  address?: ServiceAddress;
  photos?: string[];
  images?: string[];
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
  };
  location?: {
    addressLabel?: string;
    address?: string;
    houseNumber?: string;
    street?: string;
    locality?: string;
    landmark?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    locationSource?: string;
    locationAccuracyMeters?: number | null;
  };
  accessInstructions?: string;
  selectedVendor?: string | any;
  proposalsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  _id: string;
  bookingReference?: string;
  jobId: any;
  customer: User;
  vendor: any;
  serviceTitle: string;
  category?: string;
  status: 'open' | 'quotations_received' | 'dispatching' | 'pending' | 'pending_acceptance' | 'awaiting_confirmation' | 'assigned' | 'confirmed' | 'scheduled' | 'on_the_way' | 'arrived' | 'in_progress' | 'completed' | 'cancelled' | 'disputed' | 'payment_pending';
  displayStatus?: string;
  totalAmount: number;
  scheduledDate?: string;
  scheduledTime?: string;
  timeSlot?: string;
  urgency?: string;
  applicantsCount?: number;
  quotationsCount?: number;
  quotedAmount?: number;
  minQuotedAmount?: number;
  quotations?: any[];
  isJobRequest?: boolean;
  problemDescription?: string;
  pricing: {
    totalAmount?: number;
    amount?: number;
    budgetType?: string;
    quotedAmount?: number;
    minQuotedAmount?: number;
    paymentStatus: 'pending' | 'held_in_escrow' | 'released' | 'refunded' | 'escrow_locked';
    diagnosticFee?: number;
    platformFee?: number;
    isPaid?: boolean;
  };
  address: ServiceAddress;
  arrivalOtp?: string;
  isOtpVerified?: boolean;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  hasReview?: boolean;
  review?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  _id: string;
  conversation?: string;
  conversationId?: string;
  sender: string | { _id: string; name?: string; avatar?: string; role?: string };
  recipient?: string | { _id: string; name?: string; avatar?: string; role?: string };
  receiver?: string | { _id: string; name?: string; avatar?: string; role?: string };
  text: string;
  messageType?: 'text' | 'image' | 'system' | 'job_update' | 'quotation';
  quotationData?: {
    quotationId?: string;
    applicationId?: string;
    jobId?: string;
    jobTitle?: string;
    proposedAmount?: number;
    pricingBasis?: string;
    proposedSchedule?: string;
    estimatedDuration?: string;
    coverLetter?: string;
    status?: 'submitted' | 'accepted' | 'rejected' | string;
  };
  attachments?: Array<{ url: string; fileType?: string; name?: string }>;
  clientTempId?: string;
  isRead?: boolean;
  read?: boolean;
  readAt?: string;
  status?: 'sending' | 'sent' | 'failed';
  createdAt: string;
  updatedAt?: string;
}

export interface ConversationParticipant {
  _id: string;
  name?: string;
  email?: string;
  avatar?: string;
  role?: 'customer' | 'vendor' | 'admin';
  phone?: string;
  isVerified?: boolean;
  businessName?: string;
}

export interface ConversationItem {
  _id: string;
  participants: ConversationParticipant[];
  lastMessage?: {
    _id: string;
    text: string;
    sender: {
      _id: string;
      name?: string;
      avatar?: string;
      role?: string;
    } | string;
    createdAt: string;
    isRead?: boolean;
    read?: boolean;
  };
  lastMessageAt?: string;
  relatedJob?: {
    _id: string;
    title?: string;
    status?: string;
    category?: any;
    location?: any;
    budget?: number;
  };
  relatedBooking?: {
    _id: string;
    status?: string;
    scheduledDate?: string;
    totalAmount?: number;
    address?: any;
    serviceTitle?: string;
  };
  unreadCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReviewItem {
  _id: string;
  booking: string;
  customer: User;
  vendor: string;
  rating: number;
  title?: string;
  comment: string;
  createdAt: string;
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
  registerBackHandler?: (handler: () => boolean) => () => void;
  currentRoute?: string;
  routeParams?: any;
}

export interface ServiceListing {
  _id: string;
  vendor: any;
  vendorProfile?: any;
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
    unit?: string;
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
