class AIInsightsManager {
    async render() {
        const container = document.getElementById('pageContent');
        container.innerHTML = `
            <div class="view-header">
                <h2>AI Insights & Recommendations</h2>
                <div class="actions">
                     <span class="last-updated">Last model training: Just now</span>
                </div>
            </div>

            <div class="dashboard-grid">
                <div class="list-card wide">
                    <div class="card-header">
                        <h3>Resource Recommendations</h3>
                        <div class="filters">
                            <select id="projectSelect" onchange="window.aiManager.loadRecommendations()">
                                <option value="">Select Project...</option>
                            </select>
                        </div>
                    </div>
                    <div class="list-body" id="recommendationList">
                        <div class="empty-state">Select a project to see AI recommendations</div>
                    </div>
                </div>

                <div class="list-card">
                    <div class="card-header">
                        <h3>Churn Risk Analysis</h3>
                        <span class="badge warning">High Priority</span>
                    </div>
                    <div class="list-body" id="churnRiskList">
                        <div class="loading-spinner"></div>
                    </div>
                </div>

                <div class="list-card">
                    <div class="card-header">
                        <h3>Team Composition Suggestions</h3>
                    </div>
                    <div class="list-body" id="teamSuggestions">
                         <div class="empty-state">Select a project to view optimal team structure</div>
                    </div>
                </div>
            </div>
        `;

        await this.loadProjects();
        this.loadChurnAnalysis(); // Load immediately
    }

    async loadProjects() {
        try {
            const res = await authManager.apiRequest('/api/projects');
            const projects = await res.json();
            const select = document.getElementById('projectSelect');
            if (select) {
                projects.forEach(p => {
                    const option = document.createElement('option');
                    option.value = p.id;
                    option.textContent = p.name;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error(error);
        }
    }

    async loadRecommendations() {
        const projectId = document.getElementById('projectSelect').value;
        const container = document.getElementById('recommendationList');

        if (!projectId) {
            container.innerHTML = '<div class="empty-state">Select a project to see AI recommendations</div>';
            return;
        }

        container.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const res = await authManager.apiRequest(`/api/ai/recommendations/${projectId}`);
            const recs = await res.json();

            if (recs.length === 0) {
                container.innerHTML = '<div class="empty-state">No recommendations found</div>';
                return;
            }

            container.innerHTML = recs.map(r => `
                <div class="recommendation-item">
                    <div class="rec-score ${r.confidence.toLowerCase()}">${r.matchScore}%</div>
                    <div class="rec-details">
                        <h4>${r.resourceName}</h4>
                        <div class="rec-meta">${r.role} • ${r.availability}% Available</div>
                        <div class="rec-reasons">
                            ${r.reasons.map(reason => `<span class="tag small">${reason}</span>`).join('')}
                        </div>
                    </div>
                    <button class="btn-secondary small" onclick="window.allocationManager.allocate('${r.resourceId}', '${projectId}')"> Allocate</button>
                </div>
            `).join('');

            // Also load team suggestions
            this.loadTeamSuggestions(projectId);

        } catch (error) {
            container.innerHTML = `<div class="error">Failed to load recommendations: ${error.message}</div>`;
        }
    }

    async loadChurnAnalysis() {
        // Mocking churn analysis for now since we need to iterate all resources
        // In prod, this would be a dedicated endpoint returning high-risk resources
        const container = document.getElementById('churnRiskList');

        // Simulating delay
        setTimeout(() => {
            container.innerHTML = `
                <div class="risk-item high">
                    <div class="risk-header">
                        <h4>John Doe</h4>
                        <span class="risk-score">85% Risk</span>
                    </div>
                    <p>High utilization (>95%) for 3 months</p>
                    <button class="btn-text">View Details</button>
                </div>
                <div class="risk-item medium">
                    <div class="risk-header">
                        <h4>Jane Smith</h4>
                        <span class="risk-score">60% Risk</span>
                    </div>
                    <p>On bench for 45 days</p>
                    <button class="btn-text">View Details</button>
                </div>
            `;
        }, 1000);
    }

    async loadTeamSuggestions(projectId) {
        const container = document.getElementById('teamSuggestions');
        container.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const res = await authManager.apiRequest(`/api/ai/team-composition/${projectId}`);
            const data = await res.json();

            container.innerHTML = `
                <div class="team-suggestion">
                    <div class="suggestion-header">
                        <span class="coverage">Skill Coverage: ${data.skillCoverage}%</span>
                    </div>
                    <div class="team-list-compact">
                        ${data.team.map(m => `
                            <div class="team-member-row">
                                <span>${m.resourceName}</span>
                                <span class="role-tag">${m.role}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } catch (e) {
            container.innerHTML = `<div class="error">Failed to load team suggestions</div>`;
        }
    }
}

window.aiManager = new AIInsightsManager();
