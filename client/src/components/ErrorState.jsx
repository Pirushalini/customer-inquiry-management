export function ErrorState({ title = 'An error occurred', message, onRetry }) {
  return (
    <div className="state-container error-state" role="alert">
      <div className="error-icon" aria-hidden="true">⚠️</div>
      <h3 className="error-title">{title}</h3>
      {message && <p className="error-message">{message}</p>}
      {onRetry && (
        <button type="button" className="btn btn-secondary retry-btn" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}
