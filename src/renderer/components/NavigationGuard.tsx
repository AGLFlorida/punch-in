'use client';

import { createContext, useContext, useRef, type ReactNode } from 'react';

type GuardFunction = (href?: string) => boolean | Promise<boolean>;

type NavigationGuardContextType = {
  registerGuard: (fn: GuardFunction) => void;
  unregisterGuard: () => void;
  checkGuard: (href: string) => Promise<boolean>;
};

const NavigationGuardContext = createContext<NavigationGuardContextType | null>(null);

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const guardRef = useRef<GuardFunction | null>(null);

  const registerGuard = (fn: GuardFunction) => {
    guardRef.current = fn;
  };

  const unregisterGuard = () => {
    guardRef.current = null;
  };

  const checkGuard = async (href: string): Promise<boolean> => {
    if (guardRef.current) {
      const result = guardRef.current(href);
      return result instanceof Promise ? await result : result;
    }
    return true; // No guard registered, allow navigation
  };

  return (
    <NavigationGuardContext.Provider value={{ registerGuard, unregisterGuard, checkGuard }}>
      {children}
    </NavigationGuardContext.Provider>
  );
}

export function useNavigationGuard(): NavigationGuardContextType {
  const context = useContext(NavigationGuardContext);
  if (!context) {
    throw new Error('useNavigationGuard must be used within NavigationGuardProvider');
  }
  return context;
}

