class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function apiRequest(url, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);
  
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      data?.error || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) => apiRequest('/api/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),
  me: () => apiRequest('/api/me'),

  // Teams
  teams: () => apiRequest('/api/teams'),

  // Work Items
  workItems: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, value);
      }
    });
    return apiRequest(`/api/work-items?${searchParams.toString()}`);
  },

  workItem: (id) => apiRequest(`/api/work-items/${id}`),

  createWorkItem: (data, idempotencyKey) => {
    const headers = {};
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    return apiRequest('/api/work-items', { method: 'POST', body: data, headers });
  },

  updateWorkItem: (id, data) => apiRequest(`/api/work-items/${id}`, { method: 'PATCH', body: data }),

  assignWorkItem: (id, data) => apiRequest(`/api/work-items/${id}/assign`, { method: 'POST', body: data }),

  // Comments
  comments: (workItemId) => apiRequest(`/api/work-items/${workItemId}/comments`),
  addComment: (workItemId, body) => apiRequest(`/api/work-items/${workItemId}/comments`, { method: 'POST', body: { body } }),

  // Activity
  activity: (workItemId) => apiRequest(`/api/work-items/${workItemId}/activity`),
};

export { ApiError };
