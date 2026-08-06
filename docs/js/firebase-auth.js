// SmartPark - Firebase Authentication Module (Compat SDK)
// Handles: Email/Password auth, Forgot Password, Google Sign-In, TOTP 2FA

(function() {
    'use strict';

    var spFirebase = window.spFirebase || {};
    window.spFirebase = spFirebase;

    var firebaseApp = null;
    var auth = null;
    var firebaseReady = false;
    var _pendingTOTPUser = null;

    function getTotpKey(email) { return 'smartpark_totp_' + (email || '').toLowerCase(); }
    function getTotpSecret(email) {
        try { return localStorage.getItem(getTotpKey(email)); } catch (e) { return null; }
    }
    function setTotpSecret(email, secret) {
        try { localStorage.setItem(getTotpKey(email), secret); } catch (e) {}
    }
    function removeTotpSecret(email) {
        try { localStorage.removeItem(getTotpKey(email)); } catch (e) {}
    }
    function isTotpEnrolled(email) { return !!getTotpSecret(email); }

    spFirebase.init = function() {
        if (firebaseReady) return;
        if (!window.env || !window.env.FIREBASE_CONFIG || !window.env.FIREBASE_CONFIG.apiKey || window.env.FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY') {
            console.warn('Firebase not configured with a real API key. Skipping Firebase init.');
            return;
        }
        try {
            if (typeof firebase !== 'undefined') {
                firebaseApp = firebase.initializeApp(window.env.FIREBASE_CONFIG);
                auth = firebase.auth();
                firebaseReady = true;
                console.log('Firebase Auth initialized');
            }
        } catch (err) {
            console.error('Firebase init error:', err);
        }
    };

    spFirebase.isReady = function() { return firebaseReady && auth !== null; };
    spFirebase.getAuth = function() { return auth; };
    spFirebase.getPendingTOTPUser = function() { return _pendingTOTPUser; };
    spFirebase.setPendingTOTPUser = function(user) { _pendingTOTPUser = user; };

    spFirebase.sendPasswordResetEmail = async function(email) {
        if (!spFirebase.isReady()) throw new Error('Firebase not configured');
        await auth.sendPasswordResetEmail(email);
        return { success: true, message: 'Password reset link sent to ' + email };
    };

    spFirebase.signInWithEmailAndPassword = async function(email, password) {
        if (!spFirebase.isReady()) throw new Error('Firebase not configured');
        try {
            var userCredential = await auth.signInWithEmailAndPassword(email, password);
            var enrolled = isTotpEnrolled(email);
            return { requiresTOTP: enrolled, user: userCredential.user, email: email };
        } catch (error) {
            throw error;
        }
    };

    spFirebase.signInWithGoogle = async function() {
        if (!spFirebase.isReady()) throw new Error('Firebase not configured');
        var provider = new firebase.auth.GoogleAuthProvider();
        var result = await auth.signInWithPopup(provider);
        var user = result.user;
        var email = (user.email || '').toLowerCase();
        var enrolled = isTotpEnrolled(email);
        return { requiresTOTP: enrolled, user: user, email: email };
    };

    spFirebase.verifyTOTP = async function(email, code) {
        if (!spFirebase.isReady()) throw new Error('Firebase not configured');
        var secret = getTotpSecret(email);
        if (!secret) throw new Error('No TOTP secret found for this user.');
        var valid = await TOTP.verifyTotp(secret, code, 30, 1);
        if (!valid) throw new Error('Invalid verification code.');
        return true;
    };

    spFirebase.generateTOTPSecret = function(email) {
        if (!spFirebase.isReady()) throw new Error('Firebase not configured');
        var secret = TOTP.generateSecret();
        setTotpSecret(email, secret);
        return secret;
    };

    spFirebase.getTOTPSecret = function(email) { return getTotpSecret(email); };

    spFirebase.removeTOTPSecret = function(email) { removeTotpSecret(email); };

    spFirebase.isTOTPEnrolled = function(email) { return isTotpEnrolled(email); };

    spFirebase.onAuthStateChanged = function(callback) {
        if (!spFirebase.isReady()) return function() {};
        return auth.onAuthStateChanged(callback);
    };

    spFirebase.signOut = function() {
        if (!spFirebase.isReady()) return Promise.resolve();
        return auth.signOut();
    };

    spFirebase.getIdToken = async function() {
        if (!spFirebase.isReady()) return null;
        var user = auth.currentUser;
        if (!user) return null;
        return await user.getIdToken();
    };

})();
