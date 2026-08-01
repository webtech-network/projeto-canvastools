import { dbGet, dbGetAll, dbPut, dbDelete, STORE_PROMPTS } from './indexedDb';
import { SYSTEM_PROMPT } from './aiProviders/shared';
import { REPLY_SYSTEM_PROMPT } from './aiProviders/replyPrompt';
import { IMPROVE_SYSTEM_PROMPT } from './aiProviders/improvePrompt';

// One entry per AI-backed capability in the app — `key` must match what the
// three trigger components (QuestionGenerator, MessageList, ComposeMessage)
// send as `customPromptText`/`customPromptMode` in their POST bodies, and
// what the three AI routes read from the request body. `defaultPrompt` is
// imported only for display/preview purposes here (PromptCustomizer shows
// it read-only) — the actual default used at generation time still lives in
// each route, resolved server-side.
export const CAPABILITIES = [
  { key: 'generateQuestions', label: 'Geração de questões', defaultPrompt: SYSTEM_PROMPT },
  { key: 'suggestReply', label: 'Sugestão de resposta', defaultPrompt: REPLY_SYSTEM_PROMPT },
  { key: 'improveMessage', label: 'Melhoria de mensagem', defaultPrompt: IMPROVE_SYSTEM_PROMPT },
];

export async function getCustomPrompt(capability) {
  return (await dbGet(STORE_PROMPTS, capability)) || null;
}

export async function getAllCustomPrompts() {
  return dbGetAll(STORE_PROMPTS);
}

// mode: 'append' (default — text is appended to the default prompt) or
// 'replace' (text replaces the default prompt entirely).
export async function saveCustomPrompt(capability, { text, mode }) {
  const record = { capability, text, mode: mode === 'replace' ? 'replace' : 'append', updatedAt: Date.now() };
  await dbPut(STORE_PROMPTS, record);
  return record;
}

export async function clearCustomPrompt(capability) {
  await dbDelete(STORE_PROMPTS, capability);
}
