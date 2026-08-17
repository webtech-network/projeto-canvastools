'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { ENROLLMENT_STATE_LABELS } from '@/lib/studentReport';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

function formatActivityTime(seconds) {
  if (seconds == null) return '—';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h ${remaining}min` : `${hours}h`;
}

function formatGrade(score, grade) {
  if (grade != null) return grade;
  if (score != null) return score;
  return '—';
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

const CSV_HEADERS = [
  'Nome',
  'E-mail/Login',
  'Status da matrícula',
  'Última atividade',
  'Tempo de atividade',
  'Nota atual',
  'Nota final',
];

function rowsToCsv(rows) {
  const lines = [CSV_HEADERS.join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.name,
        row.contact,
        ENROLLMENT_STATE_LABELS[row.enrollmentState] || '—',
        formatDate(row.lastActivityAt),
        formatActivityTime(row.totalActivityTime),
        formatGrade(row.currentScore, row.currentGrade),
        formatGrade(row.finalScore, row.finalGrade),
      ]
        .map(csvEscape)
        .join(','),
    );
  }
  return lines.join('\n');
}

function downloadCsv(rows) {
  const csv = rowsToCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `alunos-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Notas do curso (grades) dependem de permissão da conta Canvas para o
// professor consultar — quando a conta não permite, `enrollment.grades`
// simplesmente não vem em nenhum aluno, então o relatório avisa em vez de
// mostrar duas colunas cheias de "—" sem explicação.
function allGradesMissing(rows) {
  return rows.every((r) => r.currentScore == null && r.currentGrade == null && r.finalScore == null && r.finalGrade == null);
}

export default function StudentReport({ rows }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (row) => row.name?.toLowerCase().includes(term) || row.contact?.toLowerCase().includes(term),
    );
  }, [rows, query]);

  const gradesUnavailable = useMemo(() => allGradesMissing(rows), [rows]);

  if (rows.length === 0) {
    return <p className="lede">Nenhum aluno ativo encontrado neste curso.</p>;
  }

  return (
    <>
      <div className="browser-controls">
        <input
          type="search"
          className="search-input"
          placeholder="Pesquisar por nome ou e-mail..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Pesquisar alunos"
        />
        <button type="button" className="btn btn-secondary" onClick={() => downloadCsv(filtered)}>
          <Download size={16} strokeWidth={1.8} aria-hidden="true" />
          Exportar CSV
        </button>
      </div>

      {gradesUnavailable && (
        <p className="alert alert-warning" role="alert">
          As notas não estão disponíveis para consulta via API nesta conta Canvas — as colunas de nota ficarão em
          branco para todos os alunos.
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="lede">Nenhum aluno encontrado com essa pesquisa.</p>
      ) : (
        <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail/Login</th>
              <th>Status</th>
              <th>Última atividade</th>
              <th>Tempo de atividade</th>
              <th>Nota atual</th>
              <th>Nota final</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                <td className="course-name-cell">{row.name}</td>
                <td title={row.contactIsLogin ? 'E-mail não disponível — exibindo login do Canvas' : undefined}>
                  {row.contact}
                </td>
                <td>{ENROLLMENT_STATE_LABELS[row.enrollmentState] || '—'}</td>
                <td>{formatDate(row.lastActivityAt)}</td>
                <td>{formatActivityTime(row.totalActivityTime)}</td>
                <td>{formatGrade(row.currentScore, row.currentGrade)}</td>
                <td>{formatGrade(row.finalScore, row.finalGrade)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </>
  );
}
