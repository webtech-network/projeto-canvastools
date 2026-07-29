import Link from 'next/link';
import { getSession, isSessionValid } from '@/lib/session';

export default async function Topbar() {
  const session = await getSession();
  const loggedIn = isSessionValid(session);

  return (
    <header className="topbar">
      <span className="topbar-title">CanvasTools</span>
      {loggedIn && (
        <div className="topbar-user">
          <Link href="/perfil" className="user-name" title="Ver perfil">
            {session.user?.name}
          </Link>
          <form action="/api/auth/logout" method="POST" className="logout-form">
            <button type="submit" className="btn btn-ghost">
              Sair
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
