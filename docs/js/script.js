// SmartPark - AI-Powered JavaScript v2.0
const API_BASE = (() => {
    const urlParams = new URLSearchParams(window.location.search);
    const apiParam = urlParams.get('api');
    if (apiParam) return apiParam.replace(/\/$/, '');
    const meta = document.querySelector('meta[name="smartpark-api-url"]');
    if (meta) { const c = meta.getAttribute('content') || ''; if (c) return c.replace(/\/$/, ''); }
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') { const p = window.location.port; return (p === '3000' || !p) ? window.location.origin : 'http://localhost:3000'; }
    return '';
})();

document.addEventListener('DOMContentLoaded', () => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) { const emailInput = document.getElementById('login-email'); if (emailInput) { emailInput.value = rememberedEmail; document.getElementById('remember-me').checked = true; } }
});

function getRoleTokenKey(role) { return role === 'admin' ? 'token_admin' : 'token_customer'; }
function getRoleUserKey(role) { return role === 'admin' ? 'loggedInUser_admin' : 'loggedInUser_customer'; }
function getStoredToken(role) { return localStorage.getItem(getRoleTokenKey(role)); }
function getStoredLoggedInUser(role) { const v = localStorage.getItem(getRoleUserKey(role)); return v ? JSON.parse(v) : null; }
function setStoredAuth(role, token, user) { localStorage.setItem(getRoleTokenKey(role), token); localStorage.setItem(getRoleUserKey(role), JSON.stringify(user)); }
function removeStoredAuth(role) { localStorage.removeItem(getRoleTokenKey(role)); localStorage.removeItem(getRoleUserKey(role)); }

async function fetchUserSessions() {
    const token = localStorage.getItem('token_customer');
    if (!token) return [];
    try {
        const response = await fetch(`${API_BASE}/api/parking/my-sessions`, { method: 'GET', headers: { 'x-auth-token': token, 'Content-Type': 'application/json' } });
        const data = await response.json();
        if (response.ok) return data;
        else { showToast('error', data.msg || 'Failed to fetch sessions.'); return []; }
    } catch (error) {
        var saved = getUserData('customerParkingData');
        return saved && saved.sessions ? saved.sessions.filter(function(s) { return s.status === 'Active' && (s.paymentStatus || '') !== 'Rejected'; }) : [];
    }
}

async function saveParkingSession(sessionData) {
    const token = localStorage.getItem('token_customer');
    if (!token) { showToast('error', 'You must be logged in to reserve a spot.'); return null; }
    try {
        const response = await fetch(`${API_BASE}/api/parking`, { method: 'POST', headers: { 'x-auth-token': token, 'Content-Type': 'application/json' }, body: JSON.stringify(sessionData) });
        const data = await response.json();
        if (response.ok) { showToast('success', `Spot ${sessionData.zone} reserved!`); showToast('info', `📡 Sensors: plate=${sessionData.plate||'SIM-123'}, ultrasonic=object-detected, camera=image-captured`); return data; }
        else { showToast('error', data.msg || 'Failed to reserve spot.'); return null; }
    } catch (error) {
        var saved = getUserData('customerParkingData');
        var sessions = saved ? saved.sessions : [];
        var nextId = saved ? saved.nextId : 1000;
        var newSession = Object.assign({ id: nextId, status: 'Active', createdAt: new Date().toISOString() }, sessionData);
        sessions.push(newSession);
        var nextBookingId = (saved ? saved.nextId : 1000) + 1;
        var nextHistoryId = saved ? saved.nextHistId : 2000;
        var zoneSlots = saved ? saved.zoneSlots : {};
        saveData(sessions, saved ? saved.history : [], nextBookingId, nextHistoryId, zoneSlots);
        showToast('success', `Spot ${sessionData.zone} reserved!`);
        showToast('info', `📡 Sensors: plate=${sessionData.plate||'SIM-123'}, ultrasonic=object-detected, camera=image-captured`);
        return newSession;
    }
}

async function deleteParkingSession(sessionId) {
    const token = localStorage.getItem('token_customer');
    if (!token) { showToast('error', 'You must be logged in to cancel.'); return false; }
    try {
        const response = await fetch(`${API_BASE}/api/parking/${sessionId}`, { method: 'DELETE', headers: { 'x-auth-token': token, 'Content-Type': 'application/json' } });
        const data = await response.json();
        if (response.ok) { showToast('info', 'Reservation cancelled.'); return true; }
        else { showToast('error', data.msg || 'Failed to cancel.'); return false; }
    } catch (error) {
        var saved = getUserData('customerParkingData');
        if (saved && saved.sessions) { saved.sessions = saved.sessions.filter(function(s) { return String(s.id) !== String(sessionId); }); saveData(saved.sessions, saved.history, saved.nextId, saved.nextHistId, saved.zoneSlots); }
        showToast('info', 'Reservation cancelled.');
        return true;
    }
}

function getLoggedInUser() {
    for (const role of ['customer', 'admin']) {
        const token = localStorage.getItem(getRoleTokenKey(role));
        if (!token) continue;
        try {
            if (typeof token === 'string' && token.startsWith('static-')) {
                const loggedInUserStr = localStorage.getItem(getRoleUserKey(role));
                if (loggedInUserStr) { const userObj = JSON.parse(loggedInUserStr); if (userObj && userObj.email) return { email: userObj.email, role: userObj.role }; }
                const parts = token.split('-'); if (parts.length >= 3) return { email: 'user-' + parts[2], role: parts[1] || role };
                return null;
            }
            const base64Url = token.split('.')[1]; const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const decodedPayload = JSON.parse(window.atob(base64));
            return { email: decodedPayload.user.email, role: decodedPayload.user.role, id: decodedPayload.user.id };
        } catch (error) { console.error('Error decoding token:', error); continue; }
    }
    return null;
}

function getUserData(key, defaultValue = []) {
    const user = getLoggedInUser(); if (!user) return defaultValue;
    const allData = JSON.parse(localStorage.getItem(key + '_by_user')) || {};
    return allData[user.email] || defaultValue;
}
function setUserData(key, data) {
    const user = getLoggedInUser(); if (!user) return;
    let allData = JSON.parse(localStorage.getItem(key + '_by_user')) || {}; allData[user.email] = data; localStorage.setItem(key + '_by_user', JSON.stringify(allData));
}

function getPaymentsForUser() {
    const user = getLoggedInUser(); if (!user) return [];
    const allPayments = JSON.parse(localStorage.getItem('smartParkPayments_by_user')) || {}; return allPayments[user.email] || [];
}

function getCustomerAnomalies() {
    var anomalies = [];
    var user = getLoggedInUser();
    if (!user) return anomalies;

    var saved = getUserData('customerParkingData');
    var userSessions = (saved && saved.sessions) ? saved.sessions.filter(function(s) {
        return s.status === 'Active' && (s.paymentStatus || '') !== 'Rejected';
    }) : [];

    if (userSessions.length === 0) return anomalies;

    var allSessions = [];
    try {
        var allData = JSON.parse(localStorage.getItem('customerParkingData_by_user')) || {};
        Object.keys(allData).forEach(function(email) {
            if (allData[email] && allData[email].sessions) {
                allSessions = allSessions.concat(allData[email].sessions);
            }
        });
    } catch (e) { allSessions = userSessions; }

    var activeAll = allSessions.filter(function(s) {
        return s.status === 'Active' && (s.paymentStatus || '') !== 'Rejected';
    });

    if (userSessions.length > 1) {
        anomalies.push({
            type: 'multiple_sessions',
            severity: 'warning',
            message: 'You have ' + userSessions.length + ' active parking sessions. End sessions you no longer need to avoid conflicts.',
            sessionIds: userSessions.map(function(s) { return s.id; })
        });
    }

    var vehicleMap = {};
    userSessions.forEach(function(s) {
        var plate = (s.vehicle || '').toUpperCase();
        if (!plate) return;
        if (!vehicleMap[plate]) vehicleMap[plate] = [];
        vehicleMap[plate].push(s);
    });
    Object.keys(vehicleMap).forEach(function(plate) {
        if (vehicleMap[plate].length > 1) {
            anomalies.push({
                type: 'duplicate_vehicle',
                severity: 'critical',
                message: 'Vehicle ' + plate + ' has ' + vehicleMap[plate].length + ' active bookings. Only one active booking per vehicle is allowed.',
                sessionIds: vehicleMap[plate].map(function(s) { return s.id; })
            });
        }
    });

    userSessions.forEach(function(s) {
        if (s.slotIndex === undefined || s.slotIndex === null) return;
        var zone = Object.values(zonesData).find(function(z) { return z.id === s.zoneId || z.name === s.zone; });
        if (!zone) return;
        if (s.slotIndex < 0 || s.slotIndex >= zone.spots) {
            anomalies.push({
                type: 'invalid_slot',
                severity: 'critical',
                message: 'Your booking in ' + (s.zone || 'Unknown') + ' uses an invalid slot (' + (s.slot || '?') + '). Please contact support.',
                sessionId: s.id
            });
        }
    });

    userSessions.forEach(function(s) {
        var zone = Object.values(zonesData).find(function(z) { return z.id === s.zoneId || z.name === s.zone; });
        if (!zone) return;
        var zoneActiveCount = activeAll.filter(function(ss) {
            return (ss.zoneId === zone.id || ss.zone === zone.name);
        }).length;
        if (zoneActiveCount > zone.spots) {
            anomalies.push({
                type: 'zone_overflow',
                severity: 'critical',
                message: zone.name + ' is over capacity (' + zoneActiveCount + '/' + zone.spots + '). Your booking may be at risk.',
                zoneId: zone.id
            });
        }
    });

    userSessions.forEach(function(s) {
        if (s.bookingType !== 'fixed' || !s.durationHours) return;
        var createdAt = s.createdAt ? new Date(s.createdAt).getTime() : Date.now();
        var elapsedSeconds = Math.floor((Date.now() - createdAt) / 1000);
        var fixedDurationSecs = s.durationHours * 3600;
        if (elapsedSeconds >= fixedDurationSecs) {
            anomalies.push({
                type: 'expired_session',
                severity: 'warning',
                message: 'Your fixed session in ' + (s.zone || 'Unknown') + ' has expired. Please end it to free the slot.',
                sessionId: s.id
            });
        }
    });

    var fixedSessions = userSessions.filter(function(s) { return s.bookingType === 'fixed' && s.durationHours; });
    for (var i = 0; i < fixedSessions.length; i++) {
        for (var j = i + 1; j < fixedSessions.length; j++) {
            var s1 = fixedSessions[i];
            var s2 = fixedSessions[j];
            if ((s1.zoneId === s2.zoneId || s1.zone === s2.zone) && s1.id !== s2.id) {
                anomalies.push({
                    type: 'overlapping_sessions',
                    severity: 'warning',
                    message: 'You have overlapping fixed sessions in ' + (s1.zone || 'Unknown') + '. Please end one to avoid double-booking.',
                    sessionIds: [s1.id, s2.id]
                });
            }
        }
    }

    return anomalies;
}

function savePaymentRecord(paymentRecord) {
    const user = getLoggedInUser(); if (!user) return;
    let allPayments = JSON.parse(localStorage.getItem('smartParkPayments_by_user')) || {};
    if (!allPayments[user.email]) allPayments[user.email] = [];
    allPayments[user.email].push(paymentRecord); localStorage.setItem('smartParkPayments_by_user', JSON.stringify(allPayments));
}
function savePaymentToLedger(session, method) {
    savePaymentRecord({ id: 'PAY-' + String(Date.now()).slice(-8), bookingId: session.id || session.bookingId, customerName: session.name || session.customerName || 'N/A', vehicle: session.vehicle || 'N/A', zone: session.zone || 'N/A', slot: session.slot || 'N/A', amount: session.cost || 0, paymentMethod: method, customerNumber: session.customerNumber || 'N/A', trxId: session.trxId || 'N/A', status: 'Pending', createdAt: new Date().toISOString() });
}
function savePaymentToAdmin(booking, customerNumber, trxId) {
    savePaymentRecord({ id: 'PAY-' + String((getPaymentsForUser()).length + 1).padStart(4, '0'), bookingId: booking.id, customerName: booking.name, vehicle: booking.vehicle, zone: booking.zone, slot: booking.slot, amount: booking.cost, paymentMethod: booking.payment, customerNumber: customerNumber, trxId: trxId, date: booking.date, time: booking.entryTime, status: 'Pending', adminVerified: false, createdAt: new Date().toISOString() });
}
function clearUserData() {
    const user = getLoggedInUser(); if (!user) return;
    ['customerParkingData_by_user', 'userHistory_by_user', 'smartParkPayments_by_user'].forEach(function(storageKey) { let allData = JSON.parse(localStorage.getItem(storageKey)) || {}; delete allData[user.email]; localStorage.setItem(storageKey, JSON.stringify(allData)); });
}
function getUserHistory() { return getUserData('userHistory', []); }
function saveUserHistory(history) { setUserData('userHistory', history); }

let zonesData = {};

function getZonePrefix(zoneName) { return zoneName.replace('Zone ', ''); }
function loadZonesFromAPI() {
    loadZonesFromLocalStorage();
    return fetch(`${API_BASE}/api/zones`, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
    .then(r => r.json())
    .then(data => {
        if (Array.isArray(data) && data.length > 0) {
            zonesData = {};
            data.forEach(function(z) { zonesData[z.id] = z; });
        }
    })
    .catch(err => { console.error('Backend not available, using local zones data:', err); });
}
function loadZonesFromLocalStorage() {
    const key = 'smartParkZones_local';
    try {
        const zones = JSON.parse(localStorage.getItem(key)) || [];
        if (zones.length > 0) {
            zonesData = {};
            zones.forEach(function(z) {
                zonesData[z.id] = { ...z, occupied: 0, free: z.spots || 0, spotStatus: Array.from({length: z.spots || 0}, (_, i) => ({ id: (z.id || '').replace('Zone-','') + '-' + String(i+1).padStart(2,'0'), index: i, occupied: false, plate: null, sessionId: null })) };
            });
        } else {
            initDemoZones();
        }
    } catch (e) { console.error('Failed to load zones from local storage:', e); initDemoZones(); }
}

function initDemoZones() {
    if (Object.keys(zonesData).length > 0) return;
    const demoZones = [
        { id: 'Zone-A', name: 'Zone A - Central', location: 'Main Market Area', spots: 6, rate: 40, status: 'Active', lat: 23.8103, lng: 90.4125 },
        { id: 'Zone-B', name: 'Zone B - Riverside', location: 'River View Road', spots: 5, rate: 50, status: 'Active', lat: 23.815, lng: 90.405 },
        { id: 'Zone-C', name: 'Zone C - Tech Park', location: 'IT Campus Road', spots: 4, rate: 60, status: 'Active', lat: 23.808, lng: 90.418 },
        { id: 'Zone-D', name: 'Zone D - Mall Area', location: 'City Center Mall', spots: 7, rate: 70, status: 'Active', lat: 23.812, lng: 90.408 }
    ];
    zonesData = {};
    demoZones.forEach(function(z) {
        zonesData[z.id] = { ...z, occupied: 0, free: z.spots, spotStatus: Array.from({length: z.spots}, (_, i) => ({ id: z.id.replace('Zone-','') + '-' + String(i+1).padStart(2,'0'), index: i, occupied: false, plate: null, sessionId: null })) };
    });
    localStorage.setItem('smartParkZones_local', JSON.stringify(demoZones));
}
window.addEventListener('storage', function(e) {
    if (e.key === 'smartParkZones_local') {
        loadZonesFromLocalStorage();
        if (document.getElementById('customer-zones-grid') && typeof renderZones === 'function') renderZones();
    }
});
function initZoneSlots(zoneSlots) { Object.keys(zonesData).forEach(function(key) { var z = zonesData[key]; if (!zoneSlots[key]) zoneSlots[key] = new Array(z.spots).fill(false); }); }
function syncZoneOccupancy(sessions) {
    Object.values(zonesData).forEach(function(z) { z.occupied = 0; });
    sessions.forEach(function(s) { if (s.status === 'Active' && (s.paymentStatus || '') !== 'Rejected') { var zone = Object.values(zonesData).find(function(z) { return z.name === s.zone; }); if (zone) zone.occupied = (zone.occupied || 0) + 1; } });
    Object.values(zonesData).forEach(function(z) { z.free = Math.max(0, z.spots - z.occupied); });
}
function saveData(sessions, history, nextBookingId, nextHistoryId, zoneSlots) { setUserData('customerParkingData', { sessions: sessions, history: history, nextId: nextBookingId, nextHistId: nextHistoryId, zoneSlots: zoneSlots }); }
function loadParkingData() {
    var sessions = [], history = [], nextBookingId = 1000, nextHistoryId = 2000, zoneSlots = {};
    try {
        var saved = getUserData('customerParkingData');
        if (saved) { sessions = saved.sessions || []; history = saved.history || []; nextBookingId = saved.nextId || 1000; nextHistoryId = saved.nextHistId || 2000; zoneSlots = saved.zoneSlots || {}; if (Object.keys(zoneSlots).length === 0) initZoneSlots(zoneSlots); syncZoneOccupancy(sessions); }
        else { initZoneSlots(zoneSlots); }
    } catch(e) {}
    return { sessions: sessions, history: history, nextBookingId: nextBookingId, nextHistoryId: nextHistoryId, zoneSlots: zoneSlots };
}
function formatTime(totalSeconds) { var h = Math.floor(totalSeconds / 3600), m = Math.floor((totalSeconds % 3600) / 60), s = totalSeconds % 60; return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0'); }
function formatTimeAMPM(timeStr) { if (!timeStr || timeStr === '-') return '-'; var parts = timeStr.split(':'); if (parts.length < 2) return timeStr; var h = parseInt(parts[0], 10), m = parts[1]; var ampm = h >= 12 ? 'PM' : 'AM'; if (h > 12) h = h - 12; if (h === 0) h = 12; return h + ':' + m + ' ' + ampm; }
function escHtml(str) { return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function safe(str) { return escHtml(str); }
function savePaymentForUser(paymentRecord) { const user = getLoggedInUser(); if (!user) return; let allPayments = JSON.parse(localStorage.getItem('smartParkPayments_by_user')) || {}; if (!allPayments[user.email]) allPayments[user.email] = []; allPayments[user.email].push(paymentRecord); localStorage.setItem('smartParkPayments_by_user', JSON.stringify(allPayments)); }
function getPaymentsForUser() { const user = getLoggedInUser(); if (!user) return []; const allPayments = JSON.parse(localStorage.getItem('smartParkPayments_by_user')) || {}; return allPayments[user.email] || []; }

let currentRole = 'customer';

function setRole(role) {
    const customerBtn = document.getElementById('role-customer');
    const adminBtn = document.getElementById('role-admin');
    const welcomeTitle = document.getElementById('login-welcome-title');
    const welcomeDesc = document.getElementById('login-welcome-desc');
    const adminKeyContainer = document.getElementById('admin-key-container');
    const adminKeyInput = document.getElementById('login-admin-key');
    const submitBtn = document.getElementById('login-submit-btn');
    const submitText = document.getElementById('login-submit-text');
    if (!customerBtn || !submitBtn) return;
    if (role === 'customer') {
        currentRole = 'customer';
        customerBtn.className = "flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all duration-300 bg-gradient-to-r from-sp-accent to-sp-accent text-white shadow-md";
        adminBtn.className = "flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all duration-300 text-slate-400 hover:text-slate-200";
        welcomeTitle.textContent = "Welcome Back!"; welcomeDesc.textContent = "Securely access your parking dashboard.";
        adminKeyContainer.classList.add('hidden', 'opacity-0', 'max-h-0'); adminKeyContainer.classList.remove('opacity-100', 'max-h-20');
        adminKeyInput.removeAttribute('required'); adminKeyInput.value = '';
        submitBtn.className = "btn-primary w-full py-3.5 flex items-center justify-center gap-2 group";
        submitText.innerHTML = '<i class="fa-solid fa-right-to-bracket group-hover:translate-x-1 transition-transform"></i> Secure Sign In';
    } else {
        currentRole = 'admin';
        adminBtn.className = "flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all duration-300 bg-gradient-to-r from-sp-purple to-sp-accent text-white shadow-md";
        customerBtn.className = "flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all duration-300 text-slate-400 hover:text-slate-200";
        welcomeTitle.textContent = "Admin Control Panel"; welcomeDesc.textContent = "Enter your administrator credentials.";
        adminKeyContainer.classList.remove('hidden', 'opacity-0', 'max-h-0'); adminKeyContainer.classList.add('opacity-100', 'max-h-20');
        adminKeyInput.setAttribute('required', 'true');
        submitBtn.className = "w-full py-3.5 flex items-center justify-center gap-2 rounded-xl font-semibold text-white transition-all duration-300";
        submitBtn.style.background = 'linear-gradient(135deg, #8B5CF6, #3B82F6)';
        submitBtn.style.boxShadow = '0 4px 14px rgba(139,92,246,0.35)';
        submitText.innerHTML = '<i class="fa-solid fa-shield-halved group-hover:scale-110 transition-transform"></i> Secure Admin Sign In';
    }
}

function switchTab(tab) {
    const loginTab = document.getElementById('tab-login');
    const registerTab = document.getElementById('tab-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (tab === 'login') {
        loginTab.className = "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 bg-gradient-to-r from-sp-accent to-sp-accent text-white shadow-lg";
        registerTab.className = "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 text-slate-400 hover:text-slate-200";
        registerForm.classList.add('opacity-0', 'translate-x-8');
        setTimeout(() => { registerForm.classList.add('hidden'); loginForm.classList.remove('hidden'); setTimeout(() => { loginForm.classList.remove('opacity-0', '-translate-x-8'); }, 50); }, 300);
    } else {
        registerTab.className = "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 bg-gradient-to-r from-sp-emerald to-sp-cyan text-white shadow-lg";
        loginTab.className = "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 text-slate-400 hover:text-slate-200";
        loginForm.classList.add('opacity-0', '-translate-x-8');
        setTimeout(() => { loginForm.classList.add('hidden'); registerForm.classList.remove('hidden'); setTimeout(() => { registerForm.classList.remove('opacity-0', 'translate-x-8'); }, 50); }, 300);
    }
}

function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector('i');
    if (input.type === 'password') { input.type = 'text'; icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
    else { input.type = 'password'; icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
}

let freeSpotsCount = 3;
async function toggleSlot(element, slotId) {
    const statusSpan = element.querySelector('.slot-status');
    const icon = element.querySelector('i');
    const user = getLoggedInUser();
    if (!user) { showToast('error', 'Please log in to reserve or cancel spots.'); return; }
    if (element.classList.contains('available')) {
        const parts = slotId.split('-');
        const spotNumber = parts.length > 1 ? parts[1] : '01';
        const zonePrefix = parts[0];
        const zoneName = 'Zone ' + zonePrefix;
        const slotIndex = parseInt(spotNumber, 10) - 1;
        const sessionData = { plateNumber: 'SIM-123', zone: zoneName, spot: slotId, slotIndex: slotIndex, startTime: new Date(), cost: 0 };
        const newSession = await saveParkingSession(sessionData);
        if (newSession) {
            element.classList.remove('available', 'border-emerald-500/30', 'bg-emerald-500/5');
            element.classList.add('reserved');
            statusSpan.textContent = 'RESERVED';
            statusSpan.className = 'text-[9px] font-semibold px-1.5 py-0.5 rounded bg-sp-accent/15 text-sp-accent slot-status';
            icon.className = 'fa-solid fa-circle-check text-sp-accent text-2xl my-1';
            element.dataset.sessionId = newSession._id || newSession.id;
            freeSpotsCount--;
        }
    } else if (element.classList.contains('reserved')) {
        const sessionId = element.dataset.sessionId;
        if (!sessionId) { showToast('error', 'No session ID found for this reservation.'); return; }
        const success = await deleteParkingSession(sessionId);
        if (success) {
            element.classList.remove('reserved');
            element.classList.add('available', 'border-emerald-500/30', 'bg-emerald-500/5');
            statusSpan.textContent = 'FREE';
            statusSpan.className = 'text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 slot-status';
            icon.className = 'fa-solid fa-square-p text-emerald-500 text-2xl my-1';
            delete element.dataset.sessionId;
            freeSpotsCount++;
        }
    }
    const counter = document.getElementById('available-counter');
    if (counter) counter.textContent = `${Math.max(0, freeSpotsCount)}/6 Spots Free`;
    if (freeSpotsCount === 0) { if(counter) counter.className = "text-xs bg-sp-accent-red/10 text-sp-accent-red px-2.5 py-1 rounded-full border border-sp-accent-red/20 font-medium"; }
    else { if(counter) counter.className = "text-xs bg-sp-accent/10 text-sp-accent px-2.5 py-1 rounded-full border border-sp-accent/20 font-medium"; }
}

function openModal(modalId) { const modal = document.getElementById(modalId); const card = modal.querySelector('.modal-content'); modal.classList.remove('opacity-0', 'pointer-events-none'); card.classList.remove('scale-95'); card.classList.add('scale-100'); }
function closeModal(modalId) { const modal = document.getElementById(modalId); const card = modal.querySelector('.modal-content'); card.classList.remove('scale-100'); card.classList.add('scale-95'); modal.classList.add('opacity-0', 'pointer-events-none'); }

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    const submitBtn = document.getElementById('login-submit-btn');
    const originalContent = submitBtn.innerHTML;
    if (rememberMe && currentRole === 'customer') localStorage.setItem('rememberedEmail', email);
    else localStorage.removeItem('rememberedEmail');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch animate-spin mr-2"></i> ' + (currentRole === 'admin' ? 'Verifying...' : 'Securing your spot...');

    const requestBody = { email, password, role: currentRole };
    if (currentRole === 'admin') { const adminKeyInput = document.getElementById('login-admin-key'); if (adminKeyInput && adminKeyInput.value.trim()) requestBody.adminKey = adminKeyInput.value.trim(); }

    try {
        const res = await fetch(`${API_BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        const contentType = res.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        const data = isJson ? await res.json() : { msg: await res.text() };
        if (res.ok && data.token) {
            setStoredAuth(currentRole, data.token, { email, role: currentRole });
            showToast('success', 'Login successful! Redirecting...');
            setTimeout(() => { submitBtn.disabled = false; submitBtn.innerHTML = originalContent; window.location.href = currentRole === 'admin' ? 'admin.html' : 'book-parking.html'; }, 1500);
        } else { throw new Error(data.msg || 'Login failed'); }
    } catch (err) {
        var adminKeyInput = document.getElementById('login-admin-key');
        var enteredAdminKey = adminKeyInput ? adminKeyInput.value.trim() : '';
        if (currentRole === 'admin') { if (enteredAdminKey !== 'SmartParkAdmin2024') { showToast('error', 'Invalid admin security key.'); submitBtn.disabled = false; submitBtn.innerHTML = originalContent; return; } }
        var users = JSON.parse(localStorage.getItem('smartParkUsers') || '[]');
        var emailLower = (email || '').toString().trim().toLowerCase();
        var passwordTrim = (password || '').toString().trim();
        var user = users.find(function(u) { return (u.email || '').toString().trim().toLowerCase() === emailLower && u.password === passwordTrim; });
        if (!user) { if (currentRole === 'admin') { users.push({ email: emailLower, password: passwordTrim, role: 'admin', name: 'Admin User' }); localStorage.setItem('smartParkUsers', JSON.stringify(users)); user = users[users.length - 1]; } else { showToast('error', 'Invalid email or password.'); submitBtn.disabled = false; submitBtn.innerHTML = originalContent; return; } }
        setStoredAuth(currentRole, 'static-token', { email: emailLower, role: currentRole });
        showToast('success', 'Login successful!');
        setTimeout(() => { submitBtn.disabled = false; submitBtn.innerHTML = originalContent; window.location.href = currentRole === 'admin' ? 'admin.html' : 'book-parking.html'; }, 1500);
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const emailLower = (email || '').toString().trim().toLowerCase();
    const passwordTrim = (password || '').toString().trim();
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalContent = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch animate-spin mr-2"></i> Creating account...';
    try {
        const res = await fetch(`${API_BASE}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, role: currentRole, name: name }) });
        const contentType = res.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        const data = isJson ? await res.json() : { msg: await res.text() };
        if (res.ok) { showToast('success', 'Account created! You can now log in.'); setTimeout(() => { submitBtn.disabled = false; submitBtn.innerHTML = originalContent; switchTab('login'); document.getElementById('login-email').value = email; event.target.reset(); }, 1500); }
        else throw new Error(data.msg || 'Registration failed');
    } catch (err) {
        var users = JSON.parse(localStorage.getItem('smartParkUsers') || '[]');
        if (users.some(function(u) { return (u.email || '').toString().trim().toLowerCase() === emailLower; })) { showToast('error', 'Email already registered.'); submitBtn.disabled = false; submitBtn.innerHTML = originalContent; return; }
        users.push({ email: emailLower, password: passwordTrim, role: currentRole, name: document.getElementById('reg-name').value.trim() });
        localStorage.setItem('smartParkUsers', JSON.stringify(users));
        showToast('success', 'Account created! You can now log in.');
        setTimeout(() => { submitBtn.disabled = false; submitBtn.innerHTML = originalContent; switchTab('login'); document.getElementById('login-email').value = email; event.target.reset(); }, 1500);
    }
}

function handleForgotPassword(event) {
    event.preventDefault(); const email = document.getElementById('forgot-email').value;
    closeModal('forgot-modal'); showToast('success', `Password reset link sent to ${email}`); event.target.reset();
}

function socialLogin(provider) { showToast('info', `Connecting with ${provider}...`); setTimeout(() => { showToast('success', `Successfully authenticated with ${provider}!`); }, 1200); }

function handleGoogleCredentialResponse(response) {
    const credential = response.credential;
    if (!credential) { showToast('error', 'Google authentication failed: no credential received.'); return; }
    fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
    })
    .then(res => res.json())
    .then(data => {
        if (data.token) {
            setStoredAuth('customer', data.token, { email: data.email, role: 'customer', name: data.name });
            showToast('success', 'Google login successful! Redirecting...');
            setTimeout(() => { window.location.href = 'book-parking.html'; }, 1500);
        } else {
            showToast('error', data.msg || 'Google authentication failed');
        }
    })
    .catch(() => showToast('error', 'Google authentication failed'));
}

function showToast(type, message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    let bgClass = 'bg-sp-card/95', borderClass = 'border-sp-accent/30', iconClass = 'fa-solid fa-circle-info text-sp-accent', textClass = 'text-sp-accent';
    if (type === 'success') { bgClass = 'bg-sp-card/95'; borderClass = 'border-sp-emerald/30'; iconClass = 'fa-solid fa-circle-check text-sp-emerald'; textClass = 'text-sp-emerald'; }
    else if (type === 'error') { bgClass = 'bg-sp-card/95'; borderClass = 'border-sp-accent-red/30'; iconClass = 'fa-solid fa-circle-exclamation text-sp-accent-red'; textClass = 'text-sp-accent-red'; }
    toast.className = `toast-enter flex items-center gap-3 p-4 rounded-xl border ${borderClass} ${bgClass} shadow-2xl pointer-events-auto max-w-sm w-full`;
    toast.innerHTML = `<div class="flex-shrink-0 text-lg"><i class="${iconClass}"></i></div><div class="flex-grow"><p class="text-xs font-semibold text-slate-200">${message}</p></div><button class="text-slate-500 hover:text-white transition-colors" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark text-xs"></i></button>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.remove('toast-enter'); toast.classList.add('toast-exit'); setTimeout(() => { toast.remove(); }, 300); }, 4000);
}

function logout() { localStorage.removeItem('token_customer'); localStorage.removeItem('loggedInUser_customer'); localStorage.removeItem('token_admin'); localStorage.removeItem('loggedInUser_admin'); window.location.href = 'index.html'; }

// ---- AI Chat System ----
let aiChatOpen = false;
function toggleAIChat() {
    aiChatOpen = !aiChatOpen;
    const panel = document.getElementById('ai-chat-panel');
    if (panel) { if (aiChatOpen) panel.classList.add('open'); else panel.classList.remove('open'); }
}
function sendAIMessage() {
    var input = document.getElementById('ai-chat-input');
    var msg = input.value.trim();
    if (!msg) return;
    if (msg.toLowerCase().includes('image.png') || msg.toLowerCase().includes('.png') || msg.toLowerCase().includes('.jpg') || msg.toLowerCase().includes('.jpeg') || msg.toLowerCase().includes('.gif') || msg.toLowerCase().includes('.bmp')) {
        appendAIChat('user', msg);
        input.value = '';
        setTimeout(() => appendAIChat('ai', 'I cannot process image files. Please describe your question in text and I\'ll be happy to help!'), 600);
        return;
    }
    appendAIChat('user', msg);
    input.value = '';
    var response = getAIResponse(msg);
    setTimeout(() => appendAIChat('ai', response), 600);
}
function sendAIQuick(prompt) { var input = document.getElementById('ai-chat-input'); if(input) input.value = prompt; sendAIMessage(); }
function appendAIChat(who, text) {
    var container = document.getElementById('ai-chat-messages');
    if (!container) return;
    var div = document.createElement('div');
    div.className = 'ai-chat-msg ' + who;
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}
function getAIResponse(msg) {
    var lower = msg.toLowerCase();
    if (lower.includes('best') || lower.includes('recommend') || lower.includes('zone')) {
        var bestZone = null; var bestScore = -1;
        Object.values(zonesData).forEach(function(z) { if (z.status !== 'Active') return; var freeRatio = z.free / z.spots; var score = freeRatio * 0.7 + (1 / (z.rate + 0.01)) * 0.3; if (score > bestScore) { bestScore = score; bestZone = z; } });
        if (bestZone) return '💡 Based on current data, I recommend ' + bestZone.name + ' at ' + bestZone.location + '. It has ' + bestZone.free + ' free spots at ৳' + bestZone.rate.toFixed(2) + '/hr. That\'s the best value right now!';
        return Object.keys(zonesData).length === 0 ? 'No parking zones have been added yet.' : 'All zones are currently full. Please try again later.';
    }
    if (lower.includes('cost') || lower.includes('price') || lower.includes('rate') || lower.includes('estimate')) {
        var rates = Object.values(zonesData).map(function(z) { return z.name + ': ৳' + z.rate.toFixed(2) + '/hr'; }).join(' | ');
        return Object.keys(zonesData).length === 0 ? 'No parking zones available yet.' : '💰 Parking rates by zone: ' + rates + '. For metered booking, you only pay for the time used.';
    }
    if (lower.includes('tip') || lower.includes('advice') || lower.includes('help')) {
        return '📋 Pro tips: 1) Book in advance during peak hours (9AM-6PM). 2) Use metered booking for short stays. 3) Zone D is cheapest for open-air parking. 4) Always check occupancy before booking!';
    }
    if (lower.includes('status') || lower.includes('session') || lower.includes('active')) {
        var saved = getUserData('customerParkingData');
        var activeCount = saved && saved.sessions ? saved.sessions.filter(function(s) { return s.status === 'Active' && (s.paymentStatus || '') !== 'Rejected'; }).length : 0;
        var anomalies = [];
        try { anomalies = getCustomerAnomalies(); } catch (e) { anomalies = []; }
        var msg = '📊 You currently have ' + activeCount + ' active parking session(s).';
        if (anomalies.length > 0) {
            msg += ' ⚠️ ' + anomalies.length + ' anomaly/anomalies detected. Check "My Sessions" for details.';
        }
        return msg + ' Check "My Sessions" for live updates!';
    }
    if (lower.includes('anomaly') || lower.includes('alert') || lower.includes('warning') || lower.includes('issue') || lower.includes('problem')) {
        var anomalies = [];
        try { anomalies = getCustomerAnomalies(); } catch (e) { anomalies = []; }
        if (anomalies.length === 0) return '✅ No anomalies detected. Your parking is running smoothly!';
        var criticals = anomalies.filter(function(a) { return a.severity === 'critical'; });
        var warnings = anomalies.filter(function(a) { return a.severity === 'warning'; });
        var msg = '⚠️ Detected ' + anomalies.length + ' anomaly/anomalies: ';
        if (criticals.length > 0) msg += criticals.length + ' critical, ';
        if (warnings.length > 0) msg += warnings.length + ' warning. ';
        msg += 'Please check the alerts on your sessions page.';
        return msg;
    }
    if (lower.includes('end') || lower.includes('stop') || lower.includes('cancel')) {
        return 'To end a session, go to "My Sessions" and click the "End Session" button. Make sure to complete payment first if using metered booking.';
    }
    if (lower.includes('payment') || lower.includes('pay') || lower.includes('bKash') || lower.includes('nagad')) {
        return '💳 We accept bKash, Nagad, Rocket, Visa Card, and Cash. Admin receives payment at 01841156753. Always keep your TrxID safe for verification.';
    }
    if (lower.includes('revenue') || lower.includes('earning') || lower.includes('income') || lower.includes('today revenue') || lower.includes('revenue insights')) {
        const allPayments = JSON.parse(localStorage.getItem('smartParkPayments_by_user')) || {};
        let total = 0;
        let count = 0;
        const today = new Date().toISOString().split('T')[0];
        Object.values(allPayments).forEach(function(userPayments) {
            if (Array.isArray(userPayments)) {
                userPayments.forEach(function(p) {
                    const paymentDate = (p.createdAt || '').split('T')[0];
                    if (paymentDate === today && (p.status === 'Pending' || p.status === 'Paid' || p.status === 'Verified')) {
                        total += parseFloat(p.amount || 0);
                        count++;
                    }
                });
            }
        });
        var revenueEl = document.getElementById('stat-revenue');
        if (revenueEl) { revenueEl.textContent = 'BDT ' + total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
        return '📊 Today\'s revenue: BDT ' + total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' (' + count + ' payment' + (count !== 1 ? 's' : '') + '). Revenue updates automatically as customers pay.';
    }
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) return 'Hello! 👋 I\'m your SmartPark AI assistant. I can help you find parking, estimate costs, or answer questions. What would you like to know?';
    if (lower.includes('thank')) return 'You\'re welcome! 😊 Feel free to ask if you need anything else. Happy parking! 🚗';
    return 'I can help you with parking recommendations, cost estimates, session management, and payment questions. Try asking "Find the best parking zone" or "What are the parking rates?"';
}

// Expose for admin.js compatibility
function logout() { localStorage.removeItem('token_customer'); localStorage.removeItem('loggedInUser_customer'); localStorage.removeItem('token_admin'); localStorage.removeItem('loggedInUser_admin'); window.location.href = 'index.html'; }
function showToast(type, message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    let borderClass = 'border-sp-accent/30', iconClass = 'fa-solid fa-circle-info text-sp-accent';
    if (type === 'success') { borderClass = 'border-sp-emerald/30'; iconClass = 'fa-solid fa-circle-check text-sp-emerald'; }
    else if (type === 'error') { borderClass = 'border-sp-accent-red/30'; iconClass = 'fa-solid fa-circle-exclamation text-sp-accent-red'; }
    toast.className = `toast-enter flex items-center gap-3 p-4 rounded-xl border ${borderClass} bg-sp-card/95 shadow-2xl pointer-events-auto max-w-sm w-full`;
    toast.innerHTML = `<div class="flex-shrink-0 text-lg"><i class="${iconClass}"></i></div><div class="flex-grow"><p class="text-xs font-semibold text-slate-200">${message}</p></div><button class="text-slate-500 hover:text-white transition-colors" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark text-xs"></i></button>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.remove('toast-enter'); toast.classList.add('toast-exit'); setTimeout(() => { toast.remove(); }, 300); }, 4000);
}
