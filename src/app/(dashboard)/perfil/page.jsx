import { getSession, isSessionValid } from '@/lib/session';
import { listProviders } from '@/lib/aiProviders';
import ProfileTabs from '@/components/ProfileTabs';
import SettingsExportImport from '@/components/SettingsExportImport';

export default async function PerfilPage() {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return null; // proxy already redirects unauthenticated requests to /login
  }

  const providers = listProviders().map((provider) => ({
    ...provider,
    hasApiKey: Boolean(session.aiApiKeys?.[provider.id]),
  }));

  return (
    <main className="page">
      <div className="page-header-row">
        <h1>Meu perfil</h1>
        <SettingsExportImport />
      </div>

      <ProfileTabs userName={session.user?.name} baseUrl={session.baseUrl} providers={providers} />
    </main>
  );
}
