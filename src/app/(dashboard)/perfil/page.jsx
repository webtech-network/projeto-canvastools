import { Suspense } from 'react';
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
    currentModel: session.aiModels?.[provider.id] || null,
  }));

  return (
    <main className="page">
      <div className="page-header-row">
        <h1>Meu perfil</h1>
        <SettingsExportImport />
      </div>

      {/* ProfileTabs reads the initial tab from useSearchParams() (the
          GitHub OAuth callback redirects to ?tab=github) — Next.js requires
          any useSearchParams() consumer to sit inside a Suspense boundary. */}
      <Suspense fallback={null}>
        <ProfileTabs userName={session.user?.name} baseUrl={session.baseUrl} providers={providers} />
      </Suspense>
    </main>
  );
}
