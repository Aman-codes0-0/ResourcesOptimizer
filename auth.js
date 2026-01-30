const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

class AuthService {
    /**
     * Hash a password using bcrypt
     * @param {string} password - Plain text password
     * @returns {Promise<string>} Hashed password
     */
    async hashPassword(password) {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(password, salt);
    }

    /**
     * Compare password with hash
     * @param {string} password - Plain text password
     * @param {string} hash - Hashed password
     * @returns {Promise<boolean>} True if password matches
     */
    async comparePassword(password, hash) {
        return bcrypt.compare(password, hash);
    }

    /**
     * Generate JWT token
     * @param {object} payload - Data to encode in token
     * @returns {string} JWT token
     */
    generateToken(payload) {
        return jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN
        });
    }

    /**
     * Verify JWT token
     * @param {string} token - JWT token to verify
     * @returns {object|null} Decoded payload or null if invalid
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            console.error('Token verification failed:', error.message);
            return null;
        }
    }

    /**
     * Generate refresh token (longer expiry)
     * @param {object} payload - Data to encode in token
     * @returns {string} Refresh token
     */
    generateRefreshToken(payload) {
        return jwt.sign(payload, JWT_SECRET, {
            expiresIn: '30d'
        });
    }

    /**
     * Extract token from Authorization header
     * @param {string} authHeader - Authorization header value
     * @returns {string|null} Token or null
     */
    extractToken(authHeader) {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.substring(7);
    }

    /**
     * Generate password reset token
     * @param {number} userId - User ID
     * @returns {string} Reset token
     */
    generateResetToken(userId) {
        return jwt.sign({ userId, type: 'reset' }, JWT_SECRET, {
            expiresIn: '1h'
        });
    }

    /**
     * Verify password reset token
     * @param {string} token - Reset token
     * @returns {object|null} Decoded payload or null
     */
    verifyResetToken(token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded.type === 'reset') {
                return decoded;
            }
            return null;
        } catch (error) {
            return null;
        }
    }
}

module.exports = new AuthService();
