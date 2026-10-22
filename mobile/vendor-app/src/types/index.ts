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
  customer: string | User;
  category: string | ServiceCategory;
  title: string;
  description: string;
  urgency: 'normal' | 'emergency';
  status: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  address: ServiceAddress;
  photos?: string[];
  preferredDate?: string;
  preferredTime?: string;
  pricing?: {
    type: 'fixed' | 'quote' | 'range';
    amount?: number;
    minPrice?: number;
    maxPrice?: number;
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
  status: 'pending' | 'confirmed' | 'on_the_way' | 'arrived' | 'in_progress' | 'completed' | 'cancelled' | 'disputed' | 'payment_pending';
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
