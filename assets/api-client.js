// API configuration
const API_BASE_URL = 'http://localhost:3001/api';

// Store JWT token
let authToken = localStorage.getItem('auth_token');

// Helper function to make API calls
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };
  
  // Add auth token if available
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  
  const response = await fetch(url, config);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }
  
  return data;
}

// Auth functions
const auth = {
  async login(email, password) {
    const data = await apiCall('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    authToken = data.token;
    localStorage.setItem('auth_token', authToken);
    localStorage.setItem('user_data', JSON.stringify(data.user));
    
    return data;
  },
  
  logout() {
    authToken = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  },
  
  getUser() {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  },
  
  isAuthenticated() {
    return !!authToken;
  }
};

// Company functions
const companies = {
  async getAll() {
    return await apiCall('/companies');
  },
  
  async approve(companyId) {
    return await apiCall(`/companies/${companyId}/approve`, {
      method: 'POST'
    });
  },
  
  async reject(companyId, reason) {
    return await apiCall(`/companies/${companyId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }
};

// Registration function
const registration = {
  async register(companyData, userData, branchData) {
    return await apiCall('/register', {
      method: 'POST',
      body: JSON.stringify({
        company: companyData,
        user: userData,
        branch: branchData
      })
    });
  }
};

// Location functions
const locations = {
  async getCountries() {
    return await apiCall('/countries');
  },
  
  async getStates(countryId) {
    return await apiCall(`/countries/${countryId}/states`);
  },
  
  async getCities(stateId) {
    return await apiCall(`/states/${stateId}/cities`);
  }
};

// Export for use in other files
window.CargoAPI = {
  auth,
  companies,
  registration,
  locations
};
