import { useEffect } from 'react';

export type SyncEventType =
  | 'BOOKINGS_CHANGED'
  | 'NOTIFICATIONS_CHANGED'
  | 'PROFILE_CHANGED'
  | 'QUOTES_CHANGED'
  | 'DASHBOARD_CHANGED'
  | 'MESSAGES_CHANGED'
  | 'MESSAGES_READ'
  | 'LOCATION_CHANGED';

type SyncListener = (payload?: any) => void;

class DataSyncService {
  private listeners: Map<SyncEventType, Set<SyncListener>> = new Map();

  /**
   * Subscribe to a specific sync event. Returns an unsubscribe function.
   */
  subscribe(event: SyncEventType, listener: SyncListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(listener);

    return () => {
      set.delete(listener);
    };
  }

  /**
   * Broadcast an event to all registered listeners.
   */
  notify(event: SyncEventType, payload?: any): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((listener) => {
        try {
          listener(payload);
        } catch (err) {
          console.warn(`[DataSyncService] Error in listener for event ${event}:`, err);
        }
      });
    }
  }

  /**
   * Helper to trigger multiple sync events at once
   */
  notifyMultiple(events: SyncEventType[], payload?: any): void {
    events.forEach((ev) => this.notify(ev, payload));
  }
}

export const dataSyncService = new DataSyncService();

/**
 * React hook to auto-subscribe and cleanup for sync events.
 */
export function useDataSync(event: SyncEventType, onSync: (payload?: any) => void) {
  useEffect(() => {
    const unsubscribe = dataSyncService.subscribe(event, onSync);
    return () => {
      unsubscribe();
    };
  }, [event, onSync]);
}
