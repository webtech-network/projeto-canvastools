// Pure function, no IndexedDB/browser dependency — safely importable both
// client-side (for the PromptCustomizer live preview) and server-side
// (inside the three AI route handlers, which never touch IndexedDB
// themselves; the client sends the raw custom text + mode and each route
// resolves it against its own default prompt constant).
export function resolvePrompt(defaultPrompt, customText, mode) {
  const trimmed = customText?.trim();
  if (!trimmed) return defaultPrompt;
  if (mode === 'replace') return trimmed;
  return `${defaultPrompt}\n\n---\n\nInstruções adicionais do professor:\n${trimmed}`;
}
