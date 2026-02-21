// API Client for ClassClash Backend
// Add this file to your HTML: <script src="./api-client.js"></script>

const API_BASE_URL = 'http://localhost:3000/api';

// Get stored auth token
function getAuthToken() {
  return localStorage.getItem('classclash_token');
}

// Set auth token
function setAuthToken(token) {
  if (token) {
    localStorage.setItem('classclash_token', token);
  } else {
    localStorage.removeItem('classclash_token');
  }
}

// Make authenticated API request
async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

// Authentication
const auth = {
  async register(username, email, password) {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    setAuthToken(data.token);
    return data;
  },

  async login(username, password) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setAuthToken(data.token);
    return data;
  },

  logout() {
    setAuthToken(null);
  },

  async getCurrentUser() {
    return await apiRequest('/auth/me');
  },

  isAuthenticated() {
    return !!getAuthToken();
  },
};

// Classes
const classes = {
  async getAll() {
    const data = await apiRequest('/classes');
    return data.classes || [];
  },

  async create(name) {
    const data = await apiRequest('/classes', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return data.class;
  },

  async getById(id) {
    const data = await apiRequest(`/classes/${id}`);
    return data.class;
  },
};

// Study Sessions
const sessions = {
  async record(classId, seconds, weekStart) {
    const data = await apiRequest('/sessions', {
      method: 'POST',
      body: JSON.stringify({ classId, seconds, weekStart }),
    });
    return data.session;
  },

  async getWeeklyTotal(classId, weekStart) {
    const params = weekStart ? `?weekStart=${weekStart}` : '';
    const data = await apiRequest(`/sessions/weekly/${classId}${params}`);
    return data.totalSeconds || 0;
  },

  async getAllWeeklyTotals(weekStart) {
    const params = weekStart ? `?weekStart=${weekStart}` : '';
    const data = await apiRequest(`/sessions/weekly${params}`);
    return data.totals || {};
  },
};

// Leaderboard
const leaderboard = {
  async getByClass(classId, weekStart) {
    const params = weekStart ? `?weekStart=${weekStart}` : '';
    const data = await apiRequest(`/leaderboard/${classId}${params}`);
    return data.leaderboard || [];
  },
};

// Feedback
const feedback = {
  async getAll() {
    const data = await apiRequest('/feedback');
    return data.feedback || [];
  },

  async create(content) {
    const data = await apiRequest('/feedback', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    return data.feedback;
  },

  async upvote(feedbackId) {
    const data = await apiRequest(`/feedback/${feedbackId}/upvote`, {
      method: 'POST',
    });
    return data;
  },

  async delete(feedbackId) {
    return await apiRequest(`/feedback/${feedbackId}`, {
      method: 'DELETE',
    });
  },
};

// Export for use in app.js
window.ClassClashAPI = {
  auth,
  classes,
  sessions,
  leaderboard,
  feedback,
};
