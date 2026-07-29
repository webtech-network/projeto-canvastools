import { NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';
import { generateQuestions } from '@/lib/aiProviders/openai';
import { validateStructural, createSchemaValidator } from '@/lib/quizValidation';
import quizSchema from '@/lib/quiz.schema.json';

const NIVEIS = ['baixo', 'intermediario', 'alto'];
const TIPOS = ['RU', 'CM', 'AR'];

function validateSpecs(specs) {
  if (!Array.isArray(specs) || specs.length === 0) {
    return 'É necessário informar ao menos uma questão.';
  }
  for (const spec of specs) {
    if (!spec || typeof spec.tema !== 'string' || !spec.tema.trim()) {
      return 'Cada questão precisa de um tema.';
    }
    if (!Number.isInteger(spec.quantidade) || spec.quantidade < 1) {
      return `Quantidade inválida para o tema "${spec.tema}".`;
    }
    if (!NIVEIS.includes(spec.nivel)) {
      return `Nível inválido: ${spec.nivel}.`;
    }
    if (!TIPOS.includes(spec.tipo)) {
      return `Tipo inválido: ${spec.tipo}.`;
    }
  }
  return null;
}

export async function POST(request) {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }

  const apiKey = session.aiApiKeys?.openai;
  if (!apiKey) {
    return NextResponse.json({ error: 'Nenhuma chave de API da OpenAI configurada.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { specs } = body || {};

  const specsError = validateSpecs(specs);
  if (specsError) {
    return NextResponse.json({ error: specsError }, { status: 400 });
  }

  let quiz;
  try {
    quiz = await generateQuestions({ apiKey, model: process.env.OPENAI_MODEL, specs });
  } catch (err) {
    const message = err.response?.data?.error?.message || err.message || 'Falha ao gerar questões.';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const structural = validateStructural(quiz);
  if (!structural.valid) {
    return NextResponse.json(
      { error: 'A OpenAI retornou questões inválidas.', details: structural.errors },
      { status: 502 },
    );
  }

  const checkSchema = createSchemaValidator(quizSchema);
  const warnings = checkSchema(quiz);

  return NextResponse.json({ quiz, warnings });
}
