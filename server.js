const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
const http = require('http');

const ResourceDatabase = require('./database');
const RuleEngine = require('./rule-engine');
const AllocationOptimizer = require('./allocation-optimizer');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize database and engines
let db, ruleEngine, optimizer;

async function initializeServer() {
    db = new ResourceDatabase();
    await db.initialize();
    ruleEngine = new RuleEngine(db);
    optimizer = new AllocationOptimizer(db, ruleEngine);
    console.log('Database initialized successfully');
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
