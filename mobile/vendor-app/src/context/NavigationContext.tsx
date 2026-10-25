import { createContext, useContext } from 'react';
import type { AppNavigation } from '../types';

export const NavigationContext = createContext<AppNavigation | null>(null);

export const useNavigation = (): AppNavigation => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context as AppNavigation;
};
