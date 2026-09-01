'use client';

import { useEffect, useState } from 'react';
import { Rows3, Rows4, Columns3, Grid2x2, Table2, Layers, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { getDefaultPreferences, patchDefaultPreferences, FALLBACK_PREFERENCES } from '@/lib/workspace/workspacePreferences';

// Edits only the persistent "default" tier of the Tarefas module's view
// state — see workspacePreferences.js. Auto-saves on every click (same
// pattern as ThemeToggle.jsx, its neighbor in the Geral tab), no separate
// save button. Read after mount only, so the server-rendered markup never
// has to guess a localStorage value that isn't available during SSR.
//
// Same controls/icons as WorkspaceView.jsx's own Tarefas toolbar (icon-only
// segmented pairs for density/view, the single dual-icon Backlog/Block
// toggle) — deliberately, so picking a default here looks and behaves like
// the live control it's setting the starting value for.
export default function TarefasPreferences() {
  const [prefs, setPrefs] = useState(FALLBACK_PREFERENCES);

  useEffect(() => {
    setPrefs(getDefaultPreferences());
  }, []);

  function update(patch) {
    setPrefs((p) => ({ ...p, ...patch }));
    patchDefaultPreferences(patch);
  }

  // This preference is still a Backlog/Block pair (matching the toolbar
  // shortcut in WorkspaceView.jsx) — individual columns (including Backlog
  // or Block on their own) can still be closed per-session from their own
  // header button, that just isn't something a default value applies to.
  const collapsedColumns = prefs.collapsedColumns || [];
  const stagesCollapsed = collapsedColumns.includes('BACKLOG') && collapsedColumns.includes('BLOCK');

  function toggleStagesCollapsed() {
    const next = stagesCollapsed
      ? collapsedColumns.filter((s) => s !== 'BACKLOG' && s !== 'BLOCK')
      : Array.from(new Set([...collapsedColumns, 'BACKLOG', 'BLOCK']));
    update({ collapsedColumns: next });
  }

  return (
    <div className="preferences-section">
      <h3>Tarefas</h3>
      <p className="tab-folder-description">
        Valores padrão do módulo de Tarefas ao abri-lo pela primeira vez numa sessão do navegador. Alterações feitas
        diretamente na tela de Tarefas (densidade, visualização, Backlog/Block) valem só durante aquela sessão e não
        mudam esses padrões.
      </p>

      <label className="compose-message-field">
        <span>Densidade dos cards</span>
        <div className="segmented" role="radiogroup" aria-label="Densidade padrão">
          <button
            type="button"
            role="radio"
            aria-checked={prefs.cardDensity === 'expanded'}
            className={`segmented-btn icon-only${prefs.cardDensity === 'expanded' ? ' active' : ''}`}
            onClick={() => update({ cardDensity: 'expanded' })}
            title="Densidade aberta"
            aria-label="Densidade aberta"
          >
            <Rows3 size={16} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={prefs.cardDensity === 'condensed'}
            className={`segmented-btn icon-only${prefs.cardDensity === 'condensed' ? ' active' : ''}`}
            onClick={() => update({ cardDensity: 'condensed' })}
            title="Densidade condensada"
            aria-label="Densidade condensada"
          >
            <Rows4 size={16} strokeWidth={1.8} />
          </button>
        </div>
      </label>

      <label className="compose-message-field">
        <span>Visualização padrão</span>
        <div className="segmented" role="radiogroup" aria-label="Visualização padrão">
          <button
            type="button"
            role="radio"
            aria-checked={prefs.view === 'kanban'}
            className={`segmented-btn icon-only${prefs.view === 'kanban' ? ' active' : ''}`}
            onClick={() => update({ view: 'kanban' })}
            title="Kanban"
            aria-label="Kanban"
          >
            <Columns3 size={16} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={prefs.view === 'eisenhower'}
            className={`segmented-btn icon-only${prefs.view === 'eisenhower' ? ' active' : ''}`}
            onClick={() => update({ view: 'eisenhower' })}
            title="Matriz de Eisenhower"
            aria-label="Matriz de Eisenhower"
          >
            <Grid2x2 size={16} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={prefs.view === 'table'}
            className={`segmented-btn icon-only${prefs.view === 'table' ? ' active' : ''}`}
            onClick={() => update({ view: 'table' })}
            title="Tabela"
            aria-label="Tabela"
          >
            <Table2 size={16} strokeWidth={1.8} />
          </button>
        </div>
      </label>

      <label className="compose-message-field">
        <span>Agrupar por projeto</span>
        <button
          type="button"
          className={`btn btn-secondary btn-icon${prefs.groupByProject ? ' active' : ''}`}
          onClick={() => update({ groupByProject: !prefs.groupByProject })}
          title={prefs.groupByProject ? 'Desagrupar por padrão' : 'Agrupar por padrão'}
          aria-label={prefs.groupByProject ? 'Desagrupar por padrão' : 'Agrupar por padrão'}
          aria-pressed={Boolean(prefs.groupByProject)}
        >
          <Layers size={16} strokeWidth={1.8} />
        </button>
        <span className="field-note">
          {prefs.groupByProject ? 'Tarefas agrupadas por projeto por padrão.' : 'Sem agrupamento por padrão.'}
        </span>
      </label>

      <label className="compose-message-field">
        <span>Backlog/Block</span>
        <button
          type="button"
          className={`btn btn-secondary btn-icon${stagesCollapsed ? ' active' : ''}`}
          onClick={toggleStagesCollapsed}
          title={stagesCollapsed ? 'Mostrar Backlog/Block por padrão' : 'Ocultar Backlog/Block por padrão'}
          aria-label={stagesCollapsed ? 'Mostrar Backlog/Block por padrão' : 'Ocultar Backlog/Block por padrão'}
          aria-pressed={stagesCollapsed}
        >
          {stagesCollapsed ? <PanelLeftOpen size={16} strokeWidth={1.8} /> : <PanelLeftClose size={16} strokeWidth={1.8} />}
        </button>
        <span className="field-note">
          {stagesCollapsed
            ? 'Oculto por padrão (colapsado no Kanban, filtrado na Matriz).'
            : 'Visível por padrão.'}
        </span>
      </label>
    </div>
  );
}
