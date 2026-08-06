// SmartPark - TOTP 2FA Utilities
// Uses Web Crypto API (no external libraries needed)

var TOTP = (function() {
    'use strict';

    var BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    function base32Encode(buffer) {
        var bytes = new Uint8Array(buffer);
        var bits = '';
        for (var i = 0; i < bytes.length; i++) {
            bits += bytes[i].toString(2).padStart(8, '0');
        }
        var result = '';
        for (var j = 0; j < bits.length; j += 5) {
            var chunk = bits.substring(j, j + 5);
            if (chunk.length < 5) chunk = chunk.padEnd(5, '0');
            result += BASE32_ALPHABET[parseInt(chunk, 2)];
        }
        return result;
    }

    function base32Decode(str) {
        str = str.replace(/=+$/, '').toUpperCase();
        var bits = '';
        for (var i = 0; i < str.length; i++) {
            var idx = BASE32_ALPHABET.indexOf(str[i]);
            if (idx === -1) throw new Error('Invalid base32 character');
            bits += idx.toString(2).padStart(5, '0');
        }
        var bytes = [];
        for (var j = 0; j < bits.length; j += 8) {
            var byteBits = bits.substring(j, j + 8);
            if (byteBits.length === 8) {
                bytes.push(parseInt(byteBits, 2));
            }
        }
        return new Uint8Array(bytes);
    }

    function hmacSha1(key, message) {
        return crypto.subtle.importKey(
            'raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
        ).then(function(cryptoKey) {
            return crypto.subtle.sign('HMAC', cryptoKey, message);
        });
    }

    function generateSecret() {
        var bytes = new Uint8Array(20);
        crypto.getRandomValues(bytes);
        return base32Encode(bytes.buffer);
    }

    function getTotpCode(secret, timeStep, timestamp) {
        timestamp = timestamp || Date.now();
        var counter = Math.floor(timestamp / 1000 / timeStep);
        var counterBytes = new Uint8Array(8);
        for (var i = 7; i >= 0; i--) {
            counterBytes[i] = counter & 0xff;
            counter = Math.floor(counter / 256);
        }
        return base32Decode(secret).then(function(keyBytes) {
            return hmacSha1(keyBytes, counterBytes).then(function(sig) {
                var hmac = new Uint8Array(sig);
                var offset = hmac[hmac.length - 1] & 0x0f;
                var binary =
                    ((hmac[offset] & 0x7f) << 24) |
                    ((hmac[offset + 1] & 0xff) << 16) |
                    ((hmac[offset + 2] & 0xff) << 8) |
                    (hmac[offset + 3] & 0xff);
                var otp = (binary % 1000000).toString().padStart(6, '0');
                return otp;
            });
        });
    }

    function verifyTotp(secret, code, timeStep, window) {
        timeStep = timeStep || 30;
        window = window || 1;
        return new Promise(function(resolve, reject) {
            var timestamp = Date.now();
            var checks = [];
            for (var w = -window; w <= window; w++) {
                var t = timestamp + w * timeStep * 1000;
                checks.push(getTotpCode(secret, timeStep, t));
            }
            Promise.all(checks).then(function(codes) {
                for (var i = 0; i < codes.length; i++) {
                    if (codes[i] === code) {
                        resolve(true);
                        return;
                    }
                }
                resolve(false);
            }).catch(function(err) {
                reject(err);
            });
        });
    }

    function getOtpAuthUrl(email, secret) {
        return 'otpauth://totp/SmartPark:' + encodeURIComponent(email) + '?secret=' + secret + '&issuer=SmartPark';
    }

    return {
        generateSecret: generateSecret,
        getTotpCode: getTotpCode,
        verifyTotp: verifyTotp,
        getOtpAuthUrl: getOtpAuthUrl,
        base32Decode: base32Decode
    };
})();
