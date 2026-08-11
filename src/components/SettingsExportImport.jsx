'use client';

import { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { exportSettingsFile, importSettingsFromFile } from '@/lib/settingsExport';

// Lives outside the /perfil tabs (a fixed header control, per request) since
// it spans multiple domains — shortcuts, custom AI prompts, and optionally
// AI API keys + the GitHub connection — rather than belonging to any single
// tab.
export default function SettingsExportImport() {
  const [exportOpen, setExportOpen] = useState(false);
  const [includeSecrets, setIncludeSecrets] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [exportPasswordConfirm, setExportPasswordConfirm] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [exportMessage, setExportMessage] = useState(null);

  const [importFile, setImportFile] = useState(null);
  const [importEncrypted, setImportEncrypted] = useState(false);
  const [importPassword, setImportPassword] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importMessage, setImportMessage] = useState(null);

  async function handleExport() {
    setExportError(null);
    setExportMessage(null);
    if (includeSecrets) {
      if (!exportPassword || exportPassword.length < 8) {
        setExportError('A senha deve ter ao menos 8 caracteres.');
        return;
      }
      if (exportPassword !== exportPasswordConfirm) {
        setExportError('As senhas não conferem.');
        return;
      }
    }
    setExporting(true);
    try {
      await exportSettingsFile({ includeSecrets, password: includeSecrets ? exportPassword : undefined });
      setExportMessage('Arquivo exportado.');
      setExportPassword('');
      setExportPasswordConfirm('');
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExporting(false);
    }
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError(null);
    setImportMessage(null);
    setImportPassword('');
    try {
      const parsed = JSON.parse(await file.text());
      setImportFile(file);
      setImportEncrypted(Boolean(parsed.encrypted));
    } catch {
      setImportError('Arquivo inválido: não é um JSON válido.');
      setImportFile(null);
    }
  }

  async function handleImport() {
    if (!importFile) return;
    if (
      !window.confirm(
        'Importar vai substituir os atalhos, os prompts personalizados e os modelos de IA escolhidos atuais (e as chaves de API e a conexão com o GitHub, se estiverem no arquivo). Continuar?',
      )
    ) {
      return;
    }
    setImporting(true);
    setImportError(null);
    setImportMessage(null);
    try {
      const results = await importSettingsFromFile(importFile, { password: importPassword || undefined });
      setImportMessage(
        `Importado: ${results.shortcuts} atalho(s), ${results.customPrompts} prompt(s) personalizado(s)${
          results.apiKeys ? `, ${results.apiKeys} chave(s) de API` : ''
        }${results.aiModels ? `, ${results.aiModels} modelo(s) de IA` : ''}${
          results.github ? ', conexão com o GitHub' : ''
        }.`,
      );
      setImportFile(null);
      setImportEncrypted(false);
      setImportPassword('');
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="settings-export-import">
      <div className="settings-export-import-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setExportOpen((v) => !v)}>
          <Download size={16} strokeWidth={1.8} aria-hidden="true" />
          Exportar configurações
        </button>

        <label className="btn btn-secondary btn-sm" htmlFor="settings-import-file">
          <Upload size={16} strokeWidth={1.8} aria-hidden="true" />
          Importar configurações
        </label>
        <input
          id="settings-import-file"
          type="file"
          accept=".json,application/json"
          onChange={handleFileSelected}
          hidden
        />
      </div>

      {exportOpen && (
        <div className="settings-export-panel">
          <label className="settings-export-checkbox">
            <input type="checkbox" checked={includeSecrets} onChange={(e) => setIncludeSecrets(e.target.checked)} />
            Incluir credenciais (chaves de API de IA e conexão com GitHub) — o arquivo será cifrado com senha
          </label>

          {includeSecrets && (
            <>
              <input
                type="password"
                placeholder="Senha (mínimo 8 caracteres)"
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
              />
              <input
                type="password"
                placeholder="Confirmar senha"
                value={exportPasswordConfirm}
                onChange={(e) => setExportPasswordConfirm(e.target.value)}
              />
            </>
          )}

          <button type="button" className="btn btn-primary btn-sm" disabled={exporting} onClick={handleExport}>
            {exporting ? 'Exportando…' : 'Baixar arquivo'}
          </button>

          {exportError && (
            <p className="alert alert-error" role="alert">
              {exportError}
            </p>
          )}
          {exportMessage && (
            <p className="alert alert-success" role="status">
              {exportMessage}
            </p>
          )}
        </div>
      )}

      {importFile && (
        <div className="settings-export-panel">
          <p className="lede">Arquivo selecionado: {importFile.name}</p>
          {importEncrypted && (
            <input
              type="password"
              placeholder="Senha do arquivo cifrado"
              value={importPassword}
              onChange={(e) => setImportPassword(e.target.value)}
            />
          )}
          <button type="button" className="btn btn-primary btn-sm" disabled={importing} onClick={handleImport}>
            {importing ? 'Importando…' : 'Importar'}
          </button>
        </div>
      )}

      {importError && (
        <p className="alert alert-error" role="alert">
          {importError}
        </p>
      )}
      {importMessage && (
        <p className="alert alert-success" role="status">
          {importMessage}
        </p>
      )}
    </div>
  );
}
