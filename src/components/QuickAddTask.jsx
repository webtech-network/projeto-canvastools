'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTasks } from './TasksProvider';

// Quick-create per spec section 6 — title only, no other field shown here.
// Everything else is filled in later via TaskDetailModal.jsx.
export default function QuickAddTask() {
  const { addTask } = useTasks();
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addTask(title.trim());
      setTitle('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="quick-add-task" onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Nova tarefa…"
        aria-label="Título da nova tarefa"
      />
      <button
        type="submit"
        className="btn btn-primary btn-icon"
        disabled={!title.trim() || submitting}
        title="Adicionar tarefa"
        aria-label="Adicionar tarefa"
      >
        <Plus size={16} strokeWidth={1.8} />
      </button>
    </form>
  );
}
