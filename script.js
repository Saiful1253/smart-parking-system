// SmartPark - Interactive JavaScript

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
let freeSpotsCount = 3;

function toggleSlot(element, slotId) {
    const statusSpan = element.querySelector('.slot-status');
    const icon = element.querySelector('i');

    if (element.classList.contains('available')) {
        // Reserve the spot
        element.classList.remove('available', 'border-emerald-500/30', 'bg-emerald-500/5', 'hover:bg-emerald-500/10');
        element.classList.add('reserved');
        statusSpan.textContent = 'RESERVED';
        statusSpan.className = 'text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 slot-status';
        icon.className = 'fa-solid fa-circle-check text-blue-500 text-2xl my-1';
        
        freeSpotsCount--;
        showToast('success', `Spot ${slotId} reserved successfully!`);
    } else if (element.classList.contains('reserved')) {
        // Cancel reservation
        element.classList.remove('reserved');
        element.classList.add('available', 'border-emerald-500/30', 'bg-emerald-500/5', 'hover:bg-emerald-500/10');
        statusSpan.textContent = 'FREE';
        statusSpan.className = 'text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 slot-status';
        icon.className = 'fa-solid fa-square-p text-emerald-500 text-2xl my-1';
        
        freeSpotsCount++;
        showToast('info', `Reservation for ${slotId} cancelled.`);
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
function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const rememberMe = document.getElementById('remember-me').checked;
    const submitBtn = document.getElementById('login-submit-btn');
    const originalContent = submitBtn.innerHTML;

    // Save or clear remembered email
    if (rememberMe && currentRole === 'customer') {
        localStorage.setItem('rememberedEmail', email);
    } else {
        localStorage.removeItem('rememberedEmail');
    }

    // Show Loading State
    submitBtn.disabled = true;
    
    if (currentRole === 'admin') {
        const adminKey = document.getElementById('login-admin-key').value;
        submitBtn.innerHTML = `
            <i class="fa-solid fa-circle-notch animate-spin mr-2"></i>
            Verifying admin credentials...
        `;

        setTimeout(() => {
            if (adminKey === 'admin123') { // Simple simulation key
                showToast('success', 'Admin authentication successful! Redirecting to Control Panel...');
                setTimeout(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalContent;
                    window.location.href = 'admin.html';
                }, 1500);
            } else {
                showToast('error', 'Invalid Admin Security Key! (Try "admin123" for simulation)');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalContent;
            }
        }, 1500);
    } else {
        submitBtn.innerHTML = `
            <i class="fa-solid fa-circle-notch animate-spin mr-2"></i>
            Securing your spot...
        `;

        setTimeout(() => {
            showToast('success', 'Login successful! Redirecting to dashboard...');
            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalContent;
                window.location.href = 'book-parking.html';
            }, 1500);
        }, 1500);
    }
}

function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('reg-name').value;
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalContent = submitBtn.innerHTML;

    // Show Loading State
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <i class="fa-solid fa-circle-notch animate-spin mr-2"></i>
        Creating account...
    `;

    setTimeout(() => {
        showToast('success', `Welcome, ${name}! Account created successfully.`);
        setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalContent;
            // Switch to login tab
            switchTab('login');
            // Pre-fill email
            document.getElementById('login-email').value = document.getElementById('reg-email').value;
            // Clear register form
            event.target.reset();
        }, 1500);
    }, 1500);
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
