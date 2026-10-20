export function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="state-container loading-state" role="status" aria-live="polite">
      <div className="loading-spinner" aria-hidden="true"></div>
      <p className="loading-text">{message}</p>
    </div>
  );
}
