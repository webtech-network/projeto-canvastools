// quiz.schema.json declares itself as a 2020-12 schema ($schema:
// ".../draft/2020-12/schema"); ajv's default export only understands
// draft-07, so the 2020-12-aware build is required here.
import Ajv2020 from 'ajv/dist/2020.js';

/**
 * Cheap, blocking checks — the minimum a file needs to actually be postable to
 * Canvas. Mirrors what the CLI already enforced before this refactor.
 */
export function validateStructural(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['O arquivo não contém um objeto JSON válido.'] };
  }

  if (data.course_id === undefined || data.course_id === null) {
    errors.push("Campo obrigatório ausente: 'course_id'.");
  }
  if (data.quiz_id === undefined || data.quiz_id === null) {
    errors.push("Campo obrigatório ausente: 'quiz_id'.");
  }
  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    errors.push("O campo 'questions' deve ser uma lista com ao menos uma questão.");
    return { valid: false, errors };
  }

  data.questions.forEach((q, i) => {
    const label = `Questão ${i + 1}${q && q.question_name ? ` ("${q.question_name}")` : ''}`;

    if (!q || typeof q !== 'object') {
      errors.push(`${label}: não é um objeto válido.`);
      return;
    }
    if (!q.question_name || typeof q.question_name !== 'string') {
      errors.push(`${label}: 'question_name' ausente ou inválido.`);
    }
    if (!q.question_text || typeof q.question_text !== 'string') {
      errors.push(`${label}: 'question_text' ausente ou inválido.`);
    }
    if (!Array.isArray(q.answers) || q.answers.length < 2) {
      errors.push(`${label}: precisa de ao menos 2 alternativas em 'answers'.`);
    } else {
      const correctCount = q.answers.filter((a) => a && a.is_correct === true).length;
      if (correctCount !== 1) {
        errors.push(`${label}: deve haver exatamente 1 alternativa correta (encontradas: ${correctCount}).`);
      }
      q.answers.forEach((a, j) => {
        if (!a || typeof a.answer_text !== 'string' || !a.answer_text) {
          errors.push(`${label}, alternativa ${j + 1}: 'answer_text' ausente ou inválido.`);
        }
      });
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Compiles an ajv validator for the given (already-parsed) schema object.
 * Kept schema-agnostic on purpose: Next.js's bundler and the plain-Node CLI
 * need different JSON import syntax, so each call site imports quiz.schema.json
 * itself and passes the parsed object in here.
 */
export function createSchemaValidator(schemaObject) {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(schemaObject);
  return function checkSchema(data) {
    const valid = validate(data);
    return valid ? [] : summarizeSchemaWarnings(validate.errors || []);
  };
}

/**
 * Turns raw ajv errors into a short, deduplicated, human-readable list.
 * Real question banks routinely deviate from quiz.schema.json (missing
 * question_model, extra fields like `nivel`) without being "wrong" — these
 * are surfaced as warnings, never as blocking errors.
 */
export function summarizeSchemaWarnings(ajvErrors) {
  if (!ajvErrors || ajvErrors.length === 0) return [];

  const missingByProp = new Map();
  const extraByProp = new Map();
  const other = new Set();

  for (const err of ajvErrors) {
    if (err.keyword === 'required') {
      const prop = err.params?.missingProperty ?? 'desconhecido';
      missingByProp.set(prop, (missingByProp.get(prop) || 0) + 1);
    } else if (err.keyword === 'additionalProperties') {
      const prop = err.params?.additionalProperty ?? 'desconhecido';
      extraByProp.set(prop, (extraByProp.get(prop) || 0) + 1);
    } else {
      const path = err.instancePath || '(raiz)';
      other.add(`${path}: ${err.message}`);
    }
  }

  const warnings = [];
  for (const [prop, count] of missingByProp) {
    warnings.push(`Campo '${prop}' ausente em ${count} local(is) (fora do padrão de quiz.schema.json).`);
  }
  for (const [prop, count] of extraByProp) {
    warnings.push(`Campo '${prop}' não previsto no schema encontrado em ${count} local(is).`);
  }
  warnings.push(...other);
  return warnings;
}

/**
 * Maps this tool's question shape to the payload Canvas's quiz questions
 * endpoint expects.
 */
export function toCanvasPayload(question) {
  const answers = (question.answers || []).map((ans) => ({
    answer_text: ans.answer_text,
    answer_weight: ans.is_correct ? 100 : 0,
    answer_comment_html: ans.answer_comment || '',
  }));

  return {
    question: {
      question_name: question.question_name,
      question_text: question.question_text,
      question_type: 'multiple_choice_question',
      points_possible: question.points_possible || 1,
      answers,
    },
  };
}
