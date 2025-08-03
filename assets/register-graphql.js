// assets/register.js - Updated for GraphQL API
console.log('🚀 register-graphql.js loaded');

const GRAPHQL_ENDPOINT = 'http://localhost:4000/graphql';

const $ = (id) => document.getElementById(id);
const val = id => {
  const element = $(id);
  if (!element) {
    console.error(`Element with id '${id}' not found`);
    return '';
  }
  return element.value.trim();
};
const bool = id => {
  const element = $(id);
  if (!element) {
    console.error(`Element with id '${id}' not found`);
    return false;
  }
  return element.checked;
};

// GraphQL query helper
async function graphqlQuery(query, variables = {}) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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

// Load countries on page load
async function loadCountries() {
  try {
    console.log('🌍 Loading countries...');
    const query = `
      query GetCountries {
        countries {
          id
          countryName
        }
      }
    `;
    
    const data = await graphqlQuery(query);
    console.log('✅ Countries loaded:', data.countries.length);
    
    const countrySelect = $('country_id');
    if (countrySelect) {
      countrySelect.innerHTML = '<option value="">Select Country</option>';
      data.countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country.id;
        option.textContent = country.countryName;
        countrySelect.appendChild(option);
      });
      console.log('✅ Country dropdown populated');
    } else {
      console.error('❌ Country select element not found');
    }
  } catch (error) {
    console.error('❌ Failed to load countries:', error);
  }
}

// Load states when country is selected
async function loadStates(countryId) {
  try {
    const stateSelect = $('state_id');
    const citySelect = $('city_id');
    
    if (!stateSelect || !citySelect) return;
    
    // Reset state and city selects
    stateSelect.innerHTML = '<option value="">Select State</option>';
    citySelect.innerHTML = '<option value="">Select City</option>';
    citySelect.disabled = true;
    
    if (!countryId) {
      stateSelect.disabled = true;
      return;
    }
    
    const query = `
      query GetStates($countryId: String!) {
        states(countryId: $countryId) {
          id
          stateName
        }
      }
    `;
    
    const data = await graphqlQuery(query, { countryId });
    
    stateSelect.disabled = false;
    data.states.forEach(state => {
      const option = document.createElement('option');
      option.value = state.id;
      option.textContent = state.stateName;
      stateSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load states:', error);
  }
}

// Load cities when state is selected
async function loadCities(stateId) {
  try {
    const citySelect = $('city_id');
    
    if (!citySelect) return;
    
    // Reset city select
    citySelect.innerHTML = '<option value="">Select City</option>';
    
    if (!stateId) {
      citySelect.disabled = true;
      return;
    }
    
    const query = `
      query GetCities($stateId: String!) {
        cities(stateId: $stateId) {
          id
          cityName
        }
      }
    `;
    
    const data = await graphqlQuery(query, { stateId });
    
    citySelect.disabled = false;
    data.cities.forEach(city => {
      const option = document.createElement('option');
      option.value = city.id;
      option.textContent = city.cityName;
      citySelect.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load cities:', error);
  }
}

// Event listeners for cascading dropdowns
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DOM loaded, initializing dropdowns...');
  
  // Check if elements exist
  const countrySelect = $('country_id');
  const stateSelect = $('state_id');
  const citySelect = $('city_id');
  
  console.log('Elements found:', {
    country: !!countrySelect,
    state: !!stateSelect,
    city: !!citySelect
  });
  
  loadCountries();
  
  if (countrySelect) {
    countrySelect.addEventListener('change', (e) => {
      console.log('Country changed to:', e.target.value);
      loadStates(e.target.value);
    });
  }
  
  if (stateSelect) {
    stateSelect.addEventListener('change', (e) => {
      console.log('State changed to:', e.target.value);
      loadCities(e.target.value);
    });
  }
});

// Form submission handler
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  // Hide previous messages
  const errEl = document.getElementById('registerError');
  const okEl = document.getElementById('registerOk');
  if (errEl) errEl.style.display = 'none';
  if (okEl) okEl.style.display = 'none';

  try {
    const mutation = `
      mutation RegisterCompany($input: RegisterCompanyInput!) {
        registerCompany(input: $input) {
          success
          message
          company {
            id
            companyName
            status
          }
        }
      }
    `;
    
    const variables = {
      input: {
        company: {
          companyName: val('company_name'),
          companyEmail: val('company_email'),
          companyAddress: val('company_address'),
          companyPhone: val('company_phone') || null,
          industry: val('industry') || null,
          website: val('website') || null,
          companyRegistrationNumber: val('company_registration_number') || null,
          taxId: val('tax_id') || null
        },
        user: {
          email: val('user_email'),
          password: val('user_password'),
          firstName: val('first_name') || null,
          lastName: val('last_name') || null
        },
        branch: {
          branchName: val('branch_name'),
          branchPhone: val('branch_phone'),
          addressLine1: val('address_line_1'),
          addressLine2: val('address_line_2') || null,
          countryId: val('country_id') || null,
          stateId: val('state_id') || null,
          cityId: val('city_id') || null,
          postalCode: val('postal_code') || null
        }
      }
    };

    const data = await graphqlQuery(mutation, variables);
    
    if (data.registerCompany.success) {
      // Success - show success message
      if (okEl) {
        okEl.textContent = data.registerCompany.message || 'Registration submitted successfully! We will review and activate your company shortly.';
        okEl.style.display = 'inline';
      }
      
      // Reset form
      document.getElementById('registerForm').reset();
      
      // Optional: redirect to login after a pause
      setTimeout(() => {
        if (confirm('Registration successful! Would you like to go to the login page?')) {
          location.href = 'login.html';
        }
      }, 2000);
    } else {
      throw new Error(data.registerCompany.message || 'Registration failed');
    }

  } catch (error) {
    if (errEl) {
      errEl.textContent = error.message || 'Registration failed. Please try again.';
      errEl.style.display = 'inline';
    }
    console.error('Registration error:', error);
  }
});
