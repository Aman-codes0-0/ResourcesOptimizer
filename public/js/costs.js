class CostManager {
    async render() {
        const container = document.getElementById('pageContent');
        container.innerHTML = `
            <div class="view-header">
                <h2>Cost Analysis & Budgeting</h2>
                <div class="actions">
                     <button class="btn-secondary" onclick="window.print()">
                        <span class="material-icons">print</span> Print
                    </button>
                </div>
            </div>

            <div class="dashboard-grid">
                <div class="chart-card wide">
                    <h3>Budget vs Actuals (Portfolio)</h3>
                    <canvas id="costTrendChart"></canvas>
                </div>

                <div class="list-card wide">
                    <div class="card-header">
                        <h3>Project Cost Breakdown</h3>
                    </div>
                    <div class="list-body" id="costBreakdown">
                         <!-- Table loaded here -->
                         <div class="loading-spinner"></div>
                    </div>
                </div>

                <div class="list-card">
                    <div class="card-header">
                        <h3>Cost Overruns</h3>
                        <span class="badge error">Attention Needed</span>
                    </div>
                    <div class="list-body" id="overrunList">
                         <div class="loading-spinner"></div>
                    </div>
                </div>
            </div>
        `;

        this.initCharts();
        await this.loadCostData();
    }

    initCharts() {
        new Chart(document.getElementById('costTrendChart'), {
            type: 'bar',
            data: {
                labels: ['Project A', 'Project B', 'Project C', 'Project D', 'Project E'],
                datasets: [
                    {
                        label: 'Budget',
                        data: [50000, 30000, 75000, 45000, 60000],
                        backgroundColor: '#e0e0e0'
                    },
                    {
                        label: 'Actual Cost',
                        data: [42000, 35000, 60000, 20000, 65000],
                        backgroundColor: '#667eea'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Cost ($)' } }
                }
            }
        });
    }

    async loadCostData() {
        try {
            const [trendsRes, overrunsRes] = await Promise.all([
                authManager.apiRequest('/api/cost/trends'),
                authManager.apiRequest('/api/cost/overruns')
            ]);

            const trends = await trendsRes.json();
            const overruns = await overrunsRes.json();

            this.renderBreakdown(trends);
            this.renderOverruns(overruns);

        } catch (error) {
            console.error('Failed to load cost data:', error);
        }
    }

    renderBreakdown(trends) {
        const container = document.getElementById('costBreakdown');

        const html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Project</th>
                        <th>Status</th>
                        <th>Budget</th>
                        <th>Actual Cost</th>
                        <th>Variance</th>
                    </tr>
                </thead>
                <tbody>
                    ${trends.map(t => `
                        <tr>
                            <td>${t.projectName}</td>
                            <td><span class="status-dot ${t.status}"></span> ${t.status}</td>
                            <td>$${t.budget ? t.budget.toLocaleString() : '0'}</td>
                            <td>$${t.actualCost.toLocaleString()}</td>
                            <td class="${t.variance >= 0 ? 'text-success' : 'text-danger'}">
                                ${t.variance >= 0 ? '+' : ''}$${t.variance.toLocaleString()}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    }

    renderOverruns(overruns) {
        const container = document.getElementById('overrunList');

        if (overruns.length === 0) {
            container.innerHTML = '<div class="empty-state">No cost overruns detected</div>';
            return;
        }

        container.innerHTML = overruns.map(o => `
            <div class="overrun-item">
                <div class="item-header">
                    <h4>${o.projectName}</h4>
                    <span class="percentage negative">${o.overrunPercentage}% Over</span>
                </div>
                <div class="item-details">
                    <div>Budget: $${o.budget.toLocaleString()}</div>
                    <div class="text-danger">Actual: $${o.actualCost.toLocaleString()}</div>
                </div>
                <div class="progress-bar small">
                    <div class="progress error" style="width: 100%"></div>
                </div>
            </div>
        `).join('');
    }
}

window.costManager = new CostManager();
