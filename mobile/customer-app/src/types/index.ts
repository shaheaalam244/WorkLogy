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
  houseNumber?: string;
  street: string;
  city: string;
  state?: string;
  pincode: string;
  landmark?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
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
  hasReview?: boolean;
  createdAt: string;
  updatedAt: string;
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
