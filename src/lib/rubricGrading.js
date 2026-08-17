// Pure mapping helpers between this app's per-row grading state
// (`selections`, shaped `{ [criterionId]: { ratingId, points, comments } }`)
// and Canvas's own rubric_assessment/submission shapes. No schema validation
// here (unlike quizValidation.js) — the rubric's shape comes straight from
// Canvas's own API, not from an arbitrary uploaded file, so there's nothing
// untrusted to validate against.

// Canvas keys `submission.rubric_assessment` by criterion id already, so no
// rubric lookup is needed to read it back.
export function extractExistingSelections(submission) {
  const assessment = submission?.rubric_assessment;
  if (!assessment) return {};
  const selections = {};
  for (const [criterionId, data] of Object.entries(assessment)) {
    selections[criterionId] = {
      ratingId: data.rating_id ?? null,
      points: data.points ?? null,
      comments: data.comments || '',
    };
  }
  return selections;
}

export function computeTotalPoints(selections) {
  return Object.values(selections).reduce((sum, sel) => sum + (Number(sel?.points) || 0), 0);
}

function summarizeRubricSelections(rubric, selections) {
  const lines = rubric
    .map((criterion) => {
      const sel = selections[criterion.id];
      if (!sel || sel.points == null) return null;
      const rating = criterion.ratings?.find((r) => r.id === sel.ratingId);
      const label = rating?.description || `${sel.points} pts`;
      return `- ${criterion.description}: ${label} (${sel.points}/${criterion.points})`;
    })
    .filter(Boolean);
  return lines.length ? `Rubrica:\n${lines.join('\n')}` : '';
}

// `comment` is the professor's own free-text feedback; a readable rubric
// breakdown is appended after it — in ADDITION to the structured
// rubric_assessment below, not instead of it (the gap in the ported
// RubricTool prototype, which only ever sent this kind of text summary and
// never populated Canvas's own rubric UI).
export function buildGradePayload(rubric, selections, totalPoints, comment) {
  const rubricAssessment = {};
  for (const criterion of rubric) {
    const sel = selections[criterion.id];
    if (!sel || sel.points == null) continue;
    rubricAssessment[criterion.id] = {
      points: sel.points,
      rating_id: sel.ratingId || undefined,
      comments: sel.comments || undefined,
    };
  }

  const summary = summarizeRubricSelections(rubric, selections);
  const fullComment = [comment?.trim(), summary].filter(Boolean).join('\n\n');

  return {
    rubric_assessment: rubricAssessment,
    submission: { posted_grade: totalPoints },
    ...(fullComment ? { comment: { text_comment: fullComment } } : {}),
  };
}

// Fallback for an assignment with no rubric associated in Canvas —
// RubricGrader.jsx then shows a single "Nota" input per row instead of one
// <select> per criterion, so there's no rubric breakdown to attach.
export function buildSimpleGradePayload(grade, comment) {
  return {
    submission: { posted_grade: grade },
    ...(comment?.trim() ? { comment: { text_comment: comment.trim() } } : {}),
  };
}

const WORKFLOW_STATE_LABELS = {
  graded: 'Avaliada',
  submitted: 'Entregue',
  unsubmitted: 'Não entregue',
  pending_review: 'Aguardando revisão',
};

export function summarizeSubmissionStatus(submission) {
  if (submission.missing) return 'Faltando';
  if (submission.late) return 'Atrasada';
  return WORKFLOW_STATE_LABELS[submission.workflow_state] || submission.workflow_state || '—';
}
