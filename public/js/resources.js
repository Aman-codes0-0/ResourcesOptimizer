class ResourceManager {
    async render() {
        const container = document.getElementById('pageContent');
        container.innerHTML = `
            <div class="view-header">
                <h2>Resources Directory</h2>
                <button class="btn-primary" onclick="window.resourceManager.showAddModal()">
                    <span class="material-icons">add</span> Add Resource
                </button>
            </div>
            
            <div class="filters-bar">
                <select id="roleFilter" onchange="window.resourceManager.applyFilters()">
                    <option value="">All Roles</option>
                    <option value="Developer">Developer</option>
                    <option value="Designer">Designer</option>
                    <option value="Manager">Manager</option>
                </select>
                <select id="statusFilter" onchange="window.resourceManager.applyFilters()">
                    <option value="">All Statuses</option>
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                </select>
                <input type="text" placeholder="Search resources..." id="resourceSearch" onkeyup="window.resourceManager.applyFilters()">
            </div>

            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Skills</th>
                            <th>Status.</th>
                            <th>Utilization</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="resourcesTableBody">
                        <tr><td colspan="6" class="loading-cell">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        await this.loadResources();
    }

    async loadResources() {
        try {
            const response = await authManager.apiRequest('/api/resources');
            this.resources = await response.json();
            this.renderTable(this.resources);
        } catch (error) {
            console.error('Error loading resources:', error);
        }
    }

    renderTable(resources) {
        const tbody = document.getElementById('resourcesTableBody');
        if (!tbody) return;

        if (resources.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No resources found</td></tr>';
            return;
        }

        tbody.innerHTML = resources.map(r => `
            <tr>
                <td>
                    <div class="resource-cell">
                        <div class="avatar-small">${r.name.charAt(0)}</div>
                        <div>
                            <div class="name">${r.name}</div>
                            <div class="email">${r.email}</div>
                        </div>
                    </div>
                </td>
                <td>${r.role}</td>
                <td>
                    <div class="skills-tags">
                        ${r.skills.split(',').slice(0, 3).map(s => `<span class="tag">${s.trim()}</span>`).join('')}
                        ${r.skills.split(',').length > 3 ? `<span class="tag">+${r.skills.split(',').length - 3}</span>` : ''}
                    </div>
                </td>
                <td>
                    <span class="status-badge ${r.status}">${r.status}</span>
                </td>
                <td>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${r.current_utilization}%"></div>
                    </div>
                    <div class="progress-text">${r.current_utilization}%</div>
                </td>
                <td>
                    <button class="btn-icon" onclick="window.resourceManager.editResource('${r.id}')"><span class="material-icons">edit</span></button>
                    <button class="btn-icon delete" onclick="window.resourceManager.deleteResource('${r.id}')"><span class="material-icons">delete</span></button>
                </td>
            </tr>
        `).join('');
    }

    applyFilters() {
        const role = document.getElementById('roleFilter').value.toLowerCase();
        const status = document.getElementById('statusFilter').value.toLowerCase();
        const search = document.getElementById('resourceSearch').value.toLowerCase();

        const filtered = this.resources.filter(r => {
            const matchRole = !role || r.role.toLowerCase().includes(role);
            const matchStatus = !status || r.status.toLowerCase() === status;
            const matchSearch = !search ||
                r.name.toLowerCase().includes(search) ||
                r.email.toLowerCase().includes(search) ||
                r.skills.toLowerCase().includes(search);
            return matchRole && matchStatus && matchSearch;
        });

        this.renderTable(filtered);
    }

    showAddModal() {
        // Implementation for showing add modal
        alert('Add Resource Modal would open here');
    }

    deleteResource(id) {
        if (confirm('Are you sure you want to delete this resource?')) {
            // Implementation
        }
    }

    editResource(id) {
        alert('Edit resource ' + id);
    }
}

window.resourceManager = new ResourceManager();
