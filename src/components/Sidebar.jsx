'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, Sparkles, Mail, BookOpen, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import SidebarMenu from './SidebarMenu';

const NAV_ITEMS = [
  { href: '/courses', label: 'Cursos', Icon: GraduationCap },
  { href: '/questoes', label: 'Questões', Icon: Sparkles },
  { href: '/mensagens', label: 'Mensagens', Icon: Mail },
  { href: '/tutorial', label: 'Tutorial', Icon: BookOpen },
];

const COLLAPSE_STORAGE_KEY = 'canvastools:sidebar-collapsed';

// The CanvasTools mark used to sit here as a link to "/" — that job moved to
// the full logo lockup in Topbar.jsx (see Topbar's own comment). This spot
// is now the collapse/expand toggle instead: collapsed shows icons only
// (same width as the mobile breakpoint's narrow sidebar, --sidebar-width-
// narrow), expanded shows icons + labels (the default). `.dashboard-main`'s
// margin-left reacts to the collapsed state via a CSS `:has()` selector on
// `.dashboard-shell` (see globals.css) rather than lifting this state up to
// the (dashboard) layout — keeps Sidebar self-contained. The preference
// persists across reloads via localStorage; read only after mount so the
// server-rendered (expanded) markup matches the client's first paint and
// hydration never mismatches.
export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1') {
      setCollapsed(true);
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }

  return (
    <aside className={`sidebar${collapsed ? ' is-collapsed' : ''}`}>
      <button
        type="button"
        className="sidebar-collapse-toggle"
        onClick={toggleCollapsed}
        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        aria-pressed={collapsed}
      >
        {collapsed ? <PanelLeftOpen size={22} strokeWidth={1.8} /> : <PanelLeftClose size={22} strokeWidth={1.8} />}
      </button>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`nav-icon-btn${active ? ' active' : ''}`}
            >
              <Icon size={20} strokeWidth={1.8} />
              <span className="nav-icon-label">{label}</span>
            </Link>
          );
        })}
      </nav>
      <SidebarMenu />
    </aside>
  );
}
