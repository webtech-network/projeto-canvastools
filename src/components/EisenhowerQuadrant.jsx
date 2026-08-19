'use client';

import { useDroppable } from '@dnd-kit/core';
import TaskCard from './TaskCard';

export default function EisenhowerQuadrant({ quadrant, label, tasks, onSelect }) {
  const { setNodeRef, isOver } = useDroppable({ id: quadrant });

  return (
    <div ref={setNodeRef} className={`eisenhower-quadrant${isOver ? ' eisenhower-quadrant--over' : ''}`}>
      <div className="eisenhower-quadrant-header">
        <span>{label}</span>
        <span className="pending-badge">{tasks.length}</span>
      </div>
      <div className="eisenhower-quadrant-body">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
