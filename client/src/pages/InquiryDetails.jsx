import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

export function InquiryDetails() {
  const { id } = useParams();

  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  // Status update states
  const [updating, setUpdating] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [conflictError, setConflictError] = useState(null);

  const fetchInquiry = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    setConflictError(null);
    setActionError('');
    try {
      const data = await api.inquiries.getById(id);
      setInquiry(data.inquiry);
    } catch (err) {
      if (err.status === 404) {
        setNotFound(true);
      } else {
        setError(err.message || 'Failed to load inquiry details');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const data = await api.inquiries.getById(id);
        if (isMounted) {
          setInquiry(data.inquiry);
        }
      } catch (err) {
        if (isMounted) {
          if (err.status === 404) {
            setNotFound(true);
          } else {
            setError(err.message || 'Failed to load inquiry details');
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleStatusUpdate = async (nextStatus) => {
    if (!inquiry) return;
    setUpdating(true);
    setActionSuccess('');
    setActionError('');
    setConflictError(null);

    try {
      const res = await api.inquiries.updateStatus(inquiry.id, {
        status: nextStatus,
        version: inquiry.version,
      });

      setInquiry(res.inquiry);
      setActionSuccess(`Inquiry status updated to "${nextStatus}" successfully!`);
    } catch (err) {
      if (err.status === 409) {
        // Stale-data optimistic concurrency conflict
        setConflictError({
          message: err.message || 'This inquiry was modified by another session. Please reload the latest data.',
          currentVersion: err.details?.currentVersion,
          currentStatus: err.details?.currentStatus,
        });
      } else {
        setActionError(err.message || 'Failed to update status');
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleReloadLatest = async () => {
    setConflictError(null);
    setActionError('');
    setActionSuccess('');
    await fetchInquiry();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading) {
    return <LoadingState message="Loading inquiry details..." />;
  }

  if (notFound) {
    return (
      <div className="state-container not-found-state card">
        <div className="not-found-icon" aria-hidden="true">🔍</div>
        <h1 className="not-found-title">Inquiry Not Found</h1>
        <p className="not-found-message">
          The requested inquiry (#{id}) does not exist or you do not have permission to access it.
        </p>
        <Link to="/dashboard" className="btn btn-primary">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  if (error || !inquiry) {
    return (
      <ErrorState
        title="Could not load inquiry"
        message={error}
        onRetry={fetchInquiry}
      />
    );
  }

  return (
    <div className="details-page">
      <div className="breadcrumb">
        <Link to="/dashboard" className="breadcrumb-link">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Stale Data Conflict Banner (HTTP 409 OCC Handling) */}
      {conflictError && (
        <div className="conflict-banner alert alert-conflict" role="alert">
          <div className="conflict-icon" aria-hidden="true">⚠️</div>
          <div className="conflict-content">
            <h2 className="conflict-title">Version Conflict Detected (HTTP 409)</h2>
            <p className="conflict-text">{conflictError.message}</p>
            <button
              type="button"
              className="btn btn-warning reload-latest-btn"
              onClick={handleReloadLatest}
            >
              🔄 Reload Latest Data
            </button>
          </div>
        </div>
      )}

      {/* Success feedback */}
      {actionSuccess && (
        <div className="alert alert-success" role="status">
          <span className="alert-icon" aria-hidden="true">✓</span>
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Error feedback */}
      {actionError && (
        <div className="alert alert-error" role="alert">
          <span className="alert-icon" aria-hidden="true">⚠️</span>
          <span>{actionError}</span>
        </div>
      )}

      <div className="details-card card">
        {/* Header with Title and Current Status */}
        <div className="details-header">
          <div className="details-header-info">
            <div className="details-tag-row">
              <span className="inquiry-reference-pill">Inquiry #{inquiry.id}</span>
              <span className="inquiry-version-pill" title="Optimistic Concurrency Control Version">
                v{inquiry.version}
              </span>
            </div>
            <h1 className="details-title">{inquiry.subject}</h1>
          </div>
          <div className="details-status-box">
            <span className="status-label">Current Status</span>
            <StatusBadge status={inquiry.status} />
          </div>
        </div>

        {/* Customer Information Panel */}
        <div className="info-grid">
          <div className="info-cell">
            <span className="info-label">Customer Name</span>
            <span className="info-value customer-name-value">{inquiry.customer_name}</span>
          </div>
          <div className="info-cell">
            <span className="info-label">Contact Details</span>
            <span className="info-value">{inquiry.contact}</span>
          </div>
          <div className="info-cell">
            <span className="info-label">Date Recorded</span>
            <span className="info-value">{formatDate(inquiry.created_at)}</span>
          </div>
          <div className="info-cell">
            <span className="info-label">Last Updated</span>
            <span className="info-value">{formatDate(inquiry.updated_at)}</span>
          </div>
        </div>

        {/* Inquiry Description */}
        <div className="description-section">
          <h2 className="description-title">Customer Inquiry Description</h2>
          <div className="description-content">
            <p>{inquiry.description}</p>
          </div>
        </div>

        {/* Status Lifecycle Action Controls */}
        <div className="lifecycle-section">
          <h2 className="lifecycle-title">Lifecycle Actions</h2>
          <p className="lifecycle-subtitle">
            Move this inquiry through its operational lifecycle:
          </p>

          <div className="lifecycle-buttons">
            {inquiry.status === 'New' && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleStatusUpdate('In Progress')}
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Start Progress →'}
              </button>
            )}

            {inquiry.status === 'In Progress' && (
              <button
                type="button"
                className="btn btn-success"
                onClick={() => handleStatusUpdate('Resolved')}
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Resolve Inquiry ✓'}
              </button>
            )}

            {inquiry.status === 'Resolved' && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => handleStatusUpdate('In Progress')}
                disabled={updating}
              >
                {updating ? 'Reopening...' : 'Reopen Inquiry (Return to In Progress) ↺'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
