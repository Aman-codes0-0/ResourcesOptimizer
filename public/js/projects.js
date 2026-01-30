class ProjectManager {
    async render() {
        const container = document.getElementById('pageContent');
        container.innerHTML = `
            <div class="view-header">
                <h2>Projects Portfolio</h2>
                <button class="btn-primary" onclick="window.projectManager.showAddModal()">
                    <span class="material-icons">add</span> Add Project
                </button>
            </div>

            <div class="project-grid" id="projectGrid">
                <div class="loading-spinner"></div>
            </div>
        `;

        await this.loadProjects();
    }

    async loadProjects() {
        try {
            const response = await authManager.apiRequest('/api/projects');
            this.projects = await response.json();
            this.renderGrid(this.projects);
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }

    renderGrid(projects) {
        const grid = document.getElementById('projectGrid');
        if (!grid) return;

        if (projects.length === 0) {
            grid.innerHTML = '<div class="empty-state">No projects found. Create one to get started.</div>';
            return;
        }

        grid.innerHTML = projects.map(p => `
            <div class="project-card">
                <div class="project-header">
                    <span class="priority-dot ${p.priority}"></span>
                    <h3>${p.name}</h3>
                    <span class="status-badge ${p.status}">${p.status}</span>
                </div>
                <div class="project-body">
                    <p class="description">${p.description || 'No description provided.'}</p>
                    <div class="project-meta">
                        <div class="meta-item">
                            <span class="material-icons">calendar_today</span>
                            <span>${new Date(p.start_date).toLocaleDateString()}</span>
                        </div>
                        <div class="meta-item">
                            <span class="material-icons">attach_money</span>
                            <span>$${p.budget ? p.budget.toLocaleString() : '0'}</span>
                        </div>
                    </div>
                    <div class="skills-required">
                        <strong>Required:</strong> ${p.required_skills}
                    </div>
                </div>
                <div class="project-footer">
                    <button class="btn-text" onclick="window.projectManager.viewDetails('${p.id}')">View Details</button>
                    <div class="actions">
                        <button class="btn-icon" onclick="window.projectManager.editProject('${p.id}')"><span class="material-icons">edit</span></button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    showAddModal() {
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div class="modal open">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Add New Project</h3>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="addProjectForm" onsubmit="window.projectManager.saveProject(event)">
                            <div class="form-group">
                                <label>Project Name</label>
                                <input type="text" name="name" required>
                            </div>
                            <div class="form-group">
                                <label>Description</label>
                                <textarea name="description"></textarea>
                            </div>
                            <div class="row">
                                <div class="form-group">
                                    <label>Start Date</label>
                                    <input type="date" name="start_date" required>
                                </div>
                                <div class="form-group">
                                    <label>End Date</label>
                                    <input type="date" name="end_date">
                                </div>
                            </div>
                            <div class="row">
                                <div class="form-group">
                                    <label>Priority</label>
                                    <select name="priority">
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Status</label>
                                    <select name="status">
                                        <option value="planning">Planning</option>
                                        <option value="active">Active</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                                <button type="submit" class="btn-primary">Create Project</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal.firstElementChild);
    }

    async saveProject(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData.entries());

        try {
            await authManager.apiRequest('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            document.querySelector('.modal').remove();
            this.loadProjects();
            app.showNotification({ message: 'Project created successfully', type: 'success' });
        } catch (error) {
            alert('Failed to create project: ' + error.message);
        }
    }

    viewDetails(id) {
        // Implementation for viewing details
        alert('View details for ' + id);
    }
}

window.projectManager = new ProjectManager();
