export function emitTasksChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tasks-changed'));
  }
}

export function onTasksChanged(callback: () => void): () => void {
  window.addEventListener('tasks-changed', callback);
  return () => window.removeEventListener('tasks-changed', callback);
}
