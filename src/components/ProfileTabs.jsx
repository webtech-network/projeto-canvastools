'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { User, KeyRound, Bookmark, Wand2, Link2 } from 'lucide-react';
import ApiKeyManager from './ApiKeyManager';
import ShortcutsManager from './ShortcutsManager';
import PromptCustomizer from './PromptCustomizer';
import GithubConnection from './GithubConnection';
import GoogleConnection from './GoogleConnection';
import SettingsSaveLoad from './SettingsSaveLoad';
import ThemeToggle from './ThemeToggle';
import { useUnsavedChangesGuard } from '@/lib/useUnsavedChangesGuard';

const TABS = [
  { key: 'geral', label: 'Geral', Icon: User },
  { key: 'plataformas', label: 'Plataformas associadas', Icon: Link2 },
  { key: 'ia', label: 'Plataformas de IA', Icon: KeyRound },
  { key: 'prompts', label: 'Prompts de IA', Icon: Wand2 },
  { key: 'atalhos', label: 'Atalhos do Dashboard', Icon: Bookmark },
];

const TAB_KEYS = TABS.map((t) => t.key);

// Reuses the same folder-style tab CSS (.tab-folder/.tab-folder-btn/
// .tab-folder-panel) as QuizImportPanel.jsx — same client-only, local
// useState pattern, mostly no URL sync, EXCEPT the initial tab: the GitHub
// and Google OAuth callbacks (github/oauth2/callback, google/oauth2/callback)
// both redirect back to /perfil?tab=plataformas so the professor lands on
// the right tab instead of "Geral" — read once at mount, not kept in sync
// afterward. `providers` here is listProviders()'s output already merged
// with a `hasApiKey` boolean per entry (computed server-side in
// perfil/page.jsx from the session, never the key itself).
//
// SettingsSaveLoad (the "Salvar/Carregar Configurações do CanvasTools"
// block) renders above the tab nav, not inside any single tab panel, since
// it spans several domains (shortcuts, prompts, AI keys/models, GitHub) —
// same reasoning the old page-header SettingsExportImport had, just moved
// down here so it can call setTab('plataformas') when the professor picks
// Google Drive without having connected it yet.
export default function ProfileTabs({ userName, baseUrl, providers }) {
  const searchParams = useSearchParams();
  const initialTab = TAB_KEYS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'geral';
  const [tab, setTab] = useState(initialTab);
  // Combines the dirty signal from every settings form on this page (API
  // keys, shortcuts, custom prompts) — each reports in via its own
  // onDirtyChange prop, unregistering on unmount (e.g. switching tabs), so
  // this only reflects forms actually mounted right now.
  const [dirtyMap, setDirtyMap] = useState({});

  function setDirty(key, isDirty) {
    setDirtyMap((prev) => (prev[key] === isDirty ? prev : { ...prev, [key]: isDirty }));
  }

  useUnsavedChangesGuard(Object.values(dirtyMap).some(Boolean));

  return (
    <div className="profile-tabs">
      <div className="page-header-row">
        <h1>Configurações</h1>
        <SettingsSaveLoad onNavigateToPlatforms={() => setTab('plataformas')} />
      </div>

      <div className="tab-folder" role="tablist" aria-label="Seções do perfil">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`tab-folder-btn${tab === key ? ' active' : ''}`}
            onClick={() => setTab(key)}
          >
            <Icon size={16} strokeWidth={1.8} />
            {label}
          </button>
        ))}
      </div>

      <div className="tab-folder-panel" role="tabpanel">
        {tab === 'geral' && (
          <>
            <dl className="profile-info">
              <div>
                <dt>Nome</dt>
                <dd>{userName || '—'}</dd>
              </div>
              <div>
                <dt>Instituição (Canvas)</dt>
                <dd>{baseUrl}</dd>
              </div>
            </dl>

            <div className="preferences-section">
              <h3>Aparência</h3>
              <p className="tab-folder-description">Escolha entre o tema claro, escuro ou o padrão do seu sistema.</p>
              <ThemeToggle />
            </div>

            <p className="lede">
              Além do tema e dos atalhos e prompts nas abas ao lado, outras preferências (idioma, provedor de IA
              padrão, notificações) devem chegar aqui conforme forem implementadas.
            </p>
          </>
        )}

        {tab === 'plataformas' && (
          <>
            <p className="tab-folder-description">
              Conecte plataformas externas à sua conta CanvasTools. As conexões ficam salvas neste navegador.
            </p>
            <h3>GitHub</h3>
            <GithubConnection />
            <h3 style={{ marginTop: '1.75rem' }}>Google Drive</h3>
            <GoogleConnection />
          </>
        )}

        {tab === 'ia' && (
          <>
            <p className="tab-folder-description">
              Registre chaves de API para os provedores usados na geração de questões e nas demais funcionalidades de
              IA — cada uma fica salva separadamente e pode ser trocada ou removida a qualquer momento.
            </p>
            <div className="ai-providers-list">
              {providers.map((provider) => (
                <ApiKeyManager
                  key={provider.id}
                  provider={provider}
                  hasApiKey={provider.hasApiKey}
                  currentModel={provider.currentModel}
                  onDirtyChange={(isDirty) => setDirty(`apikey-${provider.id}`, isDirty)}
                />
              ))}
            </div>
          </>
        )}

        {tab === 'prompts' && <PromptCustomizer onDirtyChange={(isDirty) => setDirty('prompts', isDirty)} />}

        {tab === 'atalhos' && (
          <>
            <p className="tab-folder-description">Atalhos exibidos no painel inicial.</p>
            <ShortcutsManager onDirtyChange={(isDirty) => setDirty('shortcuts', isDirty)} />
          </>
        )}
      </div>
    </div>
  );
}
