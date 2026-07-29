import { getSession, isSessionValid } from '@/lib/session';

export default async function Topbar() {
  const session = await getSession();
  const loggedIn = isSessionValid(session);

  return (
    <header className="topbar">
      <span className="topbar-title">CanvasTools</span>
      {loggedIn && (
        <form action="/api/auth/logout" method="POST" className="logout-form">
          <span className="user-name">{session.user?.name}</span>
          <button type="submit" className="btn btn-ghost">
            Sair
          </button>
        </form>
      )}
    </header>
  );
}
