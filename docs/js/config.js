window.SmartParkConfig = window.SmartParkConfig || {};

(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const apiParam = urlParams.get('api');
    if (apiParam) {
        window.SmartParkConfig.API_BASE = apiParam.replace(/\/$/, '');
        return;
    }

    const meta = document.querySelector('meta[name="smartpark-api-url"]');
    if (meta) {
        const metaContent = (meta.getAttribute('content') || '').replace(/\/$/, '');
        if (metaContent) {
            window.SmartParkConfig.API_BASE = metaContent;
            return;
        }
    }

    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const p = window.location.port;
        window.SmartParkConfig.API_BASE = (p === '3000' || !p) ? window.location.origin : 'http://localhost:3000';
    } else {
        window.SmartParkConfig.API_BASE = '';
    }
})();

function isTokenExpired(token) {
    if (!token || token.startsWith('static-')) return false;
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(window.atob(base64));
        if (decoded && decoded.exp) {
            return Date.now() >= decoded.exp * 1000;
        }
    } catch (e) {}
    return false;
}
function clearAuthTokens(role) {
    if (role === 'admin' || role === 'both') {
        localStorage.removeItem('token_admin');
        localStorage.removeItem('loggedInUser_admin');
    }
    if (role === 'customer' || role === 'both') {
        localStorage.removeItem('token_customer');
        localStorage.removeItem('loggedInUser_customer');
    }
}
function validateAdminToken() {
    const token = localStorage.getItem('token_admin');
    if (!token) return false;
    if (token.startsWith('static-')) {
        const loggedInUserStr = localStorage.getItem('loggedInUser_admin');
        if (!loggedInUserStr) return false;
        try {
            const userObj = JSON.parse(loggedInUserStr);
            return userObj && userObj.role === 'admin';
        } catch (e) { return false; }
    }
    if (isTokenExpired(token)) {
        clearAuthTokens('admin');
        return false;
    }
    return true;
}
function validateCustomerToken() {
    const token = localStorage.getItem('token_customer');
    if (!token) return false;
    if (token.startsWith('static-')) {
        const loggedInUserStr = localStorage.getItem('loggedInUser_customer');
        if (!loggedInUserStr) return false;
        try {
            const userObj = JSON.parse(loggedInUserStr);
            return userObj && (userObj.role === 'customer' || userObj.role === 'user');
        } catch (e) { return false; }
    }
    if (isTokenExpired(token)) {
        clearAuthTokens('customer');
        return false;
    }
    return true;
}
