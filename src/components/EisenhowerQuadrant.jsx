'use client';

import { useDroppable } from '@dnd-kit/core';
import TaskCard from './TaskCard';
import { groupTasksByProject } from '@/lib/tasks/grouping';

export default function EisenhowerQuadrant({ quadrant, title, criteria, tasks, projects, groupByProject, onSelect }) {
  const { setNodeRef, isOver } = useDroppable({ id: quadrant });

  return (
    <div ref={setNodeRef} className={`eisenhower-quadrant${isOver ? ' eisenhower-quadrant--over' : ''}`}>
      <div className="eisenhower-quadrant-header">
        <span className="eisenhower-quadrant-title">
          <strong>{title}</strong> <span className="eisenhower-quadrant-criteria">({criteria})</span>
        </span>
        <span className="pending-badge">{tasks.length}</span>
      </div>
      <div className="eisenhower-quadrant-body">
        {groupByProject
          ? groupTasksByProject(tasks, projects).map(({ project, tasks: groupTasks }) => (
              <div key={project?.id || 'none'} className="task-group">
                <div className="task-group-header">
                  <span
                    className="tasks-projects-color-dot"
                    style={{ backgroundColor: project?.color || 'transparent' }}
                  />
                  <span className="task-group-name">{project ? project.name : 'Sem projeto'}</span>
                  <span className="pending-badge">{groupTasks.length}</span>
                </div>
                {groupTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onSelect={onSelect} />
                ))}
              </div>
            ))
          : tasks.map((task) => <TaskCard key={task.id} task={task} onSelect={onSelect} />)}
      </div>
    </div>
  );
}
