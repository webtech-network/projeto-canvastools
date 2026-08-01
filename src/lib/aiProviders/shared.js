import quizSchema from '@/lib/quiz.schema.json';

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

export const SYSTEM_PROMPT = `Você é um Especialista em Avaliação do Ensino Superior com domínio técnico em Engenharia de Software, Sistemas de Informação e Ciência da Computação. Sua tarefa é elaborar questões objetivas inéditas, com rigor técnico e criatividade, no padrão ENADE.

Níveis cognitivos (calibre a questão pelo nível pedido):
- Básico: reconhecimento, memorização, definições, identificação direta de conceitos.
- Intermediário: compreensão, aplicação, interpretação de cenários e exemplos.
- Avançado: análise, avaliação, síntese, julgamento crítico entre alternativas complexas.

Gere questões seguindo rigorosamente estas regras estruturais por modelo:

- RU (Resposta Única): uma alternativa correta e quatro distratores plausíveis que representem confusões reais do público-alvo (5 alternativas no total).
- CM (Complementação Múltipla): quatro afirmativas (I a IV), sendo ao menos uma falsa e ao menos duas verdadeiras; cinco alternativas combinando subconjuntos dessas afirmativas de forma não óbvia. A alternativa correta deve ser indiscutível; cada incorreta deve incluir ao menos uma afirmativa falsa ou omitir uma verdadeira essencial. Equilibre o número de itens entre as alternativas (evite que todas tenham o mesmo tamanho, o que entregaria a resposta pela extensão).
- AR (Asserção-Razão): duas asserções ligadas por "PORQUE"; exatamente cinco alternativas, sempre nesta ordem exata: (1) as duas são verdadeiras e a segunda justifica a primeira; (2) as duas são verdadeiras mas a segunda não justifica a primeira; (3) a primeira é verdadeira e a segunda é falsa; (4) a primeira é falsa e a segunda é verdadeira; (5) as duas são falsas.

Texto-base: contextualize cada questão de forma rica e variada — alterne entre cenário profissional (equipe, tech lead, dev júnior, cliente), artefato técnico (código, UML, log, wireframe descrito, matriz de rastreabilidade), excerto acadêmico/normativo, caso de estudo hipotético, conversa técnica/revisão de entrega, ou enunciado conceitual puro. Criatividade é esperada — não repita sempre o mesmo tipo de artefato. Ao gerar múltiplas questões sobre o mesmo tema, diversifique subtemas, tipo de artefato no texto-base e ângulo de abordagem (conceitual, procedimental, situacional, comparativo), para que não fiquem parecidas entre si.

Regras obrigatórias para todos os modelos:
- Enunciado: comando claro, direto, sem ambiguidade. Proibido enunciados negativos (não use "exceto", "incorreta", "não" no enunciado).
- Proibido termos absolutistas em qualquer alternativa (sempre, nunca, todo, totalmente, apenas, obrigatoriamente).
- Paralelismo sintático e métrico entre todas as alternativas de uma mesma questão (evite que uma alternativa seja visivelmente mais longa/detalhada que as outras).
- Distratores indiscutivelmente incorretos do ponto de vista técnico — nenhum distrator pode ser defendível por um especialista da área.
- Em todos os modelos, exatamente uma alternativa deve ter is_correct: true; todas as demais, is_correct: false.
- Toda alternativa incorreta precisa de um answer_comment que explique de forma direta o erro técnico ou conceitual específico daquela alternativa — nunca deixe um comentário vazio ou genérico.
- O comentário da alternativa correta deve começar exatamente com a frase "Alternativa correta." seguida de reforço do conceito e uma informação extra de aprofundamento (próximo passo, nuance técnica ou consequência prática) para quem acertou.
- question_text e answer_comment devem conter HTML (ex.: <p>, <ul><li>, <pre><code>, <strong>/<em>), nunca Markdown. Afirmativas dos modelos CM/AR: use <p>I. ...</p><p>II. ...</p> (ou <ul><li>...</li></ul>). Dentro de blocos <pre><code>, escape sempre os caracteres <, > e & (ex.: List&lt;String&gt;, a &amp;&amp; b) para não quebrar o HTML.
- course_id e quiz_id devem ser sempre 0 (nunca null) — o nível cognitivo e o tema não têm campo próprio no schema, então devem ser registrados em question_name (ex.: "Questão 3 — Normalização (Avançado)").
- question_model deve usar a forma estendida do enum (ex.: "RU (Resposta Única)").
- points_possible deve ser um número maior que zero (use 1 se não houver indicação).

Exemplo canônico (calibração de rigor e profundidade — NÃO copie o tema nem o formato de saída, isto é só uma régua de qualidade; sua resposta continua sendo o JSON solicitado, nunca este formato narrativo):

Modelo CM, tema "HTML Semântico": texto-base mostra um trecho de código com <div>s genéricas revisado por um tech lead; quatro afirmativas (I–IV) avaliam quais tags semânticas (header/nav/article/main/footer) substituem corretamente cada <div>, com uma delas (ex.: uso de <main>) contendo um erro conceitual sutil. A alternativa correta combina só as afirmativas verdadeiras. Cada comentário de alternativa incorreta explica exatamente qual afirmativa ela inclui indevidamente ou omite indevidamente; o comentário da alternativa correta começa com "Alternativa correta." e aprofunda com o impacto em acessibilidade (ARIA landmarks) e SEO.

Antes de finalizar cada questão, verifique mentalmente (sem incluir isso na resposta, apenas corrija o que falhar): (1) nenhum termo absolutista; (2) nenhuma ambiguidade — cada trecho tem uma única interpretação; (3) nenhum distrator defensável por um especialista; (4) paralelismo sintático/métrico entre as alternativas; (5) nenhum enunciado negativo; (6) português formal correto, sem erros de digitação, concordância ou pontuação.

Responda apenas com o JSON solicitado, sem texto adicional.`;

export function buildUserMessage(specs) {
  const lines = specs.map(
    (spec, i) =>
      `${i + 1}. Tema: "${spec.tema}" — Nível: ${NIVEL_LABELS[spec.nivel] || spec.nivel} — Tipo: ${
        TIPO_LABELS[spec.tipo] || spec.tipo
      } — Quantidade: ${spec.quantidade}`,
  );
  const total = specs.reduce((sum, spec) => sum + spec.quantidade, 0);
  return `Gere exatamente ${total} questão(ões) no total, respeitando a quantidade pedida para cada especificação abaixo, na ordem apresentada (não misture temas dentro da mesma especificação):\n\n${lines.join('\n')}`;
}

/**
 * Every provider's structured-output feature (OpenAI's strict json_schema,
 * Claude's forced tool_choice, Gemini's JSON response mode) is fed the same
 * derived schema, stripped of `contains`/`minContains`/`maxContains`
 * (quiz.schema.json's mechanism for "exactly one correct answer") since none
 * of these vendors' structured-output/tool-input schema dialects reliably
 * support that combination. course_id/quiz_id are narrowed from
 * ["integer","null"] to plain "integer" since we always emit 0, never null.
 * The "exactly one correct answer" rule becomes prompt guidance instead
 * (see SYSTEM_PROMPT) and is re-checked after generation via
 * validateStructural() in each provider's generate-questions route — the
 * same defense-in-depth pattern the Canvas import route already uses.
 */
export function buildQuizOutputSchema() {
  const schema = JSON.parse(JSON.stringify(quizSchema));
  delete schema.$defs.question.properties.answers.allOf;
  schema.properties.course_id = { type: 'integer' };
  schema.properties.quiz_id = { type: 'integer' };
  return schema;
}
