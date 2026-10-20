import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-container">
          <div className="brand-group">
            <Link to="/dashboard" className="brand-logo" aria-label="Coffee Ninja Dashboard">
              <span className="brand-icon" aria-hidden="true">☕</span>
              <span className="brand-name">Coffee Ninja</span>
              <span className="brand-badge">Inquiry Portal</span>
            </Link>
          </div>

          <nav className="header-nav">
            <Link
              to="/dashboard"
              className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
            >
              Dashboard
            </Link>
            <Link
              to="/inquiries/new"
              className="btn btn-accent btn-sm"
            >
              + New Inquiry
            </Link>

            {user && (
              <div className="user-profile">
                <span className="user-avatar" aria-hidden="true">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </span>
                <div className="user-details">
                  <span className="user-name">{user.name}</span>
                  <span className="user-email">{user.email}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm logout-btn"
                  onClick={handleLogout}
                  title="Log out of staff workspace"
                >
                  Logout
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="app-main">
        <div className="main-container">
          <Outlet />
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-container">
          <p>© 2026 Coffee Ninja (Pvt) Ltd — Customer Inquiry Management System</p>
        </div>
      </footer>
    </div>
  );
}
