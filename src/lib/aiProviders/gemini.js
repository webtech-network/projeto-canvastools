import axios from 'axios';
import { SYSTEM_PROMPT, buildUserMessage, buildQuizOutputSchema } from './shared';

export const id = 'gemini';
export const label = 'Google Gemini';
export const defaultModel = 'gemini-2.0-flash';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Gemini's native `responseSchema` field uses a proto-derived schema dialect
// (type names, nesting support) that's easy to get subtly wrong from outside
// the SDK. Instead of wiring the schema into that field, we only ask for
// `responseMimeType: 'application/json'` (plain JSON mode) and describe the
// exact shape in the prompt as standard JSON Schema text — same schema
// every other adapter uses, just conveyed differently. Output is still
// re-validated after the fact via validateStructural(), same as the others.
const QUIZ_SCHEMA_TEXT = JSON.stringify(buildQuizOutputSchema());

export async function validateApiKey(apiKey) {
  try {
    await axios.get(`${BASE_URL}/models`, { params: { key: apiKey } });
    return { valid: true };
  } catch (error) {
    if (error.response?.status === 400 || error.response?.status === 403) {
      return { valid: false, error: 'Chave de API inválida ou sem permissão.' };
    }
    return { valid: false, error: 'Não foi possível validar a chave junto ao Gemini. Tente novamente.' };
  }
}

export async function generateQuestions({ apiKey, model, specs }) {
  const prompt = `${buildUserMessage(specs)}\n\nResponda apenas com um único objeto JSON que siga rigorosamente este JSON Schema, sem markdown e sem texto fora do JSON:\n${QUIZ_SCHEMA_TEXT}`;

  const response = await axios.post(
    `${BASE_URL}/models/${model || defaultModel}:generateContent`,
    {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    },
    { params: { key: apiKey } },
  );

  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('A resposta do Gemini não contém conteúdo utilizável.');
  }

  return JSON.parse(text);
}
