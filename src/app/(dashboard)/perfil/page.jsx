import { getSession, isSessionValid } from '@/lib/session';
import { listProviders } from '@/lib/aiProviders';
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
        <h2>Motores de IA</h2>
        <p className="lede">
          Registre chaves de API para os provedores usados na geração de questões e em futuras funcionalidades — cada
          um fica salvo separadamente e pode ser trocado ou removido a qualquer momento.
        </p>
        <div className="ai-providers-list">
          {listProviders().map((provider) => (
            <ApiKeyManager
              key={provider.id}
              provider={provider}
              hasApiKey={Boolean(session.aiApiKeys?.[provider.id])}
            />
          ))}
        </div>
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
