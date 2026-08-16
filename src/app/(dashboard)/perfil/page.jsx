import { Suspense } from 'react';
import { getSession, isSessionValid } from '@/lib/session';
import { listProviders } from '@/lib/aiProviders';
import ProfileTabs from '@/components/ProfileTabs';

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
      {/* ProfileTabs renders its own page-header-row (h1 "Configurações" +
          the compact SettingsSaveLoad widget side by side) instead of this
          file rendering a plain <h1>, since SettingsSaveLoad needs to be
          able to switch tabs (jumping to "Plataformas associadas" when
          Google Drive isn't connected yet) — that requires the tab state
          that only lives inside the client-side ProfileTabs. It also reads
          the initial tab from useSearchParams() (the GitHub/Google OAuth
          callbacks redirect to ?tab=plataformas) — Next.js requires any
          useSearchParams() consumer to sit inside a Suspense boundary. */}
      <Suspense fallback={null}>
        <ProfileTabs userName={session.user?.name} baseUrl={session.baseUrl} providers={providers} />
      </Suspense>
    </main>
  );
}
