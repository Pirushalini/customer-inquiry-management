import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

export function Dashboard() {
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search and status filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.inquiries.list({
        search: search.trim(),
        status: statusFilter,
      });
      setInquiries(data.inquiries || []);
    } catch (err) {
      setError(err.message || 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  // Debounced fetch when search or filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInquiries();
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchInquiries]);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="dashboard-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Inquiries</h1>
          <p className="page-subtitle">
            Welcome back, <strong>{user?.name}</strong>. Here are your assigned customer inquiries.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-card">
        <div className="search-wrap">
          <label htmlFor="search-input" className="sr-only">
            Search inquiries
          </label>
          <div className="search-input-container">
            <span className="search-icon" aria-hidden="true">🔍</span>
            <input
              id="search-input"
              type="search"
              className="form-input search-input"
              placeholder="Search by customer name, subject, or contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="status-filter-wrap">
          <label htmlFor="status-select" className="filter-label">
            Filter Status:
          </label>
          <select
            id="status-select"
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="New">New</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <LoadingState message="Loading your inquiries..." />
      ) : error ? (
        <ErrorState
          title="Could not load inquiries"
          message={error}
          onRetry={fetchInquiries}
        />
      ) : inquiries.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon" aria-hidden="true">📋</div>
          <h2 className="empty-title">No Inquiries Found</h2>
          <p className="empty-description">
            {search || statusFilter !== 'all'
              ? 'No customer inquiries match your current search and filter criteria.'
              : 'You have not recorded any customer inquiries yet.'}
          </p>
          {search || statusFilter !== 'all' ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
              }}
            >
              Reset Filters
            </button>
          ) : (
            <Link to="/inquiries/new" className="btn btn-primary">
              Record First Inquiry
            </Link>
          )}
        </div>
      ) : (
        <div className="inquiry-table-card card">
          <div className="table-responsive">
            <table className="inquiry-table" aria-label="Customer Inquiries List">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Subject</th>
                  <th scope="col">Status</th>
                  <th scope="col">Date Recorded</th>
                  <th scope="col" className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((item) => (
                  <tr key={item.id} className="inquiry-row">
                    <td className="inquiry-id">#{item.id}</td>
                    <td className="inquiry-customer">
                      <strong>{item.customer_name}</strong>
                    </td>
                    <td className="inquiry-contact">{item.contact}</td>
                    <td className="inquiry-subject">{item.subject}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="inquiry-date">{formatDate(item.created_at)}</td>
                    <td className="text-right">
                      <Link
                        to={`/inquiries/${item.id}`}
                        className="btn btn-outline btn-sm view-details-btn"
                        aria-label={`View details for inquiry #${item.id} from ${item.customer_name}`}
                      >
                        View Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-footer">
            <span>Showing {inquiries.length} {inquiries.length === 1 ? 'inquiry' : 'inquiries'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
