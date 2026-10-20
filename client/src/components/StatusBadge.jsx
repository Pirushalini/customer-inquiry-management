export function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase().replace(/\s+/g, '-');
  
  // Status icons or indicators alongside text for non-color dependent accessibility
  let label = status;
  let icon = '•';
  if (status === 'New') icon = '★';
  if (status === 'In Progress') icon = '⏳';
  if (status === 'Resolved') icon = '✓';

  return (
    <span className={`status-badge status-badge--${normalized}`} aria-label={`Status: ${status}`}>
      <span className="badge-icon" aria-hidden="true">{icon}</span>
      <span className="badge-text">{label}</span>
    </span>
  );
}
