import * as openai from './openai';
import * as gemini from './gemini';
import * as claude from './claude';

/**
 * Adapter contract every provider module implements:
 *   id: string                 — stable key, used in session.aiApiKeys and route URLs
 *   label: string              — display name
 *   defaultModel: string       — used when no model override is supplied
 *   validateApiKey(apiKey): Promise<{ valid: boolean, error?: string }>
 *   generateQuestions({ apiKey, model, specs }): Promise<quiz>  — quiz.schema.json shape
 *   suggestReply({ apiKey, model, context }): Promise<string>  — plain-text reply suggestion
 *
 * To add a new provider: write a module implementing this contract (see
 * openai.js for the simplest reference) and add it to PROVIDERS below —
 * nothing else in the app needs to change.
 */
export const PROVIDERS = [openai, gemini, claude];

export function getProvider(providerId) {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  if (!provider) {
    throw new Error(`Provedor de IA desconhecido: ${providerId}`);
  }
  return provider;
}

export function listProviders() {
  return PROVIDERS.map(({ id, label, defaultModel }) => ({ id, label, defaultModel }));
}
