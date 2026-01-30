const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const { CronJob } = require('cron');

const ResourceDatabase = require('./database');
const RuleEngine = require('./rule-engine');
const AllocationOptimizer = require('./allocation-optimizer');
const authService = require('./auth');
const { authenticate, authorize, checkPermission } = require('./middleware/auth-middleware');
const notificationService = require('./services/notification-service');
const AlertEngine = require('./services/alert-engine');

// New Services
const RecommendationEngine = require('./ai/recommendation-engine');
const ExportService = require('./services/export-service');
const WorkflowEngine = require('./services/workflow-engine');
const CostAnalyzer = require('./services/cost-analyzer');
const IntegrationHub = require('./integrations/integration-hub');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize database and engines
let db, ruleEngine, optimizer, alertEngine, recommendationEngine, exportService, workflowEngine, costAnalyzer, integrationHub;

async function initializeServer() {
    db = new ResourceDatabase();
    await db.initialize();

    // Core Engines
    ruleEngine = new RuleEngine(db);
    optimizer = new AllocationOptimizer(db, ruleEngine);
    alertEngine = new AlertEngine(db);

    // Feature Services
    recommendationEngine = new RecommendationEngine(db);
    exportService = new ExportService(db);
    workflowEngine = new WorkflowEngine(db);
    costAnalyzer = new CostAnalyzer(db);
    integrationHub = new IntegrationHub();

    // Schedule alert checks every hour
    const alertJob = new CronJob('0 * * * *', async () => {
        console.log('Running scheduled alert checks...');
        await alertEngine.runAllChecks();
    });
    alertJob.start();

    // Initial Training
    try {
        console.log('Initializing AI models...');
        await recommendationEngine.train();
    } catch (e) { console.error('AI Init warning:', e.message); }

    console.log('Database and all services initialized successfully');
    console.log('Alert engine scheduled (runs hourly)');
}

// WebSocket connection handling
const clients = new Set();

wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Client connected. Total clients:', clients.size);

    ws.on('close', () => {
        clients.delete(ws);
        console.log('Client disconnected. Total clients:', clients.size);
    });
});

// Broadcast updates to all connected clients
function broadcastUpdate(type, data) {
    const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// ============= AUTHENTICATION ENDPOINTS =============

// User registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password, full_name, role } = req.body;

        // Check if user already exists
        if (db.getUserByUsername(username)) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        if (db.getUserByEmail(email)) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Hash password
        const password_hash = await authService.hashPassword(password);

        // Create user
        const user = {
            id: uuidv4(),
            username,
            email,
            password_hash,
            full_name,
            role: role || 'viewer',
            is_active: 1
        };

        db.createUser(user);

        // Generate token
        const token = authService.generateToken({ userId: user.id, role: user.role });
        const refreshToken = authService.generateRefreshToken({ userId: user.id });

        // Create audit log
        db.createAuditLog({
            user_id: user.id,
            action: 'user_registered',
            entity_type: 'user',
            entity_id: user.id
        });

        // Remove password hash from response
        delete user.password_hash;

        res.status(201).json({ user, token, refreshToken });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// User login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user
        const user = db.getUserByUsername(username) || db.getUserByEmail(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({ error: 'Account is disabled' });
        }

        // Verify password
        const isValid = await authService.comparePassword(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate tokens
        const token = authService.generateToken({ userId: user.id, role: user.role });
        const refreshToken = authService.generateRefreshToken({ userId: user.id });

        // Update last login
        db.updateUserLastLogin(user.id);

        // Create audit log
        db.createAuditLog({
            user_id: user.id,
            action: 'user_login',
            entity_type: 'user',
            entity_id: user.id,
            ip_address: req.ip
        });

        // Remove password hash from response
        delete user.password_hash;

        res.json({ user, token, refreshToken });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current user
app.get('/api/auth/me', authenticate, (req, res) => {
    try {
        const user = db.getUserById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        delete user.password_hash;
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Refresh token
app.post('/api/auth/refresh', (req, res) => {
    try {
        const { refreshToken } = req.body;
        const decoded = authService.verifyToken(refreshToken);

        if (!decoded) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        const newToken = authService.generateToken({ userId: decoded.userId, role: decoded.role });
        res.json({ token: newToken });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Forgot password
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = db.getUserByEmail(email);

        if (!user) {
            // Don't reveal if email exists
            return res.json({ message: 'If email exists, reset link has been sent' });
        }

        const resetToken = authService.generateResetToken(user.id);

        // Send reset email
        await notificationService.sendPasswordResetEmail(user, resetToken);

        res.json({ message: 'If email exists, reset link has been sent' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reset password
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const decoded = authService.verifyToken(token);

        if (!decoded) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const password_hash = await authService.hashPassword(newPassword);
        db.updateUser(decoded.userId, { password_hash });

        // Create audit log
        db.createAuditLog({
            user_id: decoded.userId,
            action: 'password_reset',
            entity_type: 'user',
            entity_id: decoded.userId
        });

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Logout (client-side token removal, but log it)
app.post('/api/auth/logout', authenticate, (req, res) => {
    try {
        db.createAuditLog({
            user_id: req.user.userId,
            action: 'user_logout',
            entity_type: 'user',
            entity_id: req.user.userId
        });
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= USER MANAGEMENT ENDPOINTS (Admin only) =============

// Get all users
app.get('/api/users', authenticate, authorize('admin', 'manager'), (req, res) => {
    try {
        const users = db.getAllUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user by ID
app.get('/api/users/:id', authenticate, (req, res) => {
    try {
        // Users can view their own profile, admins/managers can view any
        if (req.user.userId !== req.params.id && !['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const user = db.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create user (Admin only)
app.post('/api/users', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { username, email, password, full_name, role } = req.body;

        if (db.getUserByUsername(username)) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        if (db.getUserByEmail(email)) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const password_hash = await authService.hashPassword(password);
        const user = {
            id: uuidv4(),
            username,
            email,
            password_hash,
            full_name,
            role: role || 'viewer',
            is_active: 1
        };

        db.createUser(user);

        // Send welcome email
        await notificationService.sendWelcomeEmail(user, password);

        // Create audit log
        db.createAuditLog({
            user_id: req.user.userId,
            action: 'user_created',
            entity_type: 'user',
            entity_id: user.id
        });

        delete user.password_hash;
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user
app.put('/api/users/:id', authenticate, async (req, res) => {
    try {
        // Users can update their own profile, admins can update any
        if (req.user.userId !== req.params.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const updates = { ...req.body };

        // Hash password if being updated
        if (updates.password) {
            updates.password_hash = await authService.hashPassword(updates.password);
            delete updates.password;
        }

        // Only admins can change roles
        if (updates.role && req.user.role !== 'admin') {
            delete updates.role;
        }

        db.updateUser(req.params.id, updates);

        // Create audit log
        db.createAuditLog({
            user_id: req.user.userId,
            action: 'user_updated',
            entity_type: 'user',
            entity_id: req.params.id
        });

        const updated = db.getUserById(req.params.id);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete user (Admin only)
app.delete('/api/users/:id', authenticate, authorize('admin'), (req, res) => {
    try {
        // Prevent self-deletion
        if (req.user.userId === req.params.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        db.deleteUser(req.params.id);

        // Create audit log
        db.createAuditLog({
            user_id: req.user.userId,
            action: 'user_deleted',
            entity_type: 'user',
            entity_id: req.params.id
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= NOTIFICATION ENDPOINTS =============

// Get user notifications
app.get('/api/notifications', authenticate, (req, res) => {
    try {
        const notifications = db.getAllNotifications(req.user.userId);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get unread notifications
app.get('/api/notifications/unread', authenticate, (req, res) => {
    try {
        const notifications = db.getUnreadNotifications(req.user.userId);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticate, (req, res) => {
    try {
        db.markNotificationAsRead(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark all notifications as read
app.put('/api/notifications/read-all', authenticate, (req, res) => {
    try {
        db.markAllNotificationsAsRead(req.user.userId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete notification
app.delete('/api/notifications/:id', authenticate, (req, res) => {
    try {
        db.deleteNotification(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= ALERT CONFIGURATION ENDPOINTS =============

// Get alert rules
app.get('/api/alerts/rules', authenticate, authorize('admin', 'manager'), (req, res) => {
    try {
        const rules = alertEngine.getAlertRules();
        res.json(rules);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update alert rules
app.put('/api/alerts/rules', authenticate, authorize('admin'), (req, res) => {
    try {
        const updated = alertEngine.updateAlertRules(req.body);

        // Create audit log
        db.createAuditLog({
            user_id: req.user.userId,
            action: 'alert_rules_updated',
            entity_type: 'settings',
            new_value: JSON.stringify(req.body)
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manually trigger alert checks
app.post('/api/alerts/run', authenticate, authorize('admin', 'manager'), async (req, res) => {
    try {
        const results = await alertEngine.runAllChecks();
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= RESOURCE ENDPOINTS =============

// Get all resources
app.get('/api/resources', (req, res) => {
    try {
        const resources = db.getAllResources();
        res.json(resources);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get resource by ID
app.get('/api/resources/:id', (req, res) => {
    try {
        const resource = db.getResourceById(req.params.id);
        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }
        res.json(resource);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get bench resources
app.get('/api/resources/bench/all', (req, res) => {
    try {
        const benchResources = db.getBenchResources();
        res.json(benchResources);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create resource
app.post('/api/resources', (req, res) => {
    try {
        const resource = {
            id: uuidv4(),
            ...req.body,
            bench_since: req.body.status === 'available' ? new Date().toISOString() : null
        };
        db.createResource(resource);
        broadcastUpdate('resource_created', resource);
        res.status(201).json(resource);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update resource
app.put('/api/resources/:id', (req, res) => {
    try {
        db.updateResource(req.params.id, req.body);
        const updated = db.getResourceById(req.params.id);
        broadcastUpdate('resource_updated', updated);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete resource
app.delete('/api/resources/:id', (req, res) => {
    try {
        db.deleteResource(req.params.id);
        broadcastUpdate('resource_deleted', { id: req.params.id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= PROJECT ENDPOINTS =============

// Get all projects
app.get('/api/projects', (req, res) => {
    try {
        const projects = db.getAllProjects();
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get project by ID
app.get('/api/projects/:id', (req, res) => {
    try {
        const project = db.getProjectById(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json(project);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create project
app.post('/api/projects', (req, res) => {
    try {
        const project = {
            id: uuidv4(),
            ...req.body
        };
        db.createProject(project);
        broadcastUpdate('project_created', project);
        res.status(201).json(project);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update project
app.put('/api/projects/:id', (req, res) => {
    try {
        db.updateProject(req.params.id, req.body);
        const updated = db.getProjectById(req.params.id);
        broadcastUpdate('project_updated', updated);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete project
app.delete('/api/projects/:id', (req, res) => {
    try {
        db.deleteProject(req.params.id);
        broadcastUpdate('project_deleted', { id: req.params.id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= ALLOCATION ENDPOINTS =============

// Get all allocations
app.get('/api/allocations', (req, res) => {
    try {
        const allocations = db.getAllAllocations();
        res.json(allocations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Auto-allocate resources to project
app.post('/api/allocations/auto/:projectId', (req, res) => {
    try {
        const result = optimizer.autoAllocate(req.params.projectId);
        if (result.success) {
            broadcastUpdate('allocation_created', result);
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manual allocation
app.post('/api/allocations/manual', (req, res) => {
    try {
        const { resourceId, projectId, allocationPercentage } = req.body;
        const result = optimizer.manualAllocate(resourceId, projectId, allocationPercentage);
        if (result.success) {
            broadcastUpdate('allocation_created', result);
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Deallocate
app.delete('/api/allocations/:id', (req, res) => {
    try {
        const result = optimizer.deallocate(req.params.id);
        if (result.success) {
            broadcastUpdate('allocation_deleted', { id: req.params.id });
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Optimize all allocations
app.post('/api/allocations/optimize-all', (req, res) => {
    try {
        const result = optimizer.optimizeAllAllocations();
        broadcastUpdate('allocations_optimized', result);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= RULE ENGINE ENDPOINTS =============

// Get best resources for project
app.get('/api/rules/match/:projectId', (req, res) => {
    try {
        const matches = ruleEngine.findBestResourcesForProject(req.params.projectId);
        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Analyze utilization
app.get('/api/rules/utilization', (req, res) => {
    try {
        const analysis = ruleEngine.analyzeResourceUtilization();
        res.json(analysis);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get bench optimization strategy
app.get('/api/rules/bench-optimization/:resourceId', (req, res) => {
    try {
        const strategy = ruleEngine.getBenchOptimizationStrategy(req.params.resourceId);
        res.json(strategy);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Generate recommendations
app.post('/api/rules/recommendations', (req, res) => {
    try {
        const recommendations = ruleEngine.generateAllocationRecommendations();
        broadcastUpdate('recommendations_updated', recommendations);
        res.json(recommendations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all recommendations
app.get('/api/recommendations', (req, res) => {
    try {
        const recommendations = db.getAllRecommendations();
        res.json(recommendations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Load balancing suggestions
app.get('/api/rules/load-balancing', (req, res) => {
    try {
        const suggestions = ruleEngine.suggestLoadBalancing();
        res.json(suggestions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= ANALYTICS ENDPOINTS =============

// Dashboard metrics
app.get('/api/analytics/dashboard', (req, res) => {
    try {
        const metrics = ruleEngine.getDashboardMetrics();
        res.json(metrics);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Allocation conflicts
app.get('/api/analytics/conflicts', (req, res) => {
    try {
        const conflicts = optimizer.findAllocationConflicts();
        res.json(conflicts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reallocation suggestions
app.get('/api/analytics/reallocation-suggestions', (req, res) => {
    try {
        const suggestions = optimizer.suggestReallocation();
        res.json(suggestions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Availability forecast
app.get('/api/analytics/availability-forecast', (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const forecast = optimizer.getAvailabilityForecast(days);
        res.json(forecast);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= AI RECOMMENDATIONS ENDPOINTS =============

app.get('/api/ai/recommendations/:projectId', authenticate, async (req, res) => {
    try {
        const recommendations = await recommendationEngine.getResourceRecommendations(req.params.projectId);
        res.json(recommendations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/ai/churn-risk/:resourceId', authenticate, async (req, res) => {
    try {
        const risk = await recommendationEngine.predictChurnRisk(req.params.resourceId);
        res.json(risk);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/ai/team-composition/:projectId', authenticate, async (req, res) => {
    try {
        const team = await recommendationEngine.suggestTeamComposition(req.params.projectId);
        res.json(team);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= EXPORT ENDPOINTS =============

app.post('/api/export/pdf', authenticate, async (req, res) => {
    try {
        const { reportType } = req.body;
        const filename = await exportService.generatePDFReport(reportType);
        res.json({ filename, url: `/exports/${filename}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/export/excel', authenticate, async (req, res) => {
    try {
        const { dataType } = req.body;
        const filename = await exportService.generateExcelExport(dataType);
        res.json({ filename, url: `/exports/${filename}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/export/csv', authenticate, async (req, res) => {
    try {
        const { dataType } = req.body;
        const filename = await exportService.generateCSVExport(dataType);
        res.json({ filename, url: `/exports/${filename}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve exported files
app.use('/exports', authenticate, express.static(path.join(__dirname, 'exports')));

// ============= WORKFLOW ENDPOINTS =============

app.post('/api/workflow/requests', authenticate, async (req, res) => {
    try {
        const requestData = { ...req.body, requested_by: req.user.userId };
        const request = await workflowEngine.submitRequest(requestData);
        res.status(201).json(request);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/workflow/requests/:id/approve', authenticate, authorize('manager', 'admin'), async (req, res) => {
    try {
        const result = await workflowEngine.approveRequest(req.params.id, req.user.userId, req.body.comments);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/workflow/requests/:id/reject', authenticate, authorize('manager', 'admin'), async (req, res) => {
    try {
        const result = await workflowEngine.rejectRequest(req.params.id, req.user.userId, req.body.reason);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/workflow/requests/pending', authenticate, authorize('manager', 'admin'), (req, res) => {
    try {
        const requests = workflowEngine.getPendingRequests();
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= COST ANALYSIS ENDPOINTS =============

app.get('/api/cost/project/:projectId', authenticate, (req, res) => {
    try {
        const cost = costAnalyzer.calculateProjectCost(req.params.projectId);
        res.json(cost);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/cost/trends', authenticate, (req, res) => {
    try {
        const trends = costAnalyzer.getCostTrends();
        res.json(trends);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/cost/overruns', authenticate, (req, res) => {
    try {
        const overruns = costAnalyzer.identifyCostOverruns();
        res.json(overruns);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= SERVER =============

const PORT = process.env.PORT || 3000;

async function startServer() {
    await initializeServer();

    server.listen(PORT, () => {
        console.log(`
╔════════════════════════════════════════════════════════════════╗
║  Smart Resource Utilization & Bench Optimization System       ║
║  Server running on http://localhost:${PORT}                        ║
║  WebSocket ready for real-time updates                        ║
╚════════════════════════════════════════════════════════════════╝
  `);
    });
}

startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    if (db) db.close();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
