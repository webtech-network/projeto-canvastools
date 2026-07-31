import axios from 'axios';
import { SYSTEM_PROMPT, buildUserMessage, buildQuizOutputSchema } from './shared';
import { REPLY_SYSTEM_PROMPT, buildReplyUserMessage } from './replyPrompt';
import { IMPROVE_SYSTEM_PROMPT, buildImproveUserMessage } from './improvePrompt';

export const id = 'claude';
export const label = 'Anthropic Claude';
export const defaultModel = 'claude-sonnet-5';

const BASE_URL = 'https://api.anthropic.com/v1';
const ANTHROPIC_VERSION = '2023-06-01';

const QUIZ_SCHEMA = buildQuizOutputSchema();

function authHeaders(apiKey) {
  return {
    'x-api-key': apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
  };
}

export async function validateApiKey(apiKey) {
  try {
    await axios.get(`${BASE_URL}/models`, { headers: authHeaders(apiKey) });
    return { valid: true };
  } catch (error) {
    if (error.response?.status === 401) {
      return { valid: false, error: 'Chave de API inválida ou sem permissão.' };
    }
    return { valid: false, error: 'Não foi possível validar a chave junto à Anthropic. Tente novamente.' };
  }
}

export async function generateQuestions({ apiKey, model, specs }) {
  // Structured output via forced tool use: Claude must call `emit_quiz`, and
  // Anthropic parses its input against input_schema for us — no JSON.parse
  // of free text needed, unlike the OpenAI/Gemini adapters.
  const response = await axios.post(
    `${BASE_URL}/messages`,
    {
      model: model || defaultModel,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(specs) }],
      tools: [
        {
          name: 'emit_quiz',
          description: 'Emite o quiz gerado, no formato solicitado.',
          input_schema: QUIZ_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: 'emit_quiz' },
    },
    { headers: authHeaders(apiKey) },
  );

  const toolUse = (response.data?.content || []).find((block) => block.type === 'tool_use');
  if (!toolUse) {
    throw new Error('A resposta da Anthropic não contém conteúdo utilizável.');
  }

  return toolUse.input;
}

export async function suggestReply({ apiKey, model, context }) {
  const response = await axios.post(
    `${BASE_URL}/messages`,
    {
      model: model || defaultModel,
      max_tokens: 1024,
      system: REPLY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildReplyUserMessage(context) }],
    },
    { headers: authHeaders(apiKey) },
  );

  const textBlock = (response.data?.content || []).find((block) => block.type === 'text');
  if (!textBlock) {
    throw new Error('A resposta da Anthropic não contém conteúdo utilizável.');
  }

  return textBlock.text;
}

export async function improveMessage({ apiKey, model, text }) {
  const response = await axios.post(
    `${BASE_URL}/messages`,
    {
      model: model || defaultModel,
      max_tokens: 1024,
      system: IMPROVE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildImproveUserMessage(text) }],
    },
    { headers: authHeaders(apiKey) },
  );

  const textBlock = (response.data?.content || []).find((block) => block.type === 'text');
  if (!textBlock) {
    throw new Error('A resposta da Anthropic não contém conteúdo utilizável.');
  }

  return textBlock.text;
}
