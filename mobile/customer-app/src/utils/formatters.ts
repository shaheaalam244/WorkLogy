export const formatCurrency = (amount: number = 0): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Flexible';
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
    case 'quotations_received':
      return '#059669';
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
    case 'quotations_received':
      return 'Quotations Received';
    case 'payment_pending':
      return 'Payment Pending';
    case 'on_the_way':
      return 'Technician En Route';
    case 'arrived':
      return 'Arrived at Site';
    case 'in_progress':
      return 'Work In Progress';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  }
};

export const formatConversationTime = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

    const isSameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isSameDay) {
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return 'Yesterday';
    }

    if (diffDays < 7) {
      return d.toLocaleDateString('en-IN', { weekday: 'short' });
    }

    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
};

export const formatChatDateSeparator = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    const now = new Date();

    const isSameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isSameDay) return 'Today';

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (isYesterday) return 'Yesterday';

    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  } catch {
    return '';
  }
};
