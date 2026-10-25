export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

export const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return Math.floor(diffInSeconds / 60) + 'm ago';
  if (diffInSeconds < 86400) return Math.floor(diffInSeconds / 3600) + 'h ago';
  if (diffInSeconds < 604800) return Math.floor(diffInSeconds / 86400) + 'd ago';
  return formatDate(dateString);
};

export const getUrgencyBadgeColor = (urgency) => {
  switch (urgency) {
    case 'emergency': return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'high': return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'medium': return 'bg-sky-50 text-sky-800 border-sky-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

export const getStatusBadgeColor = (status) => {
  switch (status) {
    case 'completed': return 'bg-teal-50 text-teal-800 border-teal-200';
    case 'in_progress': return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'open': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'cancelled': return 'bg-rose-50 text-rose-700 border-rose-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

export const formatChatTimestamp = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
};

export const formatChatDateSeparator = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfMsgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (startOfMsgDate.getTime() === startOfToday.getTime()) return 'Today';
  if (startOfMsgDate.getTime() === startOfYesterday.getTime()) return 'Yesterday';

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  }).format(date);
};

export const formatConversationTimestamp = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  if (diffMs < 60000) return 'Just now';

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date >= startOfToday) {
    return formatChatTimestamp(dateString);
  }

  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  if (date >= startOfYesterday) {
    return 'Yesterday';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(date);
};

/**
 * Format full structured service address cleanly handling missing fields and privacy masking
 * Example: Flat 402, Krishna Vihar Colony, Near City Mall, Gomti Nagar, Lucknow, Uttar Pradesh - 226010
 */
export const formatFullAddress = (loc, options = {}) => {
  if (!loc) return 'Address details not provided';

  if (typeof loc === 'string') {
    const trimmed = loc.trim();
    return trimmed || 'Address details not provided';
  }

  // If masked for privacy (unassigned vendor evaluating a lead)
  if (loc.isMaskedForPrivacy && !options.forceFull) {
    const parts = [
      loc.locality || loc.area,
      loc.city || 'Lucknow',
      loc.state || 'Uttar Pradesh',
      loc.zipCode || loc.pincode
    ].filter(Boolean);
    const areaStr = parts.join(', ');
    return areaStr
      ? `${areaStr} (Full street address available after assignment)`
      : 'Area details available upon assignment';
  }

  const parts = [];
  const house = (loc.houseNumber || loc.flatNumber || loc.unitNumber || '').toString().trim();
  const floor = (loc.floor || loc.unit || '').toString().trim();
  const street = (loc.street || '').toString().trim();
  const landmark = (loc.landmark || '').toString().trim();
  const locality = (loc.locality || loc.area || '').toString().trim();
  const city = (loc.city || '').toString().trim();
  const state = (loc.state || '').toString().trim();
  const pin = (loc.zipCode || loc.pincode || loc.postalCode || loc.zip || '').toString().trim();

  if (house) parts.push(house);
  if (floor && !house.toLowerCase().includes(floor.toLowerCase())) {
    parts.push(floor.toLowerCase().includes('floor') ? floor : `${floor} Floor`);
  }
  if (street && !house.toLowerCase().includes(street.toLowerCase())) parts.push(street);
  if (landmark) parts.push(landmark.toLowerCase().startsWith('near') ? landmark : `Near ${landmark}`);
  if (locality && !street.toLowerCase().includes(locality.toLowerCase())) parts.push(locality);
  if (city) parts.push(city);
  if (state && state.toLowerCase() !== city.toLowerCase()) parts.push(state);

  let formatted = parts.join(', ');

  if (pin) {
    formatted = formatted ? `${formatted} - ${pin}` : `PIN: ${pin}`;
  }

  // Fallback to legacy string address if structured fields were absent
  if (!formatted && loc.address) {
    return loc.address.trim();
  }

  return formatted || 'Full address not specified';
};

/**
 * Format short locality and city for lead browsing cards
 */
export const formatShortAddress = (loc) => {
  if (!loc) return 'Lucknow, UP';
  if (typeof loc === 'string') return loc;
  const parts = [loc.locality, loc.city || 'Lucknow'].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : (loc.city || 'Lucknow');
};

/**
 * Safely extracts human-readable display string from strings, populated objects, or arrays.
 * Guarantees a string output to prevent "Objects are not valid as a React child" crashes.
 *
 * @param {any} value - String, populated Mongoose document, ID, or object
 * @returns {string} - Clean human-readable string representation
 */
export const getDisplayName = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map(getDisplayName).filter(Boolean).join(', ');
    }
    return (
      value.name ||
      value.title ||
      value.label ||
      value.categoryName ||
      value.serviceName ||
      value.slug ||
      ''
    );
  }
  return '';
};

export const resolveDocumentUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api').replace(/\/api\/?$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};



