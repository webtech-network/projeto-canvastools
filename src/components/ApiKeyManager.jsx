'use client';

import { useState } from 'react';
import { CircleCheck } from 'lucide-react';

// Shared between the Profile page (where keys are managed, one instance per
// registered provider — see src/lib/aiProviders) and QuestionGenerator
// (which only reads which providers have a key configured) — both read/write
// the same session.aiApiKeys[provider.id] via this same form, so there is a
// single source of truth per provider.
export default function ApiKeyManager({ provider, hasApiKey }) {
  const [keyConfigured, setKeyConfigured] = useState(hasApiKey);
  const [showKeyForm, setShowKeyForm] = useState(!hasApiKey);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSaveKey() {
    if (!apiKeyInput.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/ai/${provider.id}/key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Falha ao validar a chave.');
      } else {
        setKeyConfigured(true);
        setShowKeyForm(false);
        setApiKeyInput('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveKey() {
    setSaving(true);
    setError(null);
    try {
      await fetch(`/api/ai/${provider.id}/key`, { method: 'DELETE' });
      setKeyConfigured(false);
      setShowKeyForm(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="api-key-manager">
      <h3>{provider.label}</h3>

      {!keyConfigured || showKeyForm ? (
        <div className="ai-key-form">
          <label htmlFor={`${provider.id}-key`}>Chave de API</label>
          <input
            id={`${provider.id}-key`}
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="sk-..."
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || !apiKeyInput.trim()}
            onClick={handleSaveKey}
          >
            {saving ? 'Validando…' : 'Salvar e validar chave'}
          </button>
          {keyConfigured && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowKeyForm(false)}>
              Cancelar
            </button>
          )}
          {error && <div className="alert alert-error">{error}</div>}
        </div>
      ) : (
        <div className="ai-key-status">
          <span>
            Chave configurada <CircleCheck size={14} strokeWidth={2} className="inline-icon" />
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowKeyForm(true)}>
            Trocar chave
          </button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={saving} onClick={handleRemoveKey}>
            Remover
          </button>
        </div>
      )}
    </div>
  );
}
