'use client';

import { useState } from 'react';

// Shared between the Profile page (where keys are managed) and QuestionGenerator
// (which only reads whether a key is configured) — both read/write the same
// session.aiApiKeys.openai via this same form, so there is a single source of truth.
export default function ApiKeyManager({ hasApiKey }) {
  const [keyConfigured, setKeyConfigured] = useState(hasApiKey);
  const [showKeyForm, setShowKeyForm] = useState(!hasApiKey);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [keySaving, setKeySaving] = useState(false);
  const [keyError, setKeyError] = useState(null);

  async function handleSaveKey() {
    if (!apiKeyInput.trim()) return;
    setKeySaving(true);
    setKeyError(null);
    try {
      const response = await fetch('/api/ai/openai/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setKeyError(data.error || 'Falha ao validar a chave.');
      } else {
        setKeyConfigured(true);
        setShowKeyForm(false);
        setApiKeyInput('');
      }
    } catch (err) {
      setKeyError(err.message);
    } finally {
      setKeySaving(false);
    }
  }

  return (
    <div className="api-key-manager">
      <h2>OpenAI</h2>
      <p className="lede">
        Usada pela geração de questões com IA em <strong>Questões</strong>.
      </p>

      {!keyConfigured || showKeyForm ? (
        <div className="ai-key-form">
          <label htmlFor="openai-key">Chave de API da OpenAI</label>
          <input
            id="openai-key"
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="sk-..."
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={keySaving || !apiKeyInput.trim()}
            onClick={handleSaveKey}
          >
            {keySaving ? 'Validando…' : 'Salvar e validar chave'}
          </button>
          {keyConfigured && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowKeyForm(false)}>
              Cancelar
            </button>
          )}
          {keyError && <div className="alert alert-error">{keyError}</div>}
        </div>
      ) : (
        <div className="ai-key-status">
          <span>Chave da OpenAI configurada ✓</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowKeyForm(true)}>
            Trocar chave
          </button>
        </div>
      )}
    </div>
  );
}
