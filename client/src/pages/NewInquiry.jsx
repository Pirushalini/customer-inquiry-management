import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { api } from '../api/client';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{4,15}$/;

const inquiryFormSchema = z.object({
  customer_name: z
    .string()
    .trim()
    .min(1, 'Customer name is required')
    .max(150, 'Customer name cannot exceed 150 characters'),
  contact: z
    .string()
    .trim()
    .min(3, 'Contact information is required')
    .max(150, 'Contact information cannot exceed 150 characters')
    .refine((val) => emailRegex.test(val) || phoneRegex.test(val), {
      message: 'Please provide a valid email address or phone number',
    }),
  subject: z
    .string()
    .trim()
    .min(1, 'Subject is required')
    .max(200, 'Subject cannot exceed 200 characters'),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(5000, 'Description cannot exceed 5000 characters'),
});

export function NewInquiry() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    customer_name: '',
    contact: '',
    subject: '',
    description: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for field when user modifies it
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (generalError) {
      setGeneralError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setFieldErrors({});

    // Validate using Zod
    const result = inquiryFormSchema.safeParse(formData);
    if (!result.success) {
      const flattened = result.error.flatten().fieldErrors;
      setFieldErrors({
        customer_name: flattened.customer_name?.[0] || '',
        contact: flattened.contact?.[0] || '',
        subject: flattened.subject?.[0] || '',
        description: flattened.description?.[0] || '',
      });
      return;
    }

    setSubmitting(true);
    try {
      // POST /api/inquiries
      const res = await api.inquiries.create(result.data);
      // Navigate to the newly created inquiry's detail page
      navigate(`/inquiries/${res.inquiry.id}`);
    } catch (err) {
      if (err.status === 422 && err.details) {
        // Backend validation errors
        setFieldErrors({
          customer_name: err.details.customer_name?.[0] || '',
          contact: err.details.contact?.[0] || '',
          subject: err.details.subject?.[0] || '',
          description: err.details.description?.[0] || '',
        });
      } else {
        setGeneralError(err.message || 'Failed to save customer inquiry. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="form-page">
      <div className="breadcrumb">
        <Link to="/dashboard" className="breadcrumb-link">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="form-card card">
        <div className="form-card-header">
          <h1 className="form-card-title">Record New Customer Inquiry</h1>
          <p className="form-card-subtitle">
            Enter the customer inquiry details below. All fields are required.
          </p>
        </div>

        {generalError && (
          <div className="alert alert-error" role="alert">
            <span className="alert-icon" aria-hidden="true">⚠️</span>
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="inquiry-form">
          <div className="form-group">
            <label htmlFor="customer_name" className="form-label">
              Customer Full Name <span className="required-mark">*</span>
            </label>
            <input
              id="customer_name"
              name="customer_name"
              type="text"
              value={formData.customer_name}
              onChange={handleChange}
              disabled={submitting}
              className={`form-input ${fieldErrors.customer_name ? 'input-error' : ''}`}
              placeholder="e.g. Michael Scott"
              aria-invalid={!!fieldErrors.customer_name}
              aria-describedby={fieldErrors.customer_name ? 'customer_name-error' : undefined}
            />
            {fieldErrors.customer_name && (
              <span id="customer_name-error" className="field-error" role="alert">
                {fieldErrors.customer_name}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="contact" className="form-label">
              Contact Information (Email or Phone) <span className="required-mark">*</span>
            </label>
            <input
              id="contact"
              name="contact"
              type="text"
              value={formData.contact}
              onChange={handleChange}
              disabled={submitting}
              className={`form-input ${fieldErrors.contact ? 'input-error' : ''}`}
              placeholder="e.g. michael@dundermifflin.com or +1 555-0199"
              aria-invalid={!!fieldErrors.contact}
              aria-describedby={fieldErrors.contact ? 'contact-error' : undefined}
            />
            {fieldErrors.contact && (
              <span id="contact-error" className="field-error" role="alert">
                {fieldErrors.contact}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="subject" className="form-label">
              Inquiry Subject <span className="required-mark">*</span>
            </label>
            <input
              id="subject"
              name="subject"
              type="text"
              value={formData.subject}
              onChange={handleChange}
              disabled={submitting}
              className={`form-input ${fieldErrors.subject ? 'input-error' : ''}`}
              placeholder="e.g. Bulk Coffee Bean Order for Regional Office"
              aria-invalid={!!fieldErrors.subject}
              aria-describedby={fieldErrors.subject ? 'subject-error' : undefined}
            />
            {fieldErrors.subject && (
              <span id="subject-error" className="field-error" role="alert">
                {fieldErrors.subject}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Inquiry Description <span className="required-mark">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={5}
              value={formData.description}
              onChange={handleChange}
              disabled={submitting}
              className={`form-textarea ${fieldErrors.description ? 'input-error' : ''}`}
              placeholder="Describe the customer's request, questions, or requirements in detail..."
              aria-invalid={!!fieldErrors.description}
              aria-describedby={fieldErrors.description ? 'description-error' : undefined}
            />
            {fieldErrors.description && (
              <span id="description-error" className="field-error" role="alert">
                {fieldErrors.description}
              </span>
            )}
          </div>

          <div className="form-actions">
            <Link to="/dashboard" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary submit-inquiry-btn"
              disabled={submitting}
            >
              {submitting ? 'Saving Inquiry...' : 'Submit Inquiry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
