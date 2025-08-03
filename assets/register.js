// assets/register.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://vvgsufumkaleisthgivp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2Z3N1ZnVta2FsZWlzdGhnaXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMTQ1NTcsImV4cCI6MjA2ODY5MDU1N30.Uexa8bgQgGS51pZLEz3zXRkFhF8SBySq3kvsB4Doui0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// Load countries on page load
async function loadCountries() {
  try {
    const { data: countries, error } = await supabase
      .from('countries')
      .select('id, country_name')
      .order('country_name');
    
    if (error) {
      console.error('Error loading countries:', error);
      return;
    }
    
    const countrySelect = $('country_id');
    if (countrySelect) {
      countrySelect.innerHTML = '<option value="">Select Country</option>';
      countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country.id;
        option.textContent = country.country_name;
        countrySelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Failed to load countries:', error);
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
    
    const { data: states, error } = await supabase
      .from('states')
      .select('id, state_name')
      .eq('country_id', countryId)
      .order('state_name');
    
    if (error) {
      console.error('Error loading states:', error);
      return;
    }
    
    stateSelect.disabled = false;
    states.forEach(state => {
      const option = document.createElement('option');
      option.value = state.id;
      option.textContent = state.state_name;
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
    
    const { data: cities, error } = await supabase
      .from('cities')
      .select('id, city_name')
      .eq('state_id', stateId)
      .order('city_name');
    
    if (error) {
      console.error('Error loading cities:', error);
      return;
    }
    
    citySelect.disabled = false;
    cities.forEach(city => {
      const option = document.createElement('option');
      option.value = city.id;
      option.textContent = city.city_name;
      citySelect.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load cities:', error);
  }
}

// Event listeners for cascading dropdowns
document.addEventListener('DOMContentLoaded', () => {
  loadCountries();
  
  const countrySelect = $('country_id');
  const stateSelect = $('state_id');
  
  if (countrySelect) {
    countrySelect.addEventListener('change', (e) => {
      loadStates(e.target.value);
    });
  }
  
  if (stateSelect) {
    stateSelect.addEventListener('change', (e) => {
      loadCities(e.target.value);
    });
  }
});

// Form submission handler
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const company = {
    company_name: val('company_name'),
    company_address: val('company_address'),
    company_email: val('company_email'),
    company_phone: val('company_phone') || null,
    industry: val('industry') || null,
    website: val('website') || null,
    status: 'PENDING_REVIEW'
  };

  const user = {
    email: val('user_email'),
    password: val('user_password'),
    first_name: val('first_name') || null,
    last_name: val('last_name') || null,
    role: 'COMPANY_ADMIN'
  };

  const branch = {
    branch_name: val('branch_name'),
    branch_phone: val('branch_phone'),
    address_line_1: val('address_line_1'),
    address_line_2: val('address_line_2') || null,
    country_id: val('country_id') || null,
    state_id: val('state_id') || null,
    city_id: val('city_id') || null,
    postal_code: val('postal_code') || null,
    is_primary: true
  };

  // Hide previous messages
  const errEl = document.getElementById('registerError');
  const okEl = document.getElementById('registerOk');
  if (errEl) errEl.style.display = 'none';
  if (okEl) okEl.style.display = 'none';

  try {
    // First insert the company
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert([company])
      .select()
      .single();

    if (companyError) {
      throw new Error(`Company registration failed: ${companyError.message}`);
    }

    // Then insert the primary branch
    branch.company_id = companyData.id;
    
    const { data: branchData, error: branchError } = await supabase
      .from('branches')
      .insert([branch])
      .select()
      .single();

    if (branchError) {
      throw new Error(`Branch creation failed: ${branchError.message}`);
    }

    // Finally insert the user with company_id and branch_id
    user.company_id = companyData.id;
    user.branch_id = branchData.id;
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([user])
      .select()
      .single();

    if (userError) {
      throw new Error(`User registration failed: ${userError.message}`);
    }

    // Success - show success message
    if (okEl) {
      okEl.textContent = 'Registration submitted successfully! We will review and activate your company shortly.';
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

  } catch (error) {
    if (errEl) {
      errEl.textContent = error.message || 'Registration failed. Please try again.';
      errEl.style.display = 'inline';
    }
    console.error('Registration error:', error);
  }
});
