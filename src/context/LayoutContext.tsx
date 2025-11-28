import React from 'react';

type LayoutContextType = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (value: boolean) => void;
};

export const LayoutContext = React.createContext<LayoutContextType | null>(null);

export function useLayoutContext() {
  const ctx = React.useContext(LayoutContext);
  if (!ctx) throw new Error('useLayoutContext must be used within LayoutContext.Provider');
  return ctx;
}

export default LayoutContext;
