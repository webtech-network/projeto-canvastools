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

export async function generateQuestions({ apiKey, model, specs }) {
  const response = await axios.post(
    'https://api.openai.com/v1/responses',
    {
      model: model || defaultModel,
      input: [
        { role: 'system', content: SYSTEM_PROMPT },
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

export async function suggestReply({ apiKey, model, context }) {
  const response = await axios.post(
    'https://api.openai.com/v1/responses',
    {
      model: model || defaultModel,
      input: [
        { role: 'system', content: REPLY_SYSTEM_PROMPT },
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

export async function improveMessage({ apiKey, model, text }) {
  const response = await axios.post(
    'https://api.openai.com/v1/responses',
    {
      model: model || defaultModel,
      input: [
        { role: 'system', content: IMPROVE_SYSTEM_PROMPT },
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
