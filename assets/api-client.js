// API configuration
const API_BASE_URL = 'https://cargo-erp-ms-gql.onrender.com';
const GRAPHQL_ENDPOINT = `${API_BASE_URL}/graphql`;

// Store JWT token
let authToken = localStorage.getItem('auth_token');

// GraphQL query helper
async function graphqlQuery(query, variables = {}, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // Add auth token if available
  if (token || authToken) {
    headers.Authorization = `Bearer ${token || authToken}`;
  }
  
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      variables
    })
  });
  
  const result = await response.json();
  
  if (result.errors) {
    throw new Error(result.errors[0].message);
  }
  
  return result.data;
}

// Helper function for legacy REST-style calls (deprecated)
async function apiCall(endpoint, options = {}) {
  // This is kept for backward compatibility but should be migrated to GraphQL
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
    const query = `
      mutation Login($input: LoginInput!) {
        login(input: $input) {
          success
          message
          token
          user {
            id
            email
            firstName
            lastName
            role
          }
        }
      }
    `;
    
    const variables = {
      input: { email, password }
    };
    
    const data = await graphqlQuery(query, variables);
    
    if (data.login.success) {
      authToken = data.login.token;
      localStorage.setItem('auth_token', authToken);
      localStorage.setItem('user_data', JSON.stringify(data.login.user));
    }
    
    return data.login;
  },
  
  logout() {
    authToken = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  },
  
  async getCurrentUser() {
    const query = `
      query {
        me {
          id
          email
          firstName
          lastName
          role
        }
      }
    `;
    
    const data = await graphqlQuery(query);
    return data.me;
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
  async getAll(limit = 20, offset = 0) {
    const query = `
      query GetCompanies($limit: Int, $offset: Int) {
        companies(limit: $limit, offset: $offset) {
          id
          name
          email
          phone
          status
          registrationDate
          isDeleted
        }
      }
    `;
    
    const data = await graphqlQuery(query, { limit, offset });
    return data.companies;
  },
  
  async approve(companyId, status = 'APPROVED') {
    const query = `
      mutation ApproveCompany($input: CompanyApprovalInput!) {
        approveCompany(input: $input) {
          success
          message
          company {
            id
            name
            status
          }
        }
      }
    `;
    
    const data = await graphqlQuery(query, { 
      input: { companyId, status } 
    });
    return data.approveCompany;
  },
  
  async reject(companyId, reason) {
    const query = `
      mutation ApproveCompany($input: CompanyApprovalInput!) {
        approveCompany(input: $input) {
          success
          message
          company {
            id
            name
            status
          }
        }
      }
    `;
    
    const data = await graphqlQuery(query, { 
      input: { 
        companyId, 
        status: 'REJECTED',
        rejectionReason: reason 
      } 
    });
    return data.approveCompany;
  }
};

// Registration function
const registration = {
  async register(companyData, userData, branchData) {
    const query = `
      mutation RegisterCompany($input: RegisterCompanyInput!) {
        registerCompany(input: $input) {
          success
          message
          companyId
          userId
        }
      }
    `;
    
    const data = await graphqlQuery(query, {
      input: {
        company: companyData,
        user: userData,
        branch: branchData
      }
    });
    return data.registerCompany;
  }
};

// Location functions
const locations = {
  async getCountries() {
    const query = `
      query {
        countries {
          id
          countryName
          countryCode
        }
      }
    `;
    
    const data = await graphqlQuery(query);
    return data.countries;
  },
  
  async getStates(countryId) {
    const query = `
      query GetStates($countryId: String!) {
        states(countryId: $countryId) {
          id
          stateName
          stateCode
        }
      }
    `;
    
    const data = await graphqlQuery(query, { countryId });
    return data.states;
  },
  
  async getCities(stateId) {
    const query = `
      query GetCities($stateId: String!) {
        cities(stateId: $stateId) {
          id
          cityName
          cityCode
        }
      }
    `;
    
    const data = await graphqlQuery(query, { stateId });
    return data.cities;
  }
};

// Export for use in other files
window.CargoAPI = {
  auth,
  companies,
  registration,
  locations
};

// ES6 module exports
export const apiClient = {
  graphqlQuery,
  auth,
  companies,
  registration,
  locations
};

// Also export individual functions for convenience
export { graphqlQuery, auth, companies, registration, locations };
