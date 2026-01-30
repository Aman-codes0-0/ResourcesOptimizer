class DashboardManager {
    constructor() {
        this.charts = {};
    }

    async render() {
        const container = document.getElementById('pageContent');
        const template = document.getElementById('dashboard-template');

        if (!template) return;

        container.innerHTML = '';
        container.appendChild(template.content.cloneNode(true));

        await this.fetchMetrics();
        this.initCharts();
        this.setupRealtimeUpdates();
    }

    async fetchMetrics() {
        try {
            const response = await authManager.apiRequest('/api/analytics/dashboard');
            const data = await response.json();

            this.updateStat('totalResources', data.totalResources);
            this.updateStat('avgUtilization', `${data.avgUtilization}%`);
            this.updateStat('benchSize', data.benchSize);
            this.updateStat('activeProjects', data.activeProjects);

            // Add trend indicators logic here if data supports it
        } catch (error) {
            console.error('Failed to fetch dashboard metrics:', error);
        }
    }

    updateStat(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    initCharts() {
        // Utilization Chart
        const utilCtx = document.getElementById('utilizationChart');
        if (utilCtx) {
            this.charts.utilization = new Chart(utilCtx, {
                type: 'line',
                data: {
                    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                    datasets: [{
                        label: 'Avg Utilization (%)',
                        data: [65, 70, 75, 72],
                        borderColor: '#667eea',
                        tension: 0.4
                    }]
                },
                options: { responsive: true }
            });
        }

        // Project Status Chart
        const statusCtx = document.getElementById('projectStatusChart');
        if (statusCtx) {
            this.charts.status = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Active', 'Planning', 'Completed', 'On Hold'],
                    datasets: [{
                        data: [12, 5, 8, 2],
                        backgroundColor: ['#4caf50', '#2196f3', '#9e9e9e', '#ff9800']
                    }]
                },
                options: { responsive: true }
            });
        }
    }

    setupRealtimeUpdates() {
        if (!app.socket) return;

        app.socket.on('dashboard_update', (data) => {
            if (data.type === 'metrics') {
                this.updateStat('totalResources', data.totalResources);
                this.updateStat('avgUtilization', `${data.avgUtilization}%`);
            }
        });
    }
}

window.dashboardManager = new DashboardManager();
