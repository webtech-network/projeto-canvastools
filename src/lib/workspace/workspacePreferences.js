// Two-tier preference system for the Tarefas module's view state (card
// density, default view, per-column Kanban collapse):
//  - "default" tier — persistent (localStorage), edited only via /perfil's
//    Preferências tab (TarefasPreferences.jsx). What a brand-new browser
//    session starts from.
//  - "session" tier — sessionStorage, written automatically by
//    WorkspaceProvider.jsx whenever the professor toggles one of these
//    straight from the Tarefas toolbar or a Kanban column's own close
//    button. Takes precedence over the default for the rest of this browser
//    tab's session, without touching the persistent default itself —
//    closing the tab clears it, so the next session starts from the
//    default again.
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
  // Which Kanban column statuses start collapsed (narrow strip — see
  // KanbanColumn.jsx). Used to be a single `stagesCollapsed` boolean
  // covering only BACKLOG+BLOCK together; generalized to a status list so
  // any column can be closed independently, via its own header button.
  collapsedColumns: [],
  // "Agrupar por projeto" toolbar toggle (WorkspaceView.jsx) — clusters each
  // view's task list by project (see grouping.js's groupTasksByProject)
  // instead of one flat list.
  groupByProject: false,
};

function migrateLegacyPreferences() {
  const legacy = {};
  const legacyDensity = window.localStorage.getItem(LEGACY_DENSITY_KEY);
  if (legacyDensity === 'condensed' || legacyDensity === 'expanded') legacy.cardDensity = legacyDensity;
  if (window.localStorage.getItem(LEGACY_STAGES_COLLAPSED_KEY) === '1') legacy.collapsedColumns = ['BACKLOG', 'BLOCK'];
  window.localStorage.removeItem(LEGACY_DENSITY_KEY);
  window.localStorage.removeItem(LEGACY_STAGES_COLLAPSED_KEY);
  if (Object.keys(legacy).length > 0) {
    window.localStorage.setItem(DEFAULTS_KEY, JSON.stringify({ ...FALLBACK_PREFERENCES, ...legacy }));
  }
  return legacy;
}

// Converts a still-on-disk `{ stagesCollapsed: boolean }` (the shape this
// module used before per-column collapse existed) into the current
// `collapsedColumns` array shape — same one-time-fold-in idea as
// migrateLegacyPreferences above, just one layer later.
function migrateStagesCollapsedField(stored) {
  if (stored.collapsedColumns !== undefined || typeof stored.stagesCollapsed !== 'boolean') return stored;
  const { stagesCollapsed, ...rest } = stored;
  return { ...rest, collapsedColumns: stagesCollapsed ? ['BACKLOG', 'BLOCK'] : [] };
}

export function getDefaultPreferences() {
  if (typeof window === 'undefined') return FALLBACK_PREFERENCES;
  try {
    if (window.localStorage.getItem(DEFAULTS_KEY) === null) {
      return { ...FALLBACK_PREFERENCES, ...migrateLegacyPreferences() };
    }
    const stored = migrateStagesCollapsedField(JSON.parse(window.localStorage.getItem(DEFAULTS_KEY) || '{}'));
    return { ...FALLBACK_PREFERENCES, ...stored };
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
// initial density/view/collapsedColumns.
export function resolveWorkspacePreferences() {
  return { ...getDefaultPreferences(), ...getSessionOverride() };
}
