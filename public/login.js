const loginForm = document.getElementById('loginForm');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('errorMessage');
const loadingSpinner = document.getElementById('loadingSpinner');
const loginBtn = loginForm.querySelector('.btn-login');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const password = passwordInput.value;
  
  if (!password) {
    showError('Password is required');
    return;
  }

  showLoading(true);
  
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ password })
    });

    const data = await response.json();

    if (response.ok) {
      // Redirect to dashboard on successful login
      window.location.href = '/';
    } else {
      showError(data.error || 'Login failed');
      passwordInput.value = '';
      passwordInput.focus();
    }
  } catch (error) {
    console.error('Login error:', error);
    showError('An error occurred. Please try again.');
    passwordInput.value = '';
  } finally {
    showLoading(false);
  }
});

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('show');
  
  setTimeout(() => {
    errorMessage.classList.remove('show');
  }, 5000);
}

function showLoading(isLoading) {
  loginBtn.disabled = isLoading;
  if (isLoading) {
    loadingSpinner.classList.remove('hidden');
  } else {
    loadingSpinner.classList.add('hidden');
  }
}

// Focus on password input on page load
window.addEventListener('load', () => {
  passwordInput.focus();
});
