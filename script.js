// SmartPark - Interactive JavaScript
const API_BASE = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    // Check for remembered email
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
        const emailInput = document.getElementById('login-email');
        if (emailInput) {
            emailInput.value = rememberedEmail;
            document.getElementById('remember-me').checked = true;
        }
    }
});

async function fetchUserSessions() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('No token found, user not logged in.');
        return [];
    }

    try {
        const response = await fetch(`${API_BASE}/api/parking/my-sessions`, {
            method: 'GET',
            headers: {
                'x-auth-token': token,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            return data;
        } else {
            console.error('Error fetching user sessions:', data.msg);
            showToast('error', data.msg || 'Failed to fetch user sessions.');
            return [];
        }
    } catch (error) {
        console.error('Network error fetching user sessions:', error);
        showToast('error', 'Network error fetching user sessions.');
        return [];
    }
}

async function saveParkingSession(sessionData) {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('error', 'You must be logged in to reserve a spot.');
        return null;
    }

    try {
        const response = await fetch(`${API_BASE}/api/parking`, {
            method: 'POST',
            headers: {
                'x-auth-token': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sessionData)
        });
        const data = await response.json();
        if (response.ok) {
            showToast('success', `Spot ${sessionData.zone} reserved successfully!`);
            showToast('info', `📡 Sensors active: plate=${sessionData.plate || 'SIM-123'}, ultrasonic=object-detected, camera=vehicle-image-captured`);
            return data;
        } else {
            console.error('Error saving parking session:', data.msg);
            showToast('error', data.msg || 'Failed to reserve spot.');
            return null;
        }
    } catch (error) {
        console.error('Network error saving parking session:', error);
        showToast('error', 'Network error saving parking session.');
        return null;
    }
}

async function deleteParkingSession(sessionId) {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('error', 'You must be logged in to cancel a reservation.');
        return false;
    }

    try {
        const response = await fetch(`${API_BASE}/api/parking/${sessionId}`, {
            method: 'DELETE',
            headers: {
                'x-auth-token': token,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            showToast('info', 'Reservation cancelled successfully.');
            return true;
        } else {
            console.error('Error deleting parking session:', data.msg);
            showToast('error', data.msg || 'Failed to cancel reservation.');
            return false;
        }
    } catch (error) {
        console.error('Network error deleting parking session:', error);
        showToast('error', 'Network error cancelling reservation.');
        return false;
    }
}

// Utility functions for user-specific data in localStorage
function getLoggedInUser() {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const decodedPayload = JSON.parse(window.atob(base64));
        return { email: decodedPayload.user.email, role: decodedPayload.user.role, id: decodedPayload.user.id };
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
}

function getUserData(key, defaultValue = []) {
    const user = getLoggedInUser();
    if (!user) return defaultValue;
    const allData = JSON.parse(localStorage.getItem(key + '_by_user')) || {};
    return allData[user.email] || defaultValue;
}

function setUserData(key, data) {
    const user = getLoggedInUser();
    if (!user) return;
    let allData = JSON.parse(localStorage.getItem(key + '_by_user')) || {};
    allData[user.email] = data;
    localStorage.setItem(key + '_by_user', JSON.stringify(allData));
}

function getPaymentsForUser() {
    const user = getLoggedInUser();
    if (!user) return [];
    const allPayments = JSON.parse(localStorage.getItem('smartParkPayments_by_user')) || {};
    return allPayments[user.email] || [];
}

function savePaymentRecord(paymentRecord) {
    const user = getLoggedInUser();
    if (!user) return;
    let allPayments = JSON.parse(localStorage.getItem('smartParkPayments_by_user')) || {};
    if (!allPayments[user.email]) allPayments[user.email] = [];
    allPayments[user.email].push(paymentRecord);
    localStorage.setItem('smartParkPayments_by_user', JSON.stringify(allPayments));
}

function savePaymentToLedger(session, method) {
    savePaymentRecord({
        id: 'PAY-' + String(Date.now()).slice(-8),
        bookingId: session.id || session.bookingId,
        customerName: session.name || session.customerName || 'N/A',
        vehicle: session.vehicle || 'N/A',
        zone: session.zone || 'N/A',
        slot: session.slot || 'N/A',
        amount: session.cost || 0,
        paymentMethod: method,
        customerNumber: session.customerNumber || 'N/A',
        trxId: session.trxId || 'N/A',
        status: 'Pending',
        createdAt: new Date().toISOString()
    });
}

function savePaymentToAdmin(booking, customerNumber, trxId) {
    savePaymentRecord({
        id: 'PAY-' + String((getPaymentsForUser()).length + 1).padStart(4, '0'),
        bookingId: booking.id,
        customerName: booking.name,
        vehicle: booking.vehicle,
        zone: booking.zone,
        slot: booking.slot,
        amount: booking.cost,
        paymentMethod: booking.payment,
        customerNumber: customerNumber,
        trxId: trxId,
        date: booking.date,
        time: booking.entryTime,
        status: 'Pending',
        adminVerified: false,
        createdAt: new Date().toISOString()
    });
}

function clearUserData() {
    const user = getLoggedInUser();
    if (!user) return;
    ['customerParkingData_by_user', 'userHistory_by_user', 'smartParkPayments_by_user'].forEach(function(storageKey) {
        let allData = JSON.parse(localStorage.getItem(storageKey)) || {};
        delete allData[user.email];
        localStorage.setItem(storageKey, JSON.stringify(allData));
    });
}

// fetchUserSessions and saveParkingSession are defined above with full error handling and token headers.
// The duplicate definitions below have been removed to prevent overwriting the primary implementations.


function getUserHistory() {
    return getUserData('userHistory', []);
}

function saveUserHistory(history) {
    saveUserData('userHistory', history);
}

const zonesData = {
    'Zone-A': { id: 'Zone-A', name: 'Zone A', location: 'Ground Floor, Main Building', spots: 50, occupied: 27, free: 23, rate: 3.50, type: 'Covered', status: 'Active', lat: 23.79400, lng: 90.40400 },
    'Zone-B': { id: 'Zone-B', name: 'Zone B', location: 'Rooftop Level 5', spots: 80, occupied: 45, free: 35, rate: 2.00, type: 'Rooftop', status: 'Active', lat: 23.81500, lng: 90.40100 },
    'Zone-C': { id: 'Zone-C', name: 'Zone C', location: 'Underground Parking, B1', spots: 120, occupied: 98, free: 22, rate: 5.00, type: 'Underground', status: 'Active', lat: 23.80700, lng: 90.40600 },
    'Zone-D': { id: 'Zone-D', name: 'Zone D', location: 'Open Lot, East Wing', spots: 30, occupied: 12, free: 18, rate: 1.50, type: 'Open Air', status: 'Active', lat: 23.81200, lng: 90.41500 },
    'Zone-E': { id: 'Zone-E', name: 'Zone E', location: 'West Annex', spots: 40, occupied: 0, free: 40, rate: 2.50, type: 'Covered', status: 'Maintenance', lat: 23.80100, lng: 90.39500 }
};

function getZonePrefix(zoneName) {
    return zoneName.replace('Zone ', '');
}

function initZoneSlots(zoneSlots) {
    Object.keys(zonesData).forEach(function(key) {
        var z = zonesData[key];
        if (!zoneSlots[key]) {
            zoneSlots[key] = new Array(z.spots).fill(false);
        }
    });
}

function syncZoneOccupancy(sessions) {
    Object.values(zonesData).forEach(function(z) { z.occupied = 0; });
    sessions.forEach(function(s) {
        if (s.status === 'Active') {
            var zone = Object.values(zonesData).find(function(z) { return z.name === s.zone; });
            if (zone) zone.occupied = (zone.occupied || 0) + 1;
        }
    });
    Object.values(zonesData).forEach(function(z) {
        z.free = Math.max(0, z.spots - z.occupied);
    });
}

function saveData(sessions, history, nextBookingId, nextHistoryId, zoneSlots) {
    setUserData('customerParkingData', {
        sessions: sessions,
        history: history,
        nextId: nextBookingId,
        nextHistId: nextHistoryId,
        zoneSlots: zoneSlots
    });
}

function loadParkingData() {
    var sessions = [];
    var history = [];
    var nextBookingId = 1000;
    var nextHistoryId = 2000;
    var zoneSlots = {};
    try {
        var saved = getUserData('customerParkingData');
        if (saved) {
            sessions = saved.sessions || [];
            history = saved.history || [];
            nextBookingId = saved.nextId || 1000;
            nextHistoryId = saved.nextHistId || 2000;
            zoneSlots = saved.zoneSlots || {};
            if (Object.keys(zoneSlots).length === 0) {
                initZoneSlots(zoneSlots);
            }
            syncZoneOccupancy(sessions);
        } else {
            initZoneSlots(zoneSlots);
        }
    } catch(e) {}
    return { sessions: sessions, history: history, nextBookingId: nextBookingId, nextHistoryId: nextHistoryId, zoneSlots: zoneSlots };
}

function formatTime(totalSeconds) {
    var h = Math.floor(totalSeconds / 3600);
    var m = Math.floor((totalSeconds % 3600) / 60);
    var s = totalSeconds % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function formatTimeAMPM(timeStr) {
    if (!timeStr || timeStr === '-') return '-';
    var parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    var h = parseInt(parts[0], 10);
    var m = parts[1];
    var ampm = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h = h - 12;
    if (h === 0) h = 12;
    return h + ':' + m + ' ' + ampm;
}

function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function safe(str) { return escHtml(str); }

function savePaymentForUser(paymentRecord) {
    const user = getLoggedInUser();
    if (!user) return;
    let allPayments = JSON.parse(localStorage.getItem('smartParkPayments_by_user')) || {};
    if (!allPayments[user.email]) allPayments[user.email] = [];
    allPayments[user.email].push(paymentRecord);
    localStorage.setItem('smartParkPayments_by_user', JSON.stringify(allPayments));
}

function getPaymentsForUser() {
    const user = getLoggedInUser();
    if (!user) return [];
    const allPayments = JSON.parse(localStorage.getItem('smartParkPayments_by_user')) || {};
    return allPayments[user.email] || [];
}

// Role Switching Logic
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
    const submitBg = document.getElementById('login-submit-bg');

    if (role === 'customer') {
        currentRole = 'customer';
        
        // Update buttons
        customerBtn.className = "flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/10";
        adminBtn.className = "flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all duration-300 text-slate-400 hover:text-slate-200";
        
        // Update text
        welcomeTitle.textContent = "Welcome Back!";
        welcomeDesc.textContent = "Enter your credentials to access your parking dashboard.";
        
        // Hide Admin Key
        adminKeyContainer.classList.add('hidden', 'opacity-0', 'max-h-0');
        adminKeyContainer.classList.remove('opacity-100', 'max-h-20');
        adminKeyInput.removeAttribute('required');
        adminKeyInput.value = '';
        
        // Update Submit Button
        submitBtn.className = "w-full bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-300 flex items-center justify-center gap-2 group relative overflow-hidden";
        submitText.innerHTML = `
            <i class="fa-solid fa-right-to-bracket group-hover:translate-x-1 transition-transform"></i>
            Secure Sign In
        `;
        submitBg.className = "absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500";
    } else {
        currentRole = 'admin';
        
        // Update buttons
        adminBtn.className = "flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all duration-300 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-500/10";
        customerBtn.className = "flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all duration-300 text-slate-400 hover:text-slate-200";
        
        // Update text
        welcomeTitle.textContent = "Admin Control Panel";
        welcomeDesc.textContent = "Enter your administrator credentials to access the management console.";
        
        // Show Admin Key
        adminKeyContainer.classList.remove('hidden', 'opacity-0', 'max-h-0');
        adminKeyContainer.classList.add('opacity-100', 'max-h-20');
        adminKeyInput.setAttribute('required', 'true');
        
        // Update Submit Button
        submitBtn.className = "w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-300 flex items-center justify-center gap-2 group relative overflow-hidden";
        submitText.innerHTML = `
            <i class="fa-solid fa-shield-halved group-hover:scale-110 transition-transform"></i>
            Secure Admin Sign In
        `;
        submitBg.className = "absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500";
    }
}

// Tab Switching Logic
function switchTab(tab) {
    const loginTab = document.getElementById('tab-login');
    const registerTab = document.getElementById('tab-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (tab === 'login') {
        // Update Tab Buttons
        loginTab.className = "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20";
        registerTab.className = "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 text-slate-400 hover:text-slate-200";
        
        // Animate Forms
        registerForm.classList.add('opacity-0', 'translate-x-8');
        setTimeout(() => {
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            setTimeout(() => {
                loginForm.classList.remove('opacity-0', '-translate-x-8');
            }, 50);
        }, 300);
    } else {
        // Update Tab Buttons
        registerTab.className = "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-500/20";
        loginTab.className = "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 text-slate-400 hover:text-slate-200";
        
        // Animate Forms
        loginForm.classList.add('opacity-0', '-translate-x-8');
        setTimeout(() => {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
            setTimeout(() => {
                registerForm.classList.remove('opacity-0', 'translate-x-8');
            }, 50);
        }, 300);
    }
}

// Password Visibility Toggle
function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Interactive Parking Grid Simulation
let freeSpotsCount = 3; // This should ideally be fetched from the backend

async function toggleSlot(element, slotId) {
    const statusSpan = element.querySelector('.slot-status');
    const icon = element.querySelector('i');
    const user = getLoggedInUser();

    if (!user) {
        showToast('error', 'Please log in to reserve or cancel spots.');
        return;
    }

    if (element.classList.contains('available')) {
        // Parse zone and spot from slotId (e.g. "A-02" -> zone="Zone A", spot="A-02", slotIndex=1)
        const parts = slotId.split('-');
        const spotNumber = parts.length > 1 ? parts[1] : '01';
        const zonePrefix = parts[0];
        const zoneName = 'Zone ' + zonePrefix;
        const slotIndex = parseInt(spotNumber, 10) - 1;
        
        // Simulate reserving the spot
        const sessionData = {
            plateNumber: 'SIM-123',
            zone: zoneName,
            spot: slotId,
            slotIndex: slotIndex,
            startTime: new Date(),
            cost: 0
        };
        const newSession = await saveParkingSession(sessionData);
        if (newSession) {
            element.classList.remove('available', 'border-emerald-500/30', 'bg-emerald-500/5', 'hover:bg-emerald-500/10');
            element.classList.add('reserved');
            statusSpan.textContent = 'RESERVED';
            statusSpan.className = 'text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 slot-status';
            icon.className = 'fa-solid fa-circle-check text-blue-500 text-2xl my-1';
            element.dataset.sessionId = newSession._id;
            
            freeSpotsCount--;
        }
    } else if (element.classList.contains('reserved')) {
        const sessionId = element.dataset.sessionId;
        if (!sessionId) {
            showToast('error', 'No session ID found for this reservation.');
            return;
        }
        const success = await deleteParkingSession(sessionId);
        if (success) {
            element.classList.remove('reserved');
            element.classList.add('available', 'border-emerald-500/30', 'bg-emerald-500/5', 'hover:bg-emerald-500/10');
            statusSpan.textContent = 'FREE';
            statusSpan.className = 'text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 slot-status';
            icon.className = 'fa-solid fa-square-p text-emerald-500 text-2xl my-1';
            delete element.dataset.sessionId;
            
            freeSpotsCount++;
        }
    }

    // Update Counter UI
    const counter = document.getElementById('available-counter');
    counter.textContent = `${freeSpotsCount}/6 Spots Free`;
    
    if (freeSpotsCount === 0) {
        counter.className = "text-xs bg-red-500/10 text-red-400 px-2.5 py-1 rounded-full border border-red-500/20 font-medium";
    } else {
        counter.className = "text-xs bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full border border-blue-500/20 font-medium";
    }
}
// Modal Controls
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    const card = modal.querySelector('.bg-slate-900');
    modal.classList.remove('opacity-0', 'pointer-events-none');
    card.classList.remove('scale-95');
    card.classList.add('scale-100');
}

// Close Modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const card = modal.querySelector('.bg-slate-900');
    card.classList.remove('scale-100');
    card.classList.add('scale-95');
    modal.classList.add('opacity-0', 'pointer-events-none');
}

// Form Submissions
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    const submitBtn = document.getElementById('login-submit-btn');
    const originalContent = submitBtn.innerHTML;

    if (rememberMe && currentRole === 'customer') {
        localStorage.setItem('rememberedEmail', email);
    } else {
        localStorage.removeItem('rememberedEmail');
    }

    submitBtn.disabled = true;

    // Determine the role to send to the backend
    const roleToSend = currentRole;

    submitBtn.innerHTML = `
        <i class="fa-solid fa-circle-notch animate-spin mr-2"></i>
        ${currentRole === 'admin' ? 'Verifying admin credentials...' : 'Securing your spot...'}
    `;

    const requestBody = {
        email,
        password,
        role: roleToSend
    };

    if (roleToSend === 'admin') {
        const adminKeyInput = document.getElementById('login-admin-key');
        if (adminKeyInput && adminKeyInput.value.trim()) {
            requestBody.adminKey = adminKeyInput.value.trim();
        }
    }

    try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('token', data.token); // Store the JWT token
            localStorage.setItem('loggedInUser', JSON.stringify({ email, role: roleToSend })); // Store basic user info (without sensitive data)
            showToast('success', 'Login successful! Redirecting to dashboard...');
            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalContent;
                if (roleToSend === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'book-parking.html';
                }
            }, 1500);
        } else {
            showToast('error', data.msg || 'Login failed.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalContent;
        }
    } catch (err) {
        console.error(err);
        showToast('error', 'Server error during login.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalContent;
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('reg-name').value; // Name is not used in backend, but kept for consistency
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalContent = submitBtn.innerHTML;

    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <i class="fa-solid fa-circle-notch animate-spin mr-2"></i>
        Creating account...
    `;

    try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, role: 'user' }), // Default role to 'user'
        });

        const data = await res.json();

        if (res.ok) {
            showToast('success', `Welcome, ${name}! Account created successfully.`);
            // Optionally, log in the user directly after registration
            // localStorage.setItem('token', data.token); // Store token if auto-logging in
            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalContent;
                switchTab('login');
                document.getElementById('login-email').value = email;
                event.target.reset();
            }, 1500);
        } else {
            showToast('error', data.msg || 'Registration failed.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalContent;
        }
    } catch (err) {
        console.error(err);
        showToast('error', 'Server error during registration.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalContent;
    }
}

function handleForgotPassword(event) {
    event.preventDefault();
    const email = document.getElementById('forgot-email').value;
    
    closeModal('forgot-modal');
    showToast('success', `Password reset link sent to ${email}`);
    event.target.reset();
}

// Social Login Simulation
function socialLogin(provider) {
    showToast('info', `Connecting with ${provider}...`);
    setTimeout(() => {
        showToast('success', `Successfully authenticated with ${provider}!`);
    }, 1200);
}

// Toast Notification System
function showToast(type, message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    // Set styles based on type
    let bgClass, borderClass, iconClass, textClass;
    if (type === 'success') {
        bgClass = 'bg-slate-900/95';
        borderClass = 'border-emerald-500/30';
        iconClass = 'fa-solid fa-circle-check text-emerald-400';
        textClass = 'text-emerald-400';
    } else if (type === 'error') {
        bgClass = 'bg-slate-900/95';
        borderClass = 'border-red-500/30';
        iconClass = 'fa-solid fa-circle-exclamation text-red-400';
        textClass = 'text-red-400';
    } else {
        bgClass = 'bg-slate-900/95';
        borderClass = 'border-blue-500/30';
        iconClass = 'fa-solid fa-circle-info text-blue-400';
        textClass = 'text-blue-400';
    }

    toast.className = `toast-enter flex items-center gap-3 p-4 rounded-xl border ${borderClass} ${bgClass} shadow-2xl pointer-events-auto max-w-sm w-full`;
    toast.innerHTML = `
        <div class="flex-shrink-0 text-lg">
            <i class="${iconClass}"></i>
        </div>
        <div class="flex-grow">
            <p class="text-xs font-semibold text-slate-200">${message}</p>
        </div>
        <button class="text-slate-500 hover:text-slate-300 transition-colors" onclick="this.parentElement.remove()">
            <i class="fa-solid fa-xmark text-xs"></i>
        </button>
    `;

    container.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-exit');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}
