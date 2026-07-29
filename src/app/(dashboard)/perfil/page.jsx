import { getSession, isSessionValid } from '@/lib/session';
import ApiKeyManager from '@/components/ApiKeyManager';

export default async function PerfilPage() {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return null; // proxy already redirects unauthenticated requests to /login
  }

  return (
    <main className="page">
      <h1>Meu perfil</h1>

      <section className="profile-section">
        <h2>Conta</h2>
        <dl className="profile-info">
          <div>
            <dt>Nome</dt>
            <dd>{session.user?.name || '—'}</dd>
          </div>
          <div>
            <dt>Instituição (Canvas)</dt>
            <dd>{session.baseUrl}</dd>
          </div>
        </dl>
      </section>

      <section className="profile-section">
        <ApiKeyManager hasApiKey={Boolean(session.aiApiKeys?.openai)} />
      </section>

      <section className="profile-section">
        <h2>Preferências</h2>
        <p className="lede">
          Por enquanto, a única preferência configurável é a chave de API acima. Outras opções (idioma, provedor de
          IA padrão, notificações) devem chegar aqui conforme forem implementadas.
        </p>
      </section>
    </main>
  );
}
