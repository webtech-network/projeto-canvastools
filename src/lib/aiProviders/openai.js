import axios from 'axios';
import quizSchema from '@/lib/quiz.schema.json';

const DEFAULT_MODEL = 'gpt-4o-mini';

const NIVEL_LABELS = {
  baixo: 'Básico',
  intermediario: 'Intermediário',
  alto: 'Avançado',
};

const TIPO_LABELS = {
  RU: 'RU (Resposta Única)',
  CM: 'CM (Complementação Múltipla)',
  AR: 'AR (Asserção-Razão)',
};

/**
 * OpenAI's Structured Outputs strict mode doesn't support `contains` /
 * `minContains` / `maxContains`, which is how quiz.schema.json enforces
 * "exactly one correct answer" per question — so that constraint is stripped
 * here and re-checked after generation via validateStructural instead.
 * course_id/quiz_id are narrowed from ["integer","null"] to plain "integer"
 * since we always emit 0, never null (matches the enade-it-questions skill's
 * own convention for unset course/quiz codes).
 */
function buildOpenAiSchema() {
  const schema = JSON.parse(JSON.stringify(quizSchema));
  delete schema.$defs.question.properties.answers.allOf;
  schema.properties.course_id = { type: 'integer' };
  schema.properties.quiz_id = { type: 'integer' };
  return schema;
}

const OPENAI_SCHEMA = buildOpenAiSchema();

const SYSTEM_PROMPT = `Você é um elaborador de questões objetivas no padrão ENADE para cursos de Engenharia de Software, Sistemas de Informação e Ciência da Computação.

Gere questões seguindo rigorosamente estas regras estruturais por modelo:

- RU (Resposta Única): uma alternativa correta e quatro distratores plausíveis (5 alternativas no total).
- CM (Complementação Múltipla): quatro afirmativas (I a IV), sendo ao menos uma falsa e ao menos duas verdadeiras; cinco alternativas combinando subconjuntos dessas afirmativas de forma não óbvia.
- AR (Asserção-Razão): duas asserções ligadas por "PORQUE"; exatamente cinco alternativas, sempre nesta ordem exata: (1) as duas são verdadeiras e a segunda justifica a primeira; (2) as duas são verdadeiras mas a segunda não justifica a primeira; (3) a primeira é verdadeira e a segunda é falsa; (4) a primeira é falsa e a segunda é verdadeira; (5) as duas são falsas.

Regras obrigatórias para todos os modelos:
- Proibido enunciados negativos (não use "exceto", "incorreta", "não" no enunciado).
- Proibido termos absolutistas em qualquer alternativa (sempre, nunca, todo, totalmente, apenas, obrigatoriamente).
- O comentário da alternativa correta deve começar exatamente com a frase "Alternativa correta." seguida de reforço do conceito e uma informação extra de aprofundamento.
- question_text e answer_comment devem conter HTML (ex.: <p>, <ul><li>, <pre><code>, <strong>/<em>), nunca Markdown.
- course_id e quiz_id devem ser sempre 0 (nunca null) — o nível cognitivo e o tema não têm campo próprio no schema, então devem ser registrados em question_name (ex.: "Questão 3 — Normalização (Avançado)").
- question_model deve usar a forma estendida do enum (ex.: "RU (Resposta Única)").
- points_possible deve ser um número maior que zero (use 1 se não houver indicação).

Responda apenas com o JSON solicitado, sem texto adicional.`;

function buildUserMessage(specs) {
  const lines = specs.map(
    (spec, i) =>
      `${i + 1}. Tema: "${spec.tema}" — Nível: ${NIVEL_LABELS[spec.nivel] || spec.nivel} — Tipo: ${
        TIPO_LABELS[spec.tipo] || spec.tipo
      } — Quantidade: ${spec.quantidade}`,
  );
  const total = specs.reduce((sum, spec) => sum + spec.quantidade, 0);
  return `Gere exatamente ${total} questão(ões) no total, respeitando a quantidade pedida para cada especificação abaixo, na ordem apresentada (não misture temas dentro da mesma especificação):\n\n${lines.join('\n')}`;
}

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
      model: model || DEFAULT_MODEL,
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
