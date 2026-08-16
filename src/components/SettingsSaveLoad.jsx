'use client';

import { useEffect, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import Modal from './Modal';
import { exportSettingsFile, importSettingsFromFile } from '@/lib/settingsExport';
import { pushToGoogleDrive, pullFromGoogleDrive } from '@/lib/googleDriveSync';
import { getGoogleConnection } from '@/lib/googleConnection';

// Unifies the previous SettingsExportImport.jsx (local file) and
// GoogleConnection.jsx's push/pull section (Drive) into one compact control
// sitting next to the /perfil page title: a destination switch ("Arquivo
// externo" / "Google Drive") plus two labeled actions, both reusing the
// exact same envelope-building functions either way — only the transport
// (file download vs Drive API) differs. Save/load details open in a Modal
// (see Modal.jsx) instead of an inline box, so they never push the tab nav
// below them down the page. `onNavigateToPlatforms` lets this jump the
// parent ProfileTabs to the "Plataformas associadas" tab when the professor
// picks Google Drive without having connected it yet.
export default function SettingsSaveLoad({ onNavigateToPlatforms }) {
  const [destination, setDestination] = useState('file');
  const [googleConnected, setGoogleConnected] = useState(null); // null = still checking

  useEffect(() => {
    let cancelled = false;
    getGoogleConnection().then((conn) => {
      if (!cancelled) setGoogleConnected(Boolean(conn));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [includeSecrets, setIncludeSecrets] = useState(false);
  const [savePassword, setSavePassword] = useState('');
  const [savePasswordConfirm, setSavePasswordConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);

  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importEncrypted, setImportEncrypted] = useState(false);
  const [loadPassword, setLoadPassword] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [loadMessage, setLoadMessage] = useState(null);

  const driveUnavailable = destination === 'drive' && googleConnected !== true;

  function selectDestination(next) {
    setDestination(next);
    setSaveError(null);
    setSaveMessage(null);
    setLoadError(null);
    setLoadMessage(null);
    setImportFile(null);
  }

  function closeSaveModal() {
    setSaveModalOpen(false);
  }

  function closeLoadModal() {
    setLoadModalOpen(false);
    setImportFile(null);
  }

  function handleSaveClick() {
    setSaveError(null);
    setSaveMessage(null);
    if (driveUnavailable) return;
    setSaveModalOpen(true);
  }

  function handleLoadClick() {
    if (destination !== 'drive') return; // file destination uses the <label> below instead
    setLoadError(null);
    setLoadMessage(null);
    if (driveUnavailable) return;
    setLoadModalOpen(true);
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLoadError(null);
    setLoadMessage(null);
    setLoadPassword('');
    try {
      const parsed = JSON.parse(await file.text());
      setImportFile(file);
      setImportEncrypted(Boolean(parsed.encrypted));
    } catch {
      setImportFile(null);
      setLoadError('Arquivo inválido: não é um JSON válido.');
    }
    setLoadModalOpen(true);
  }

  async function handleSaveConfirm() {
    setSaveError(null);
    setSaveMessage(null);
    if (includeSecrets) {
      if (!savePassword || savePassword.length < 8) {
        setSaveError('A senha deve ter ao menos 8 caracteres.');
        return;
      }
      if (savePassword !== savePasswordConfirm) {
        setSaveError('As senhas não conferem.');
        return;
      }
    }
    if (
      destination === 'drive' &&
      !window.confirm(
        'Isso vai sobrescrever o arquivo de preferências no Google Drive com os dados deste computador. Continuar?',
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      if (destination === 'file') {
        await exportSettingsFile({ includeSecrets, password: includeSecrets ? savePassword : undefined });
        setSaveMessage('Arquivo exportado.');
      } else {
        await pushToGoogleDrive({ includeSecrets, password: includeSecrets ? savePassword : undefined });
        setSaveMessage('Enviado para o Google Drive.');
      }
      setSavePassword('');
      setSavePasswordConfirm('');
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLoadConfirm() {
    setLoadError(null);
    setLoadMessage(null);
    const confirmMessage =
      destination === 'file'
        ? 'Importar vai substituir os atalhos, os prompts personalizados e os modelos de IA escolhidos atuais (e as chaves de API e a conexão com o GitHub, se estiverem no arquivo). Continuar?'
        : 'Isso vai substituir os atalhos, os prompts personalizados e os modelos de IA escolhidos atuais pelo que está salvo no Google Drive. Continuar?';
    if (!window.confirm(confirmMessage)) return;
    if (destination === 'file' && !importFile) return;

    setLoadingSettings(true);
    try {
      const results =
        destination === 'file'
          ? await importSettingsFromFile(importFile, { password: loadPassword || undefined })
          : await pullFromGoogleDrive({ password: loadPassword || undefined });

      setLoadMessage(
        `Carregado: ${results.shortcuts} atalho(s), ${results.customPrompts} prompt(s) personalizado(s)${
          results.apiKeys ? `, ${results.apiKeys} chave(s) de API` : ''
        }${results.aiModels ? `, ${results.aiModels} modelo(s) de IA` : ''}${
          results.github ? ', conexão com o GitHub' : ''
        }. Atualizando a tela…`,
      );
      // Everything else on /perfil (atalhos, prompts, chaves de IA, conexões)
      // only lê seus dados uma vez ao montar — sem isso o professor continuaria
      // vendo o estado anterior até um refresh manual deliberado.
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoadingSettings(false);
    }
  }

  return (
    <section className="settings-save-load">
      <div className="settings-save-load-controls">
        <div className="segmented" role="tablist" aria-label="Destino das configurações">
          <button
            type="button"
            role="tab"
            aria-selected={destination === 'file'}
            className={`segmented-btn${destination === 'file' ? ' active' : ''}`}
            onClick={() => selectDestination('file')}
          >
            Arquivo externo
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={destination === 'drive'}
            className={`segmented-btn${destination === 'drive' ? ' active' : ''}`}
            onClick={() => selectDestination('drive')}
          >
            Google Drive
          </button>
        </div>

        <div className="settings-save-load-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={driveUnavailable}
            onClick={handleSaveClick}
          >
            <Download size={16} strokeWidth={1.8} />
            Salvar
          </button>

          {destination === 'file' ? (
            <label className="btn btn-secondary btn-sm" htmlFor="settings-import-file">
              <Upload size={16} strokeWidth={1.8} />
              Carregar
            </label>
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={driveUnavailable}
              onClick={handleLoadClick}
            >
              <Upload size={16} strokeWidth={1.8} />
              Carregar
            </button>
          )}
          <input
            id="settings-import-file"
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelected}
            hidden
          />
        </div>
      </div>

      {driveUnavailable && (
        <div className="alert alert-warning" role="alert">
          Você ainda não conectou sua conta do Google Drive.{' '}
          <button type="button" className="alert-toggle" onClick={onNavigateToPlatforms}>
            Ir para Plataformas associadas
          </button>
        </div>
      )}

      {saveModalOpen && (
        <Modal
          title={destination === 'file' ? 'Exportar configurações' : 'Enviar para o Google Drive'}
          onClose={closeSaveModal}
        >
          <div className="settings-save-load-form">
            <label className="settings-export-checkbox">
              <input
                type="checkbox"
                checked={includeSecrets}
                onChange={(e) => setIncludeSecrets(e.target.checked)}
              />
              Incluir credenciais (chaves de API de IA e conexão com GitHub) — o arquivo será cifrado com senha
            </label>

            {includeSecrets && (
              <>
                <input
                  type="password"
                  placeholder="Senha (mínimo 8 caracteres)"
                  value={savePassword}
                  onChange={(e) => setSavePassword(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Confirmar senha"
                  value={savePasswordConfirm}
                  onChange={(e) => setSavePasswordConfirm(e.target.value)}
                />
              </>
            )}

            <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={handleSaveConfirm}>
              {saving ? 'Salvando…' : destination === 'file' ? 'Baixar arquivo' : 'Enviar para o Google Drive'}
            </button>

            {saveError && (
              <p className="alert alert-error" role="alert">
                {saveError}
              </p>
            )}
            {saveMessage && (
              <p className="alert alert-success" role="status">
                {saveMessage}
              </p>
            )}
          </div>
        </Modal>
      )}

      {loadModalOpen && (
        <Modal
          title={destination === 'file' ? 'Importar configurações' : 'Carregar do Google Drive'}
          onClose={closeLoadModal}
        >
          <div className="settings-save-load-form">
            {destination === 'file' && importFile && <p className="lede">Arquivo selecionado: {importFile.name}</p>}
            {(destination === 'drive' || importEncrypted) && (
              <input
                type="password"
                placeholder={
                  destination === 'file' ? 'Senha do arquivo cifrado' : 'Senha (se o arquivo remoto estiver cifrado)'
                }
                value={loadPassword}
                onChange={(e) => setLoadPassword(e.target.value)}
              />
            )}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={loadingSettings || (destination === 'file' && !importFile)}
              onClick={handleLoadConfirm}
            >
              {loadingSettings
                ? 'Carregando…'
                : destination === 'file'
                  ? 'Carregar arquivo'
                  : 'Carregar do Google Drive'}
            </button>

            {loadError && (
              <p className="alert alert-error" role="alert">
                {loadError}
              </p>
            )}
            {loadMessage && (
              <p className="alert alert-success" role="status">
                {loadMessage}
              </p>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}
