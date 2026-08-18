'use client';

import { Menu, X } from 'lucide-react';
import { useMobileNav } from './MobileNavProvider';

// Hamburger toggle rendered in Topbar.jsx — hidden via CSS above the 640px
// breakpoint, since desktop keeps its own always-visible sidebar with its
// own icons-only/icons+labels collapse toggle instead.
export default function MobileNavToggle() {
  const { open, setOpen } = useMobileNav();

  return (
    <button
      type="button"
      className="mobile-nav-toggle"
      onClick={() => setOpen((v) => !v)}
      aria-haspopup="true"
      aria-expanded={open}
      aria-label={open ? 'Fechar menu' : 'Abrir menu'}
      title={open ? 'Fechar menu' : 'Abrir menu'}
    >
      {open ? <X size={22} strokeWidth={1.8} /> : <Menu size={22} strokeWidth={1.8} />}
    </button>
  );
}
