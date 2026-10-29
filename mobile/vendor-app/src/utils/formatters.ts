export const formatCurrency = (amount: number = 0): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Immediate';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

export const formatTime = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending':
    case 'payment_pending':
      return '#F59E0B';
    case 'confirmed':
      return '#2563EB';
    case 'on_the_way':
      return '#8B5CF6';
    case 'arrived':
      return '#D97706';
    case 'in_progress':
      return '#059669';
    case 'completed':
      return '#10B981';
    case 'cancelled':
    case 'disputed':
      return '#DC2626';
    default:
      return '#64748B';
  }
};

export const formatStatusText = (status: string): string => {
  switch (status) {
    case 'payment_pending':
      return 'Payment Pending';
    case 'on_the_way':
      return 'On The Way';
    case 'arrived':
      return 'Arrived at Site';
    case 'in_progress':
      return 'In Progress';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  }
};

/**
 * Checks whether an email is a backend-generated placeholder
 * e.g. temp_9876543210_123456@worklogy.local
 */
export const isTemporaryEmail = (email?: string | null): boolean => {
  if (!email || typeof email !== 'string') return true;
  const lower = email.toLowerCase().trim();
  return (
    lower.endsWith('@worklogy.local') ||
    lower.startsWith('temp_') ||
    lower.includes('worklogy.local')
  );
};

/**
 * Returns empty string if email is temporary, otherwise returns clean trimmed email
 */
export const getDisplayEmail = (email?: string | null): string => {
  if (isTemporaryEmail(email)) return '';
  return (email || '').trim();
};

