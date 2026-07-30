'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import logo from '@/assets/images/logo.png';
import SidebarMenu from './SidebarMenu';

function CoursesIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}

function QuestoesIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4L12 3z" />
      <path d="M19 14l.7 1.8L21.5 16.5l-1.8.7L19 19l-.7-1.8-1.8-.7 1.8-.7L19 14z" />
    </svg>
  );
}

function MensagensIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 5h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
      <path d="M3.5 6.5l8.5 6 8.5-6" />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: '/courses', label: 'Cursos', Icon: CoursesIcon },
  { href: '/questoes', label: 'Questões', Icon: QuestoesIcon },
  { href: '/mensagens', label: 'Mensagens', Icon: MensagensIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <Link href="/" className="sidebar-logo" title="Início">
        <Image src={logo} alt="CanvasTools" priority />
      </Link>
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
              <Icon />
              <span className="nav-icon-label">{label}</span>
            </Link>
          );
        })}
      </nav>
      <SidebarMenu />
    </aside>
  );
}
