import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
});

export function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      const target = location.state?.from?.pathname || '/dashboard';
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-specific error on change
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (generalError) {
      setGeneralError('');
    }
  };

  const handleFillAccount = (email, password) => {
    setFormData({ email, password });
    setFieldErrors({});
    setGeneralError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setFieldErrors({});

    // Client-side validation with Zod
    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      const flattened = result.error.flatten().fieldErrors;
      setFieldErrors({
        email: flattened.email?.[0] || '',
        password: flattened.password?.[0] || '',
      });
      return;
    }

    setSubmitting(true);
    try {
      await login(result.data.email, result.data.password);
      const target = location.state?.from?.pathname || '/dashboard';
      navigate(target, { replace: true });
    } catch (err) {
      setGeneralError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <img src="/coffee-ninja-logo.png" alt="Coffee Ninja Logo" className="login-logo-img" />
          <h1 className="login-title">Staff Portal Sign In</h1>
          <p className="login-subtitle">Coffee Ninja Customer Inquiry Management</p>
        </div>

        {generalError && (
          <div className="alert alert-error" role="alert">
            <span className="alert-icon" aria-hidden="true">⚠️</span>
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="login-form">
          <div className="form-group">
            <label htmlFor="email-input" className="form-label">
              Staff Email Address
            </label>
            <input
              id="email-input"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              disabled={submitting}
              className={`form-input ${fieldErrors.email ? 'input-error' : ''}`}
              placeholder="e.g. sarah@coffeeninja.com"
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            />
            {fieldErrors.email && (
              <span id="email-error" className="field-error" role="alert">
                {fieldErrors.email}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password-input" className="form-label">
              Password
            </label>
            <div className="password-input-wrap">
              <input
                id="password-input"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                disabled={submitting}
                className={`form-input ${fieldErrors.password ? 'input-error' : ''}`}
                placeholder="Enter your password"
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {fieldErrors.password && (
              <span id="password-error" className="field-error" role="alert">
                {fieldErrors.password}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block submit-btn"
            disabled={submitting}
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="test-credentials-box">
          <p className="test-credentials-title">Quick Demo Accounts:</p>
          <div className="test-credentials-buttons">
            <button
              type="button"
              className="btn btn-outline btn-xs"
              onClick={() => handleFillAccount('sarah@coffeeninja.com', 'NinjaPass123!')}
            >
              Fill: Sarah (sarah@coffeeninja.com)
            </button>
            <button
              type="button"
              className="btn btn-outline btn-xs"
              onClick={() => handleFillAccount('alex@coffeeninja.com', 'NinjaPass123!')}
            >
              Fill: Alex (alex@coffeeninja.com)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
