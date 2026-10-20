/**
 * Custom API Error class carrying HTTP status code and response payload
 */
export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Base fetch request handler
 */
async function request(endpoint, options = {}) {
  const { headers, ...customConfig } = options;

  const config = {
    method: customConfig.body ? 'POST' : 'GET',
    credentials: 'include', // Include session cookies on all requests
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...customConfig,
  };

  let response;
  try {
    response = await fetch(endpoint, config);
  } catch {
    throw new ApiError(0, 'Unable to connect to the server. Please check your network connection.');
  }

  // Parse JSON response safely
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorMessage = data?.message || data?.error || `Request failed with status ${response.status}`;
    throw new ApiError(response.status, errorMessage, data?.details);
  }

  return data;
}

export const api = {
  auth: {
    login: (email, password) =>
      request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    logout: () =>
      request('/api/auth/logout', {
        method: 'POST',
      }),
    me: () => request('/api/auth/me'),
  },

  inquiries: {
    list: (params = {}) => {
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.set('search', params.search);
      if (params.status && params.status !== 'all') searchParams.set('status', params.status);
      const queryStr = searchParams.toString();
      return request(`/api/inquiries${queryStr ? `?${queryStr}` : ''}`);
    },
    create: (inquiryData) =>
      request('/api/inquiries', {
        method: 'POST',
        body: JSON.stringify(inquiryData),
      }),
    getById: (id) => request(`/api/inquiries/${id}`),
    updateStatus: (id, { status, version }) =>
      request(`/api/inquiries/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, version }),
      }),
  },
};
