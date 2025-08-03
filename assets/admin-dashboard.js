// assets/admin-dashboard.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://vvgsufumkaleisthgivp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2Z3N1ZnVta2FsZWlzdGhnaXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMTQ1NTcsImV4cCI6MjA2ODY5MDU1N30.Uexa8bgQgGS51pZLEz3zXRkFhF8SBySq3kvsB4Doui0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);

let currentCompanyId = null;
let adminSession = null;

// Session management
function getSession() {
  const session = sessionStorage.getItem('adminSession');
  if (!session) return null;
  
  const sessionData = JSON.parse(session);
  if (Date.now() > sessionData.expiresAt) {
    sessionStorage.removeItem('adminSession');
    return null;
  }
  
  return sessionData;
}

function logout() {
  sessionStorage.removeItem('adminSession');
  window.location.href = 'admin-login.html';
}

// Load stats
async function loadStats() {
  try {
    console.log('Loading stats...');
    
    const { data: stats, error } = await supabase
      .from('companies')
      .select('status');
    
    console.log('Stats query result:', { stats, error });
    
    if (error) throw error;
    
    if (!stats) {
      console.log('No stats data returned');
      return;
    }
    
    console.log('Company statuses:', stats.map(c => c.status));
    
    const pending = stats.filter(c => c.status === 'PENDING_REVIEW').length;
    const approved = stats.filter(c => c.status === 'APPROVED').length;
    const rejected = stats.filter(c => c.status === 'REJECTED').length;
    const total = stats.length;
    
    console.log('Counts:', { pending, approved, rejected, total });
    
    $('pendingCount').textContent = pending;
    $('approvedCount').textContent = approved;
    $('rejectedCount').textContent = rejected;
    $('totalCount').textContent = total;
    
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Load all companies (pending, approved, and rejected)
async function loadPendingCompanies() {
  try {
    $('loadingSpinner').classList.remove('d-none');
    $('companiesTable').classList.add('d-none');
    $('noCompanies').classList.add('d-none');
    
    const { data: companies, error } = await supabase
      .from('pending_companies')
      .select('*');
    
    if (error) throw error;
    
    const tbody = $('companiesBody');
    tbody.innerHTML = '';
    
    if (companies.length === 0) {
      $('noCompanies').classList.remove('d-none');
    } else {
      companies.forEach(company => {
        const row = createCompanyRow(company);
        tbody.appendChild(row);
      });
      $('companiesTable').classList.remove('d-none');
    }
    
  } catch (error) {
    console.error('Error loading companies:', error);
  } finally {
    $('loadingSpinner').classList.add('d-none');
  }
}

// Create company table row
function createCompanyRow(company) {
  const row = document.createElement('tr');
  const submittedDate = new Date(company.created_at).toLocaleDateString();
  const approvedDate = company.approved_at ? new Date(company.approved_at).toLocaleDateString() : '';
  
  // Add status badge
  let statusBadge = '';
  let actionButtons = '';
  let rowClass = '';
  
  if (company.status === 'PENDING_REVIEW') {
    statusBadge = '<span class="badge bg-warning text-dark">Pending Review</span>';
    actionButtons = `
      <button class="btn btn-outline-primary btn-sm me-1" onclick="viewCompany('${company.id}')">
        <i class="fas fa-eye"></i> View
      </button>
      <button class="btn btn-outline-success btn-sm me-1" onclick="approveCompany('${company.id}')">
        <i class="fas fa-check"></i> Approve
      </button>
      <button class="btn btn-outline-danger btn-sm" onclick="showRejectModal('${company.id}')">
        <i class="fas fa-times"></i> Reject
      </button>
    `;
  } else if (company.status === 'APPROVED') {
    statusBadge = '<span class="badge bg-success">Approved</span>';
    rowClass = 'table-light';
    actionButtons = `
      <button class="btn btn-outline-primary btn-sm" onclick="viewCompany('${company.id}')">
        <i class="fas fa-eye"></i> View
      </button>
    `;
  } else if (company.status === 'REJECTED') {
    statusBadge = '<span class="badge bg-danger">Rejected</span>';
    rowClass = 'table-secondary';
    actionButtons = `
      <button class="btn btn-outline-primary btn-sm me-1" onclick="viewCompany('${company.id}')">
        <i class="fas fa-eye"></i> View
      </button>
      <button class="btn btn-outline-success btn-sm" onclick="approveCompany('${company.id}')">
        <i class="fas fa-redo"></i> Reactivate
      </button>
    `;
  }
  
  // Add row class for styling
  if (rowClass) {
    row.className = rowClass;
  }
  
  row.innerHTML = `
    <td>
      <div>
        <strong>${company.company_name}</strong>
        <br>
        <small class="text-muted">${company.industry || 'N/A'}</small>
        <br>
        ${statusBadge}
        ${company.status === 'REJECTED' && company.rejection_reason ? 
          `<br><small class="text-danger"><i class="fas fa-exclamation-triangle"></i> ${company.rejection_reason}</small>` : ''}
      </div>
    </td>
    <td>
      <div>
        ${company.admin_first_name} ${company.admin_last_name}
        <br>
        <small class="text-muted">${company.admin_email}</small>
      </div>
    </td>
    <td>
      <div>
        ${company.branch_name || 'N/A'}
        <br>
        <small class="text-muted">${company.city_name || 'N/A'}, ${company.state_name || 'N/A'}</small>
      </div>
    </td>
    <td>
      <div>
        ${company.company_email}
        <br>
        <small class="text-muted">${company.company_phone || 'N/A'}</small>
      </div>
    </td>
    <td>
      <div>
        <strong>Submitted:</strong><br>
        <small>${submittedDate}</small>
        ${approvedDate ? `<br><strong>Processed:</strong><br><small>${approvedDate}</small>` : ''}
      </div>
    </td>
    <td>
      ${actionButtons}
    </td>
  `;
  
  return row;
}

// View company details
window.viewCompany = async function(companyId) {
  try {
    const { data: company, error } = await supabase
      .from('pending_companies')
      .select('*')
      .eq('id', companyId)
      .single();
    
    if (error) throw error;
    
    const detailsHtml = `
      <div class="row">
        <div class="col-md-6">
          <h6>Company Information</h6>
          <table class="table table-sm">
            <tr><td><strong>Name:</strong></td><td>${company.company_name}</td></tr>
            <tr><td><strong>Email:</strong></td><td>${company.company_email}</td></tr>
            <tr><td><strong>Phone:</strong></td><td>${company.company_phone || 'N/A'}</td></tr>
            <tr><td><strong>Industry:</strong></td><td>${company.industry || 'N/A'}</td></tr>
            <tr><td><strong>Website:</strong></td><td>${company.website || 'N/A'}</td></tr>
          </table>
          
          <h6 class="mt-3">Address</h6>
          <p>${company.company_address}</p>
        </div>
        
        <div class="col-md-6">
          <h6>Admin User</h6>
          <table class="table table-sm">
            <tr><td><strong>Name:</strong></td><td>${company.admin_first_name} ${company.admin_last_name}</td></tr>
            <tr><td><strong>Email:</strong></td><td>${company.admin_email}</td></tr>
          </table>
          
          <h6 class="mt-3">Primary Branch</h6>
          <table class="table table-sm">
            <tr><td><strong>Name:</strong></td><td>${company.branch_name}</td></tr>
            <tr><td><strong>Phone:</strong></td><td>${company.branch_phone}</td></tr>
            <tr><td><strong>Address:</strong></td><td>${company.address_line_1}</td></tr>
            <tr><td><strong>Location:</strong></td><td>${company.city_name}, ${company.state_name}, ${company.country_name}</td></tr>
          </table>
        </div>
      </div>
    `;
    
    $('companyDetails').innerHTML = detailsHtml;
    currentCompanyId = companyId;
    
    new bootstrap.Modal($('companyModal')).show();
    
  } catch (error) {
    alert('Error loading company details: ' + error.message);
  }
};

// Approve company
window.approveCompany = async function(companyId) {
  if (!confirm('Are you sure you want to approve this company?')) return;
  
  try {
    const { data, error } = await supabase.rpc('approve_company', {
      company_id_param: companyId,
      system_user_id_param: adminSession.systemUserId
    });
    
    if (error) throw error;
    
    if (data.success) {
      alert('Company approved successfully!');
      loadPendingCompanies();
      loadStats();
      bootstrap.Modal.getInstance($('companyModal'))?.hide();
    } else {
      throw new Error(data.error);
    }
    
  } catch (error) {
    alert('Error approving company: ' + error.message);
  }
};

// Show reject modal
window.showRejectModal = function(companyId) {
  currentCompanyId = companyId;
  $('rejectionReason').value = '';
  new bootstrap.Modal($('rejectModal')).show();
};

// Reject company
async function rejectCompany() {
  const reason = $('rejectionReason').value.trim();
  if (!reason) {
    alert('Please provide a reason for rejection.');
    return;
  }
  
  try {
    const { data, error } = await supabase.rpc('reject_company', {
      company_id_param: currentCompanyId,
      system_user_id_param: adminSession.systemUserId,
      rejection_reason_param: reason
    });
    
    if (error) throw error;
    
    if (data.success) {
      alert('Company rejected successfully!');
      loadPendingCompanies();
      loadStats();
      bootstrap.Modal.getInstance($('rejectModal'))?.hide();
      bootstrap.Modal.getInstance($('companyModal'))?.hide();
    } else {
      throw new Error(data.error);
    }
    
  } catch (error) {
    alert('Error rejecting company: ' + error.message);
  }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  // Check authentication
  adminSession = getSession();
  if (!adminSession) {
    window.location.href = 'admin-login.html';
    return;
  }
  
  // Display admin info
  $('adminInfo').textContent = `${adminSession.email} (${adminSession.role})`;
  
  // Load data
  loadStats();
  loadPendingCompanies();
  
  // Event listeners
  $('logoutBtn').addEventListener('click', logout);
  
  // Modal event listeners
  $('approveBtn').addEventListener('click', () => {
    if (currentCompanyId) {
      approveCompany(currentCompanyId);
    }
  });
  
  $('confirmRejectBtn').addEventListener('click', rejectCompany);
  
  // Auto-refresh every 30 seconds
  setInterval(() => {
    loadPendingCompanies();
    loadStats();
  }, 30000);
});
