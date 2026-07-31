'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, Sparkles, Mail, BookOpen } from 'lucide-react';
import logo from '@/assets/images/logo.png';
import SidebarMenu from './SidebarMenu';

const NAV_ITEMS = [
  { href: '/courses', label: 'Cursos', Icon: GraduationCap },
  { href: '/questoes', label: 'Questões', Icon: Sparkles },
  { href: '/mensagens', label: 'Mensagens', Icon: Mail },
  { href: '/tutorial', label: 'Tutorial', Icon: BookOpen },
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
