window.__googleSignInReady = false;

window.renderGoogleButtons = function() {
  try {
    var buttons = document.querySelectorAll('button[onclick*="firebaseGoogleSignIn"]');
    buttons.forEach(function(btn) {
      var width = btn.offsetWidth;
      if (!width || width < 50) {
        width = btn.parentElement ? btn.parentElement.offsetWidth : 400;
      }
      if (!width || width < 50) width = 400;
      var isSignup = btn.closest('#register-form') !== null;
      google.accounts.id.renderButton(btn, {
        theme: 'outline',
        size: 'large',
        width: width,
        text: isSignup ? 'signup_with' : 'signin_with'
      });
    });
  } catch (e) {
    console.error('Failed to render Google buttons:', e);
  }
};

window.onGoogleSignIn = function(response) {
  const credential = response.credential;
  if (!credential) {
    showToast('error', 'Google sign-in failed: no credential received.');
    return;
  }

  const API_BASE = (function() {
    if (window.SmartParkConfig && window.SmartParkConfig.API_BASE) return window.SmartParkConfig.API_BASE;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('api')) return urlParams.get('api').replace(/\/$/, '');
    const meta = document.querySelector('meta[name="smartpark-api-url"]');
    if (meta) { const c = meta.getAttribute('content') || ''; if (c) return c.replace(/\/$/, ''); }
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') { const p = window.location.port; return (p === '3000' || !p) ? window.location.origin : 'http://localhost:3000'; }
    if (window.location.protocol === 'file:') return 'http://localhost:3000';
    if (hostname.endsWith('.github.io') || hostname.includes('.github.io')) {
        return (window.location.protocol === 'https:' ? 'https://' : 'http://') + 'smartpark-backend.onrender.com';
    }
    return window.location.origin;
  })();

  const role = window.__googleSignInRole || 'customer';

  if (!API_BASE) {
    const payload = JSON.parse(atob(credential.split('.')[1]));
    const emailLower = (payload.email || '').toLowerCase();
    const users = JSON.parse(localStorage.getItem('smartParkUsers') || '[]');
    let found = users.find(function(u) { return (u.email || '').toLowerCase() === emailLower; });
    if (!found) {
      found = { email: emailLower, password: 'google-oauth', role: role, name: payload.name || emailLower.split('@')[0] };
      users.push(found);
      localStorage.setItem('smartParkUsers', JSON.stringify(users));
    } else if (role === 'admin' && found.role !== 'admin') {
      showToast('error', 'This Google account is not registered as an admin.');
      return;
    }
    const finalRole = found.role || role;
    const tokenKey = finalRole === 'admin' ? 'token_admin' : 'token_customer';
    const userKey = finalRole === 'admin' ? 'loggedInUser_admin' : 'loggedInUser_customer';
    localStorage.setItem(tokenKey, 'static-' + finalRole);
    localStorage.setItem(userKey, JSON.stringify({ email: emailLower, role: finalRole, name: found.name || emailLower.split('@')[0] }));
    showToast('success', 'Google login successful (offline mode)! Redirecting...');
    setTimeout(function() {
      window.location.href = finalRole === 'admin' ? 'admin.html' : 'book-parking.html';
    }, 1500);
    return;
  }

  fetch(`${API_BASE}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: credential, role: role })
  })
  .then(function(res) { return res.json().then(function(data) { return { status: res.status, data: data }; }); })
  .then(function(result) {
    if (result.status === 200 && result.data.token) {
      const payload = JSON.parse(atob(credential.split('.')[1]));
      const emailLower = (payload.email || '').toLowerCase();
      const role = result.data.role || 'customer';
      const tokenKey = role === 'admin' ? 'token_admin' : 'token_customer';
      const userKey = role === 'admin' ? 'loggedInUser_admin' : 'loggedInUser_customer';
      localStorage.setItem(tokenKey, result.data.token);
      localStorage.setItem(userKey, JSON.stringify({ email: emailLower, role: role, name: result.data.name || payload.name || emailLower.split('@')[0] }));
      showToast('success', 'Google login successful! Redirecting...');
      setTimeout(function() {
        window.location.href = role === 'admin' ? 'admin.html' : 'book-parking.html';
      }, 1500);
    } else {
      showToast('error', result.data.msg || 'Google authentication failed.');
    }
  })
  .catch(function(err) {
    console.error('Google sign-in backend error:', err);
    const emailLower = (function() {
      try {
        const payload = JSON.parse(atob(credential.split('.')[1]));
        return (payload.email || '').toLowerCase();
      } catch (e) { return ''; }
    })();
    if (emailLower) {
      const users = JSON.parse(localStorage.getItem('smartParkUsers') || '[]');
      let found = users.find(function(u) { return (u.email || '').toLowerCase() === emailLower; });
      if (!found) {
        found = { email: emailLower, password: 'google-oauth', role: role, name: emailLower.split('@')[0] };
        users.push(found);
        localStorage.setItem('smartParkUsers', JSON.stringify(users));
      }
      const finalRole = found.role || role;
      const tokenKey = finalRole === 'admin' ? 'token_admin' : 'token_customer';
      const userKey = finalRole === 'admin' ? 'loggedInUser_admin' : 'loggedInUser_customer';
      localStorage.setItem(tokenKey, 'static-' + finalRole);
      localStorage.setItem(userKey, JSON.stringify({ email: emailLower, role: finalRole, name: found.name || emailLower.split('@')[0] }));
      showToast('success', 'Google login successful (offline mode)! Redirecting...');
      setTimeout(function() {
        window.location.href = finalRole === 'admin' ? 'admin.html' : 'book-parking.html';
      }, 1500);
    } else {
      showToast('error', 'Google authentication failed.');
    }
  });
};

window.firebaseGoogleSignIn = function(role) {
  role = role || 'customer';
  window.__googleSignInRole = role;
  if (window.__googleSignInReady && window.google && google.accounts && google.accounts.id) {
    google.accounts.id.prompt();
  } else {
    showToast('error', 'Google Sign-In is not ready yet. Please wait a moment and try again.');
  }
};

window.initializeGoogleSignIn = function() {
  if (window.google && google.accounts && google.accounts.id) {
    google.accounts.id.initialize({
      client_id: (window.env && window.env.GOOGLE_CLIENT_ID) || '',
      callback: window.onGoogleSignIn,
      auto_select: false,
      cancel_on_tap_outside: true
    });
    window.__googleSignInReady = true;
    window.renderGoogleButtons();
  }
};

window.__gisOnLoad = function() {
  window.initializeGoogleSignIn();
};

// Auto-initialize if Google API is already loaded
if (window.google && google.accounts && google.accounts.id) {
    window.initializeGoogleSignIn();
}

window.verifyGoogleSignIn = function() {
  const results = [];
  if (window.__googleSignInReady) {
    results.push('PASS: Google Sign-In is initialized');
  } else {
    results.push('FAIL: Google Sign-In is not initialized');
  }
  if (typeof window.firebaseGoogleSignIn === 'function') {
    results.push('PASS: firebaseGoogleSignIn is available');
  } else {
    results.push('FAIL: firebaseGoogleSignIn is not available');
  }
  if (typeof window.renderGoogleButtons === 'function') {
    results.push('PASS: renderGoogleButtons is available');
  } else {
    results.push('FAIL: renderGoogleButtons is not available');
  }
  console.log('Google Sign-In Verification:\n' + results.join('\n'));
  return results;
};
