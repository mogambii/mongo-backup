// API Base URL
const API_URL = '/api';

// DOM Elements
const logoutBtn = document.getElementById('logoutBtn');
const createBackupBtn = document.getElementById('createBackupBtn');
const refreshBtn = document.getElementById('refreshBtn');
const backupsList = document.getElementById('backupsList');
const toast = document.getElementById('toast');
const lastBackupTime = document.getElementById('lastBackupTime');
const lastBackupSize = document.getElementById('lastBackupSize');
const totalBackups = document.getElementById('totalBackups');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkAuthentication();
  loadData();
  
  logoutBtn.addEventListener('click', logout);
  createBackupBtn.addEventListener('click', createBackup);
  refreshBtn.addEventListener('click', loadData);
  
  // Auto-refresh every 30 seconds
  setInterval(loadData, 30000);
});

// Check if user is authenticated
async function checkAuthentication() {
  try {
    const response = await fetch(`${API_URL}/auth/status`, {
      credentials: 'include'
    });
    const data = await response.json();
    
    if (!data.authenticated) {
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Auth check error:', error);
    window.location.href = '/login';
  }
}

// Logout function
async function logout() {
  showConfirmModal({
    title: 'Confirm Logout',
    message: 'Are you sure you want to terminate your current security console session?',
    iconType: 'logout',
    confirmText: 'Logout',
    isDanger: false,
    onConfirm: async () => {
      try {
        const response = await fetch(`${API_URL}/logout`, {
          method: 'POST',
          credentials: 'include'
        });
        
        if (response.ok) {
          window.location.href = '/login';
        } else {
          showToast('Logout failed', 'error');
        }
      } catch (error) {
        console.error('Logout error:', error);
        showToast('Logout error', 'error');
      }
    }
  });
}

// Load all data
async function loadData() {
  try {
    await Promise.all([
      loadBackups(),
      loadStatus()
    ]);
  } catch (error) {
    console.error('Error loading data:', error);
    showToast('Failed to load data', 'error');
  }
}

// Load backups list
async function loadBackups() {
  try {
    const response = await fetch(`${API_URL}/backups`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch backups');
    
    const backups = await response.json();
    
    if (backups.length === 0) {
      backupsList.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path>
            <circle cx="12" cy="12" r="3" stroke="#ff4a5a"></circle>
            <line x1="12" y1="10" x2="12" y2="14" stroke="#ff4a5a"></line>
            <line x1="10" y1="12" x2="14" y2="12" stroke="#ff4a5a"></line>
          </svg>
          <h3>No database backups found</h3>
          <p>Initiate a new manual backup using the "Create Backup Now" button above.</p>
        </div>
      `;
      return;
    }

    backupsList.innerHTML = backups.map(backup => `
      <div class="backup-item">
        <div class="backup-info">
          <div class="backup-name">${backup.name}</div>
          <div class="backup-meta">
            <div class="backup-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>${formatDate(new Date(backup.created))}</span>
            </div>
            <div class="backup-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              <span>${backup.size}</span>
            </div>
          </div>
        </div>
        <div class="backup-actions">
          <button class="btn-small btn-download" onclick="downloadBackup('${backup.name}')">
            <svg class="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download
          </button>
          <button class="btn-small btn-delete" onclick="confirmDeleteBackup('${backup.name}')">
            <svg class="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
            Delete
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading backups:', error);
    backupsList.innerHTML = `
      <div class="loading">
        <svg class="empty-state-svg" viewBox="0 0 24 24" fill="none" stroke="#ff4a5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>Error loading backups from system.</p>
      </div>
    `;
  }
}

// Load status
async function loadStatus() {
  try {
    const response = await fetch(`${API_URL}/status`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch status');
    
    const status = await response.json();
    
    totalBackups.textContent = status.total || 0;
    
    if (status.lastBackup) {
      lastBackupTime.textContent = formatDate(new Date(status.lastBackup.created));
      lastBackupSize.textContent = status.lastBackup.size;
    } else {
      lastBackupTime.textContent = 'Never';
      lastBackupSize.textContent = '-';
    }
  } catch (error) {
    console.error('Error loading status:', error);
  }
}

// Create backup
async function createBackup() {
  if (createBackupBtn.disabled) return;
  
  createBackupBtn.disabled = true;
  const originalText = createBackupBtn.innerHTML;
  createBackupBtn.innerHTML = '<span class="spinner"></span> Creating...';
  
  try {
    const response = await fetch(`${API_URL}/backups/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create backup');
    }
    
    const result = await response.json();
    showToast(`✅ Backup created: ${result.backup}`, 'success');
    await loadData();
  } catch (error) {
    console.error('Error creating backup:', error);
    showToast(`❌ ${error.message}`, 'error');
  } finally {
    createBackupBtn.disabled = false;
    createBackupBtn.innerHTML = originalText;
  }
}

// Download backup
async function downloadBackup(filename) {
  try {
    const link = document.createElement('a');
    link.href = `${API_URL}/backups/download/${filename}`;
    link.download = `${filename}.tar.gz`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`📥 Downloaded: ${filename}`, 'success');
  } catch (error) {
    console.error('Error downloading backup:', error);
    showToast('Failed to download backup', 'error');
  }
}

// Confirm delete backup with dialog
function confirmDeleteBackup(filename) {
  showConfirmModal({
    title: 'Delete Backup',
    message: `Are you sure you want to permanently delete this database backup? This action is irreversible. File: ${filename}`,
    iconType: 'danger',
    confirmText: 'Delete Backup',
    isDanger: true,
    onConfirm: () => {
      deleteBackup(filename);
    }
  });
}

// Delete backup
async function deleteBackup(filename) {
  try {
    const response = await fetch(`${API_URL}/backups/${filename}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete backup');
    }

    const result = await response.json();
    showToast(`🗑️ Deleted: ${filename}`, 'success');
    await loadData();
  } catch (error) {
    console.error('Error deleting backup:', error);
    showToast(`❌ ${error.message}`, 'error');
  }
}

// Show toast notification
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// Format date
function formatDate(date) {
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return date.toLocaleDateString('en-US', options);
}

// Custom confirmation modal controller
function showConfirmModal({ title, message, iconType, confirmText, isDanger, onConfirm }) {
  const modal = document.getElementById('confirmModal');
  const titleEl = document.getElementById('modalTitle');
  const messageEl = document.getElementById('modalMessage');
  const confirmBtn = document.getElementById('modalConfirmBtn');
  const cancelBtn = document.getElementById('modalCancelBtn');
  const iconEl = document.getElementById('modalIcon');

  titleEl.textContent = title;
  messageEl.textContent = message;
  confirmBtn.textContent = confirmText || 'Confirm';
  
  if (isDanger) {
    confirmBtn.className = 'btn btn-danger-action';
  } else {
    confirmBtn.className = 'btn btn-primary';
  }

  // Set Icon SVG
  if (iconType === 'danger') {
    iconEl.innerHTML = `
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    `;
    iconEl.setAttribute('stroke', 'var(--danger-color)');
  } else if (iconType === 'logout') {
    iconEl.innerHTML = `
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    `;
    iconEl.setAttribute('stroke', 'var(--warning-color)');
  }

  modal.classList.add('show');

  const cleanup = () => {
    modal.classList.remove('show');
  };

  const handleConfirm = () => {
    cleanup();
    if (onConfirm) onConfirm();
  };

  const handleCancel = () => {
    cleanup();
  };

  // Clone buttons to clear previous event listeners
  const newConfirmBtn = confirmBtn.cloneNode(true);
  const newCancelBtn = cancelBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

  newConfirmBtn.addEventListener('click', handleConfirm);
  newCancelBtn.addEventListener('click', handleCancel);
}
