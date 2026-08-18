'use client';

import { createContext, useContext, useState } from 'react';

// Shares the mobile drawer's open/closed state between Sidebar.jsx (renders
// the drawer itself) and Topbar.jsx's MobileNavToggle (the hamburger button
// that opens it) — the two are siblings in (dashboard)/layout.jsx, not
// parent/child, so a small context is simpler than prop drilling through
// layout.jsx. Only relevant below the 640px breakpoint; desktop's sidebar
// stays permanently visible regardless of this state.
const MobileNavContext = createContext(null);

export function MobileNavProvider({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <MobileNavContext.Provider value={{ open, setOpen }}>{children}</MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  return useContext(MobileNavContext);
}
