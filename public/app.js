// API Base URL
const API_URL = 'http://localhost:3000/api';

// WebSocket connection
let ws;
let reconnectInterval;

// State
const state = {
    resources: [],
    projects: [],
    allocations: [],
    recommendations: [],
    metrics: {}
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeWebSocket();
    setupNavigation();
    setupEventListeners();
    loadInitialData();
});

// WebSocket Setup
function initializeWebSocket() {
    ws = new WebSocket('ws://localhost:3000');

    ws.onopen = () => {
        console.log('WebSocket connected');
        updateConnectionStatus(true);
        clearInterval(reconnectInterval);
    };

    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        updateConnectionStatus(false);
        reconnectInterval = setInterval(() => {
            initializeWebSocket();
        }, 5000);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

function updateConnectionStatus(connected) {
    const indicator = document.getElementById('wsStatus');
    const text = document.getElementById('wsStatusText');

    if (connected) {
        indicator.classList.add('connected');
        text.textContent = 'Connected';
    } else {
        indicator.classList.remove('connected');
        text.textContent = 'Disconnected';
    }
}

function handleWebSocketMessage(message) {
    console.log('WebSocket message:', message);

    switch (message.type) {
        case 'resource_created':
        case 'resource_updated':
        case 'resource_deleted':
        case 'project_created':
        case 'project_updated':
        case 'project_deleted':
        case 'allocation_created':
        case 'allocation_deleted':
        case 'recommendations_updated':
            loadInitialData();
            break;
    }
}

// Navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            switchView(view);

            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function switchView(viewName) {
    const views = document.querySelectorAll('.view');
    views.forEach(view => view.classList.remove('active'));

    const targetView = document.getElementById(`${viewName}View`);
    if (targetView) {
        targetView.classList.add('active');
    }

    const titles = {
        dashboard: { title: 'Dashboard', subtitle: 'Real-time resource utilization overview' },
        resources: { title: 'Resources', subtitle: 'Manage your team members and their skills' },
        projects: { title: 'Projects', subtitle: 'Track and manage active projects' },
        bench: { title: 'Bench Resources', subtitle: 'Available resources waiting for allocation' },
        allocations: { title: 'Allocations', subtitle: 'Resource-to-project assignments' },
        analytics: { title: 'Analytics', subtitle: 'Insights and optimization suggestions' }
    };

    const info = titles[viewName] || { title: viewName, subtitle: '' };
    document.getElementById('currentViewTitle').textContent = info.title;
    document.getElementById('currentViewSubtitle').textContent = info.subtitle;

    // Load view-specific data
    loadViewData(viewName);
}

function loadViewData(viewName) {
    switch (viewName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'resources':
            renderResourcesTable();
            break;
        case 'projects':
            renderProjectsTable();
            break;
        case 'bench':
            renderBenchTable();
            break;
        case 'allocations':
            renderAllocationsTable();
            break;
        case 'analytics':
            loadAnalytics();
            break;
    }
}

// Event Listeners
function setupEventListeners() {
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', loadInitialData);

    // Add Resource
    document.getElementById('addResourceBtn').addEventListener('click', () => openModal('resource'));

    // Add Project
    document.getElementById('addProjectBtn').addEventListener('click', () => openModal('project'));

    // Manual Allocation
    document.getElementById('manualAllocateBtn').addEventListener('click', () => openModal('allocation'));

    // Auto Optimize
    document.getElementById('autoOptimizeBtn').addEventListener('click', autoOptimizeAll);

    // Forms
    document.getElementById('resourceForm').addEventListener('submit', handleResourceSubmit);
    document.getElementById('projectForm').addEventListener('submit', handleProjectSubmit);
    document.getElementById('allocationForm').addEventListener('submit', handleAllocationSubmit);

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
}

// Load Data
async function loadInitialData() {
    try {
        const [resources, projects, allocations, recommendations, metrics] = await Promise.all([
            fetch(`${API_URL}/resources`).then(r => r.json()),
            fetch(`${API_URL}/projects`).then(r => r.json()),
            fetch(`${API_URL}/allocations`).then(r => r.json()),
            fetch(`${API_URL}/recommendations`).then(r => r.json()),
            fetch(`${API_URL}/analytics/dashboard`).then(r => r.json())
        ]);

        state.resources = resources;
        state.projects = projects;
        state.allocations = allocations;
        state.recommendations = recommendations;
        state.metrics = metrics;

        // Update current view
        const activeView = document.querySelector('.nav-item.active').dataset.view;
        loadViewData(activeView);

        // Update notification badge
        document.getElementById('notificationBadge').textContent = recommendations.length;
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Dashboard
async function loadDashboard() {
    const metrics = state.metrics;

    // Update metrics
    document.getElementById('totalResources').textContent = metrics.totalResources || 0;
    document.getElementById('benchCount').textContent = metrics.benchCount || 0;
    document.getElementById('benchPercentage').textContent = `${metrics.benchPercentage || 0}%`;
    document.getElementById('activeProjects').textContent = metrics.activeProjects || 0;
    document.getElementById('avgUtilization').textContent = `${metrics.avgUtilization || 0}%`;

    // Utilization chart
    renderUtilizationChart(metrics.utilizationBreakdown);

    // Alerts
    renderAlerts(metrics.alerts);

    // Recommendations
    renderRecommendations();
}

function renderUtilizationChart(breakdown) {
    if (!breakdown) return;

    const total = breakdown.underutilized + breakdown.optimal + breakdown.overutilized + breakdown.bench;

    const chartHTML = `
        <div class="chart-item">
            <div class="chart-label">Underutilized</div>
            <div class="chart-bar">
                <div class="chart-fill underutilized" style="width: ${(breakdown.underutilized / total * 100)}%">
                    ${breakdown.underutilized}
                </div>
            </div>
        </div>
        <div class="chart-item">
            <div class="chart-label">Optimal</div>
            <div class="chart-bar">
                <div class="chart-fill optimal" style="width: ${(breakdown.optimal / total * 100)}%">
                    ${breakdown.optimal}
                </div>
            </div>
        </div>
        <div class="chart-item">
            <div class="chart-label">Overutilized</div>
            <div class="chart-bar">
                <div class="chart-fill overutilized" style="width: ${(breakdown.overutilized / total * 100)}%">
                    ${breakdown.overutilized}
                </div>
            </div>
        </div>
        <div class="chart-item">
            <div class="chart-label">On Bench</div>
            <div class="chart-bar">
                <div class="chart-fill bench" style="width: ${(breakdown.bench / total * 100)}%">
                    ${breakdown.bench}
                </div>
            </div>
        </div>
    `;

    document.getElementById('utilizationChart').innerHTML = chartHTML;
}

function renderAlerts(alerts) {
    if (!alerts) return;

    const alertsHTML = [];

    if (alerts.criticalBench > 0) {
        alertsHTML.push(`
            <div class="alert-item critical">
                <strong>Critical:</strong> ${alerts.criticalBench} resource(s) on bench for 30+ days
            </div>
        `);
    }

    if (alerts.overutilizedResources > 0) {
        alertsHTML.push(`
            <div class="alert-item high">
                <strong>Warning:</strong> ${alerts.overutilizedResources} resource(s) are overutilized
            </div>
        `);
    }

    if (alerts.highPriorityProjects > 0) {
        alertsHTML.push(`
            <div class="alert-item medium">
                <strong>Info:</strong> ${alerts.highPriorityProjects} high-priority project(s) need attention
            </div>
        `);
    }

    if (alertsHTML.length === 0) {
        alertsHTML.push('<div class="empty-state"><div class="empty-state-icon">✅</div><p>No alerts at this time</p></div>');
    }

    document.getElementById('alertsList').innerHTML = alertsHTML.join('');
}

function renderRecommendations() {
    const recommendations = state.recommendations.slice(0, 5);

    if (recommendations.length === 0) {
        document.getElementById('recommendationsList').innerHTML = '<div class="empty-state"><div class="empty-state-icon">💡</div><p>No recommendations available</p></div>';
        return;
    }

    const html = recommendations.map(rec => `
        <div class="recommendation-item">
            <div>
                <div class="priority-badge ${rec.priority}">${rec.priority.toUpperCase()}</div>
                <p style="margin-top: 0.5rem;">${rec.description}</p>
            </div>
        </div>
    `).join('');

    document.getElementById('recommendationsList').innerHTML = html;
}

// Resources Table
function renderResourcesTable() {
    const resources = state.resources;

    if (resources.length === 0) {
        document.getElementById('resourcesTable').innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><p>No resources found</p></div>';
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Skills</th>
                    <th>Utilization</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${resources.map(resource => `
                    <tr>
                        <td><strong>${resource.name}</strong><br><small style="color: var(--text-muted)">${resource.email}</small></td>
                        <td>${resource.role}</td>
                        <td><div class="skill-tags">${resource.skills.split(',').slice(0, 3).map(s => `<span class="skill-tag">${s.trim()}</span>`).join('')}</div></td>
                        <td><strong>${resource.current_utilization}%</strong></td>
                        <td><span class="status-badge ${resource.status}">${resource.status}</span></td>
                        <td>
                            <div class="table-actions">
                                <button class="btn-table btn-secondary" onclick="viewResource('${resource.id}')">View</button>
                                <button class="btn-table btn-danger" onclick="deleteResource('${resource.id}')">Delete</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('resourcesTable').innerHTML = html;
}

// Projects Table
function renderProjectsTable() {
    const projects = state.projects;

    if (projects.length === 0) {
        document.getElementById('projectsTable').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📁</div><p>No projects found</p></div>';
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Project Name</th>
                    <th>Required Skills</th>
                    <th>Resources Needed</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${projects.map(project => `
                    <tr>
                        <td><strong>${project.name}</strong><br><small style="color: var(--text-muted)">${project.description || ''}</small></td>
                        <td><div class="skill-tags">${project.required_skills.split(',').slice(0, 3).map(s => `<span class="skill-tag">${s.trim()}</span>`).join('')}</div></td>
                        <td>${project.required_resources}</td>
                        <td><span class="priority-badge ${project.priority}">${project.priority}</span></td>
                        <td><span class="status-badge ${project.status}">${project.status}</span></td>
                        <td>
                            <div class="table-actions">
                                <button class="btn-table btn-primary" onclick="autoAllocateProject('${project.id}')">Auto Allocate</button>
                                <button class="btn-table btn-danger" onclick="deleteProject('${project.id}')">Delete</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('projectsTable').innerHTML = html;
}

// Bench Table
function renderBenchTable() {
    const benchResources = state.resources.filter(r => r.status === 'available');

    if (benchResources.length === 0) {
        document.getElementById('benchTable').innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎉</div><p>No resources on bench - Everyone is allocated!</p></div>';
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Skills</th>
                    <th>Days on Bench</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${benchResources.map(resource => {
        const daysOnBench = resource.bench_since ? Math.floor((new Date() - new Date(resource.bench_since)) / (1000 * 60 * 60 * 24)) : 0;
        return `
                        <tr>
                            <td><strong>${resource.name}</strong></td>
                            <td>${resource.role}</td>
                            <td><div class="skill-tags">${resource.skills.split(',').slice(0, 3).map(s => `<span class="skill-tag">${s.trim()}</span>`).join('')}</div></td>
                            <td><strong style="color: ${daysOnBench >= 30 ? 'var(--danger)' : daysOnBench >= 14 ? 'var(--warning)' : 'var(--text)'}">${daysOnBench} days</strong></td>
                            <td>
                                <button class="btn-table btn-primary" onclick="findMatchingProjects('${resource.id}')">Find Projects</button>
                            </td>
                        </tr>
                    `;
    }).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('benchTable').innerHTML = html;
}

// Allocations Table
function renderAllocationsTable() {
    const allocations = state.allocations;

    if (allocations.length === 0) {
        document.getElementById('allocationsTable').innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔄</div><p>No active allocations</p></div>';
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Resource</th>
                    <th>Project</th>
                    <th>Allocation</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${allocations.map(allocation => `
                    <tr>
                        <td><strong>${allocation.resource_name}</strong></td>
                        <td>${allocation.project_name}</td>
                        <td><strong>${allocation.allocation_percentage}%</strong></td>
                        <td>${new Date(allocation.start_date).toLocaleDateString()}</td>
                        <td>${allocation.end_date ? new Date(allocation.end_date).toLocaleDateString() : 'Ongoing'}</td>
                        <td>
                            <button class="btn-table btn-danger" onclick="deallocate('${allocation.id}')">Deallocate</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('allocationsTable').innerHTML = html;
}

// Analytics
async function loadAnalytics() {
    try {
        const [conflicts, reallocation, forecast, loadBalancing] = await Promise.all([
            fetch(`${API_URL}/analytics/conflicts`).then(r => r.json()),
            fetch(`${API_URL}/analytics/reallocation-suggestions`).then(r => r.json()),
            fetch(`${API_URL}/analytics/availability-forecast`).then(r => r.json()),
            fetch(`${API_URL}/rules/load-balancing`).then(r => r.json())
        ]);

        renderConflicts(conflicts);
        renderReallocationSuggestions(reallocation);
        renderForecast(forecast);
        renderLoadBalancing(loadBalancing);
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

function renderConflicts(conflicts) {
    if (conflicts.length === 0) {
        document.getElementById('conflictsList').innerHTML = '<div class="empty-state"><p>No conflicts detected</p></div>';
        return;
    }

    const html = conflicts.map(c => `
        <div class="analytics-item">
            <strong>${c.resource}</strong>: ${c.recommendation}<br>
            <small>Utilization: ${c.utilization}% | Severity: ${c.severity}</small>
        </div>
    `).join('');

    document.getElementById('conflictsList').innerHTML = html;
}

function renderReallocationSuggestions(suggestions) {
    if (suggestions.length === 0) {
        document.getElementById('reallocationList').innerHTML = '<div class="empty-state"><p>No reallocation suggestions</p></div>';
        return;
    }

    const html = suggestions.map(s => `
        <div class="analytics-item">
            <strong>${s.project}</strong>: Consider replacing ${s.currentResource} with ${s.suggestedResource}<br>
            <small>Benefit: ${s.benefit} | Priority: ${s.priority}</small>
        </div>
    `).join('');

    document.getElementById('reallocationList').innerHTML = html;
}

function renderForecast(forecast) {
    if (forecast.length === 0) {
        document.getElementById('forecastList').innerHTML = '<div class="empty-state"><p>No upcoming availability</p></div>';
        return;
    }

    const html = forecast.map(f => `
        <div class="analytics-item">
            <strong>${f.resource}</strong> will be available in <strong>${f.daysUntilAvailable} days</strong><br>
            <small>Skills: ${f.skills}</small>
        </div>
    `).join('');

    document.getElementById('forecastList').innerHTML = html;
}

function renderLoadBalancing(suggestions) {
    if (suggestions.length === 0) {
        document.getElementById('loadBalancingList').innerHTML = '<div class="empty-state"><p>Load is balanced</p></div>';
        return;
    }

    const html = suggestions.map(s => `
        <div class="analytics-item">
            ${s.reason}<br>
            <small>Skill Match: ${s.skillMatch.toFixed(0)}%</small>
        </div>
    `).join('');

    document.getElementById('loadBalancingList').innerHTML = html;
}

// Modal Functions
function openModal(type) {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.add('active');

    const modals = overlay.querySelectorAll('.modal');
    modals.forEach(m => m.style.display = 'none');

    if (type === 'resource') {
        document.getElementById('resourceModal').style.display = 'block';
        document.getElementById('resourceForm').reset();
    } else if (type === 'project') {
        document.getElementById('projectModal').style.display = 'block';
        document.getElementById('projectForm').reset();
        document.getElementById('projectStartDate').valueAsDate = new Date();
    } else if (type === 'allocation') {
        document.getElementById('allocationModal').style.display = 'block';
        populateAllocationForm();
    }
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

function populateAllocationForm() {
    const resourceSelect = document.getElementById('allocationResource');
    const projectSelect = document.getElementById('allocationProject');

    resourceSelect.innerHTML = state.resources
        .filter(r => r.current_utilization < 100)
        .map(r => `<option value="${r.id}">${r.name} (${r.current_utilization}% utilized)</option>`)
        .join('');

    projectSelect.innerHTML = state.projects
        .filter(p => p.status === 'planning' || p.status === 'active')
        .map(p => `<option value="${p.id}">${p.name}</option>`)
        .join('');
}

// Form Handlers
async function handleResourceSubmit(e) {
    e.preventDefault();

    const resource = {
        name: document.getElementById('resourceName').value,
        email: document.getElementById('resourceEmail').value,
        role: document.getElementById('resourceRole').value,
        skills: document.getElementById('resourceSkills').value,
        availability: parseInt(document.getElementById('resourceAvailability').value),
        status: 'available'
    };

    try {
        await fetch(`${API_URL}/resources`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resource)
        });

        closeModal();
        loadInitialData();
    } catch (error) {
        console.error('Error creating resource:', error);
        alert('Error creating resource');
    }
}

async function handleProjectSubmit(e) {
    e.preventDefault();

    const project = {
        name: document.getElementById('projectName').value,
        description: document.getElementById('projectDescription').value,
        required_skills: document.getElementById('projectSkills').value,
        required_resources: parseInt(document.getElementById('projectResources').value),
        priority: document.getElementById('projectPriority').value,
        start_date: document.getElementById('projectStartDate').value,
        end_date: document.getElementById('projectEndDate').value,
        status: 'planning'
    };

    try {
        await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project)
        });

        closeModal();
        loadInitialData();
    } catch (error) {
        console.error('Error creating project:', error);
        alert('Error creating project');
    }
}

async function handleAllocationSubmit(e) {
    e.preventDefault();

    const allocation = {
        resourceId: document.getElementById('allocationResource').value,
        projectId: document.getElementById('allocationProject').value,
        allocationPercentage: parseInt(document.getElementById('allocationPercentage').value)
    };

    try {
        const response = await fetch(`${API_URL}/allocations/manual`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(allocation)
        });

        const result = await response.json();

        if (result.success) {
            closeModal();
            loadInitialData();
            if (result.warning) {
                alert(`Success! Warning: ${result.warning}`);
            }
        } else {
            alert(`Error: ${result.error}\n${result.suggestion || ''}`);
        }
    } catch (error) {
        console.error('Error creating allocation:', error);
        alert('Error creating allocation');
    }
}

// Action Functions
async function autoAllocateProject(projectId) {
    if (!confirm('Auto-allocate resources to this project?')) return;

    try {
        const response = await fetch(`${API_URL}/allocations/auto/${projectId}`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            alert(result.message);
            loadInitialData();
        } else {
            alert(`Error: ${result.error}\n${result.suggestion || ''}`);
        }
    } catch (error) {
        console.error('Error auto-allocating:', error);
        alert('Error auto-allocating');
    }
}

async function autoOptimizeAll() {
    if (!confirm('Auto-optimize all allocations? This will allocate resources to all planning projects.')) return;

    try {
        const response = await fetch(`${API_URL}/allocations/optimize-all`, {
            method: 'POST'
        });

        const result = await response.json();
        alert(`Optimization complete!\nSuccessful: ${result.successful.length}\nFailed: ${result.failed.length}`);
        loadInitialData();
    } catch (error) {
        console.error('Error optimizing:', error);
        alert('Error optimizing allocations');
    }
}

async function deallocate(allocationId) {
    if (!confirm('Deallocate this resource?')) return;

    try {
        await fetch(`${API_URL}/allocations/${allocationId}`, {
            method: 'DELETE'
        });

        loadInitialData();
    } catch (error) {
        console.error('Error deallocating:', error);
        alert('Error deallocating resource');
    }
}

async function deleteResource(resourceId) {
    if (!confirm('Delete this resource? This action cannot be undone.')) return;

    try {
        await fetch(`${API_URL}/resources/${resourceId}`, {
            method: 'DELETE'
        });

        loadInitialData();
    } catch (error) {
        console.error('Error deleting resource:', error);
        alert('Error deleting resource');
    }
}

async function deleteProject(projectId) {
    if (!confirm('Delete this project? This action cannot be undone.')) return;

    try {
        await fetch(`${API_URL}/projects/${projectId}`, {
            method: 'DELETE'
        });

        loadInitialData();
    } catch (error) {
        console.error('Error deleting project:', error);
        alert('Error deleting project');
    }
}

async function viewResource(resourceId) {
    const resource = state.resources.find(r => r.id === resourceId);
    if (!resource) return;

    alert(`Resource Details:\n\nName: ${resource.name}\nEmail: ${resource.email}\nRole: ${resource.role}\nSkills: ${resource.skills}\nUtilization: ${resource.current_utilization}%\nStatus: ${resource.status}`);
}

async function findMatchingProjects(resourceId) {
    try {
        const response = await fetch(`${API_URL}/rules/bench-optimization/${resourceId}`);
        const strategy = await response.json();

        if (strategy.potentialProjects.length === 0) {
            alert('No matching projects found for this resource.');
            return;
        }

        const matches = strategy.potentialProjects.slice(0, 5).map((p, i) =>
            `${i + 1}. ${p.project.name} (${p.skillMatch.score.toFixed(0)}% match)`
        ).join('\n');

        alert(`Matching Projects for ${strategy.resource.name}:\n\n${matches}\n\nRecommendations:\n${strategy.recommendations.join('\n')}`);
    } catch (error) {
        console.error('Error finding matches:', error);
        alert('Error finding matching projects');
    }
}
