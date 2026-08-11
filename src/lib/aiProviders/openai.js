import axios from 'axios';
import { SYSTEM_PROMPT, buildUserMessage, buildQuizOutputSchema } from './shared';
import { REPLY_SYSTEM_PROMPT, buildReplyUserMessage } from './replyPrompt';
import { IMPROVE_SYSTEM_PROMPT, buildImproveUserMessage } from './improvePrompt';

export const id = 'openai';
export const label = 'OpenAI (ChatGPT)';
export const defaultModel = 'gpt-4o-mini';

const OPENAI_SCHEMA = buildQuizOutputSchema();

export async function validateApiKey(apiKey) {
  try {
    await axios.get('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return { valid: true };
  } catch (error) {
    if (error.response?.status === 401) {
      return { valid: false, error: 'Chave de API inválida ou sem permissão.' };
    }
    return { valid: false, error: 'Não foi possível validar a chave junto à OpenAI. Tente novamente.' };
  }
}

// GET /v1/models returns every model OpenAI has (chat, embeddings, whisper,
// tts, dall-e, moderation, ...) with no capability/type field to filter by —
// unlike Anthropic's and Gemini's equivalents. Filtering down to
// chat/Responses-API-capable models is therefore a heuristic on the id
// string, not something the API tells us directly.
const NON_CHAT_MODEL_PATTERN =
  /whisper|tts|dall-e|embedding|moderation|davinci|babbage|curie|(^|-)ada(-|$)|audio|realtime|transcribe|image|computer-use|search-preview/i;

export async function listModels(apiKey) {
  const response = await axios.get('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return (response.data?.data || [])
    .filter((m) => !NON_CHAT_MODEL_PATTERN.test(m.id))
    .sort((a, b) => (b.created || 0) - (a.created || 0))
    .map((m) => ({ id: m.id, label: m.id }));
}

export async function generateQuestions({ apiKey, model, specs, systemPrompt = SYSTEM_PROMPT }) {
  const response = await axios.post(
    'https://api.openai.com/v1/responses',
    {
      model: model || defaultModel,
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildUserMessage(specs) },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'quiz',
          schema: OPENAI_SCHEMA,
          strict: true,
        },
      },
    },
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );

  const data = response.data;
  if (data.status !== 'completed') {
    throw new Error(`Geração não concluída pela OpenAI (status: ${data.status}).`);
  }

  const message = (data.output || []).find((item) => item.type === 'message');
  const content = message?.content?.find((c) => c.type === 'output_text' || c.type === 'refusal');

  if (!content) {
    throw new Error('A resposta da OpenAI não contém conteúdo utilizável.');
  }
  if (content.type === 'refusal') {
    throw new Error(`A OpenAI recusou a geração: ${content.refusal}`);
  }

  return JSON.parse(content.text);
}

export async function suggestReply({ apiKey, model, context, systemPrompt = REPLY_SYSTEM_PROMPT }) {
  const response = await axios.post(
    'https://api.openai.com/v1/responses',
    {
      model: model || defaultModel,
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildReplyUserMessage(context) },
      ],
    },
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );

  const data = response.data;
  if (data.status !== 'completed') {
    throw new Error(`Geração não concluída pela OpenAI (status: ${data.status}).`);
  }

  const message = (data.output || []).find((item) => item.type === 'message');
  const content = message?.content?.find((c) => c.type === 'output_text' || c.type === 'refusal');

  if (!content) {
    throw new Error('A resposta da OpenAI não contém conteúdo utilizável.');
  }
  if (content.type === 'refusal') {
    throw new Error(`A OpenAI recusou a geração: ${content.refusal}`);
  }

  return content.text;
}

export async function improveMessage({ apiKey, model, text, systemPrompt = IMPROVE_SYSTEM_PROMPT }) {
  const response = await axios.post(
    'https://api.openai.com/v1/responses',
    {
      model: model || defaultModel,
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildImproveUserMessage(text) },
      ],
    },
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );

  const data = response.data;
  if (data.status !== 'completed') {
    throw new Error(`Geração não concluída pela OpenAI (status: ${data.status}).`);
  }

  const message = (data.output || []).find((item) => item.type === 'message');
  const content = message?.content?.find((c) => c.type === 'output_text' || c.type === 'refusal');

  if (!content) {
    throw new Error('A resposta da OpenAI não contém conteúdo utilizável.');
  }
  if (content.type === 'refusal') {
    throw new Error(`A OpenAI recusou a geração: ${content.refusal}`);
  }

  return content.text;
}
