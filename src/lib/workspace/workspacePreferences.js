// Two-tier preference system for the Tarefas module's view state (card
// density, default view, Backlog/Block collapse):
//  - "default" tier — persistent (localStorage), edited only via /perfil's
//    Preferências tab (TarefasPreferences.jsx). What a brand-new browser
//    session starts from.
//  - "session" tier — sessionStorage, written automatically by
//    WorkspaceProvider.jsx whenever the professor toggles one of these
//    straight from the Tarefas toolbar. Takes precedence over the default
//    for the rest of this browser tab's session, without touching the
//    persistent default itself — closing the tab clears it, so the next
//    session starts from the default again.
const DEFAULTS_KEY = 'canvastools:tarefas-default-prefs';
const SESSION_KEY = 'canvastools:tarefas-session-prefs';

// Pre-dates this two-tier system — density and Backlog/Block collapse used
// to each persist under their own always-on localStorage key, no "default
// vs session" distinction. Folded into the new default tier below (one-time,
// on first read) so a professor who'd already set these doesn't see them
// silently reset to FALLBACK_PREFERENCES.
const LEGACY_DENSITY_KEY = 'canvastools:workspace-card-density';
const LEGACY_STAGES_COLLAPSED_KEY = 'canvastools:workspace-stages-collapsed';

export const FALLBACK_PREFERENCES = {
  cardDensity: 'expanded',
  view: 'kanban',
  stagesCollapsed: false,
};

function migrateLegacyPreferences() {
  const legacy = {};
  const legacyDensity = window.localStorage.getItem(LEGACY_DENSITY_KEY);
  if (legacyDensity === 'condensed' || legacyDensity === 'expanded') legacy.cardDensity = legacyDensity;
  if (window.localStorage.getItem(LEGACY_STAGES_COLLAPSED_KEY) === '1') legacy.stagesCollapsed = true;
  window.localStorage.removeItem(LEGACY_DENSITY_KEY);
  window.localStorage.removeItem(LEGACY_STAGES_COLLAPSED_KEY);
  if (Object.keys(legacy).length > 0) {
    window.localStorage.setItem(DEFAULTS_KEY, JSON.stringify({ ...FALLBACK_PREFERENCES, ...legacy }));
  }
  return legacy;
}

export function getDefaultPreferences() {
  if (typeof window === 'undefined') return FALLBACK_PREFERENCES;
  try {
    if (window.localStorage.getItem(DEFAULTS_KEY) === null) {
      return { ...FALLBACK_PREFERENCES, ...migrateLegacyPreferences() };
    }
    return { ...FALLBACK_PREFERENCES, ...JSON.parse(window.localStorage.getItem(DEFAULTS_KEY) || '{}') };
  } catch {
    return FALLBACK_PREFERENCES;
  }
}

// Called only from TarefasPreferences.jsx (the /perfil settings form) —
// never from the Tarefas toolbar itself, see patchSessionOverride below.
export function patchDefaultPreferences(patch) {
  const current = getDefaultPreferences();
  window.localStorage.setItem(DEFAULTS_KEY, JSON.stringify({ ...current, ...patch }));
}

function getSessionOverride() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || '{}');
  } catch {
    return {};
  }
}

// Called from WorkspaceProvider.jsx's setCardDensity/setView/
// setStagesCollapsed — every toggle made directly on the Tarefas screen
// lands here, not in the persistent default.
export function patchSessionOverride(patch) {
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...getSessionOverride(), ...patch }));
}

// Merges the persistent default with this tab's session override (session
// wins) — called once, on WorkspaceProvider mount, to resolve the module's
// initial density/view/stagesCollapsed.
export function resolveWorkspacePreferences() {
  return { ...getDefaultPreferences(), ...getSessionOverride() };
}
