// assets/admin-dashboard.js
import { apiClient } from './api-client.js';
import { getSession, setSession, logout } from './common.js';

const $ = (id) => document.getElementById(id);

let currentCompanyId = null;
let adminSession = null;

// Load stats
async function loadStats() {
  try {
    console.log('Loading stats...');
    
    const query = `
      query GetCompanyStats {
        companies(limit: 1000) {
          status
        }
      }
    `;
    
    const result = await apiClient.graphqlQuery(query);
    
    console.log('Stats query result:', result);
    
    if (result.error) throw new Error(result.error);
    
    const stats = result.data.companies;
    
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
    
    const query = `
      query GetCompanies($filter: CompanyFilter, $limit: Int, $offset: Int) {
        companies(filter: $filter, limit: $limit, offset: $offset) {
          id
          companyName
          companyEmail
          industry
          status
          createdAt
          approvedBy
          approvedAt
          rejectedAt
          rejectionReason
          approverEmail
          approverFirstName
          approverLastName
        }
      }
    `;
    
    const variables = {
      limit: 100,  // Get all companies, not just 20
      offset: 0
    };
    
    const result = await apiClient.graphqlQuery(query, variables);
    
    if (result.error) throw new Error(result.error);
    
    const companies = result.data.companies;
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
  const submittedDate = new Date(company.createdAt).toLocaleDateString();
  const approvedDate = company.approvedAt ? new Date(company.approvedAt).toLocaleDateString() : '';
  
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
        <strong>${company.companyName}</strong>
        <br>
        <small class="text-muted">${company.industry || 'N/A'}</small>
        <br>
        ${statusBadge}
        ${company.status === 'REJECTED' && company.rejectionReason ? 
          `<br><small class="text-danger"><i class="fas fa-exclamation-triangle"></i> ${company.rejectionReason}</small>` : ''}
      </div>
    </td>
    <td>
      <div>
        Contact Info
        <br>
        <small class="text-muted">${company.companyEmail}</small>
      </div>
    </td>
    <td>
      <div>
        Company Details
        <br>
        <small class="text-muted">${company.industry || 'N/A'}</small>
      </div>
    </td>
    <td>
      <div>
        ${company.companyEmail}
        <br>
        <small class="text-muted">Email</small>
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
    const query = `
      query GetCompany($id: UUID!) {
        company(id: $id) {
          id
          companyName
          companyEmail
          companyAddress
          companyPhone
          industry
          website
          companyRegistrationNumber
          taxId
          status
          createdAt
          approvedAt
          rejectedAt
          rejectionReason
          approverEmail
          approverFirstName
          approverLastName
        }
      }
    `;
    
    const variables = { id: companyId };
    const result = await apiClient.graphqlQuery(query, variables);
    
    if (result.error) throw new Error(result.error);
    
    const company = result.data.company;
    
    const detailsHtml = `
      <div class="row">
        <div class="col-md-6">
          <h6>Company Information</h6>
          <table class="table table-sm">
            <tr><td><strong>Name:</strong></td><td>${company.companyName}</td></tr>
            <tr><td><strong>Email:</strong></td><td>${company.companyEmail}</td></tr>
            <tr><td><strong>Phone:</strong></td><td>${company.companyPhone || 'N/A'}</td></tr>
            <tr><td><strong>Industry:</strong></td><td>${company.industry || 'N/A'}</td></tr>
            <tr><td><strong>Website:</strong></td><td>${company.website || 'N/A'}</td></tr>
            <tr><td><strong>Registration Number:</strong></td><td>${company.companyRegistrationNumber || 'N/A'}</td></tr>
            <tr><td><strong>Tax ID:</strong></td><td>${company.taxId || 'N/A'}</td></tr>
            <tr><td><strong>Status:</strong></td><td><span class="badge bg-${company.status === 'APPROVED' ? 'success' : company.status === 'REJECTED' ? 'danger' : 'warning'}">${company.status}</span></td></tr>
          </table>
          
          ${company.companyAddress ? `<h6 class="mt-3">Address</h6><p>${company.companyAddress}</p>` : ''}
        </div>
        
        <div class="col-md-6">
          <h6>Registration Details</h6>
          <table class="table table-sm">
            <tr><td><strong>Submitted:</strong></td><td>${new Date(company.createdAt).toLocaleDateString()}</td></tr>
            ${company.approvedAt ? `<tr><td><strong>Approved:</strong></td><td>${new Date(company.approvedAt).toLocaleDateString()}</td></tr>` : ''}
            ${company.rejectedAt ? `<tr><td><strong>Rejected:</strong></td><td>${new Date(company.rejectedAt).toLocaleDateString()}</td></tr>` : ''}
            ${company.approverFirstName ? `<tr><td><strong>Approver:</strong></td><td>${company.approverFirstName} ${company.approverLastName} (${company.approverEmail})</td></tr>` : ''}
          </table>
          
          ${company.rejectionReason ? `<h6 class="mt-3">Rejection Reason</h6><p class="text-danger">${company.rejectionReason}</p>` : ''}
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
    const mutation = `
      mutation ApproveCompany($input: CompanyApprovalInput!) {
        approveCompany(input: $input) {
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
        companyId: companyId,
        approved: true
      }
    };
    
    const result = await apiClient.graphqlQuery(mutation, variables);
    
    if (result.error) throw new Error(result.error);
    
    if (result.data.approveCompany.success) {
      alert('Company approved successfully!');
      loadPendingCompanies();
      loadStats();
      bootstrap.Modal.getInstance($('companyModal'))?.hide();
    } else {
      throw new Error(result.data.approveCompany.message || 'Failed to approve company');
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
    const mutation = `
      mutation RejectCompany($input: CompanyApprovalInput!) {
        approveCompany(input: $input) {
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
        companyId: currentCompanyId,
        approved: false,
        rejectionReason: reason
      }
    };
    
    const result = await apiClient.graphqlQuery(mutation, variables);
    
    if (result.error) throw new Error(result.error);
    
    if (result.data.approveCompany.success) {
      alert('Company rejected successfully!');
      loadPendingCompanies();
      loadStats();
      bootstrap.Modal.getInstance($('rejectModal'))?.hide();
      bootstrap.Modal.getInstance($('companyModal'))?.hide();
    } else {
      throw new Error(result.data.approveCompany.message || 'Failed to reject company');
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
