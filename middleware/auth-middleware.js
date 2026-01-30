const authService = require('../auth');

/**
 * Authentication middleware - Verifies JWT token
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authService.extractToken(authHeader);

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. No token provided.'
        });
    }

    const decoded = authService.verifyToken(token);
    if (!decoded) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token.'
        });
    }

    // Attach user info to request
    req.user = decoded;
    next();
};

/**
 * Role-based authorization middleware
 * @param {string[]} allowedRoles - Array of allowed roles
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }

        next();
    };
};

/**
 * Permission checker middleware
 * @param {string} permission - Required permission
 */
const checkPermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        const rolePermissions = {
            admin: ['*'], // Admin has all permissions
            manager: [
                'view_dashboard',
                'view_resources',
                'create_resources',
                'edit_resources',
                'view_projects',
                'create_projects',
                'edit_projects',
                'allocate_resources',
                'view_analytics',
                'export_reports'
            ],
            resource: [
                'view_dashboard',
                'view_own_profile',
                'edit_own_profile',
                'view_own_allocations'
            ],
            viewer: [
                'view_dashboard',
                'view_resources',
                'view_projects',
                'view_analytics'
            ]
        };

        const userPermissions = rolePermissions[req.user.role] || [];

        if (userPermissions.includes('*') || userPermissions.includes(permission)) {
            next();
        } else {
            return res.status(403).json({
                success: false,
                message: `Permission denied. Required permission: ${permission}`
            });
        }
    };
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authService.extractToken(authHeader);

    if (token) {
        const decoded = authService.verifyToken(token);
        if (decoded) {
            req.user = decoded;
        }
    }

    next();
};

module.exports = {
    authenticate,
    authorize,
    checkPermission,
    optionalAuth
};
