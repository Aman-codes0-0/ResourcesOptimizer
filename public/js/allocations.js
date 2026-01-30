class AllocationManager {
    async render() {
        const container = document.getElementById('pageContent');
        container.innerHTML = `
            <div class="view-header">
                <h2>Resource Allocations</h2>
                <div class="actions">
                    <button class="btn-secondary" onclick="window.allocationManager.autoOptimize()">
                        <span class="material-icons">auto_fix_high</span> Auto Optimize
                    </button>
                    <button class="btn-primary" onclick="window.allocationManager.showAllocateModal()">
                        <span class="material-icons">add</span> New Allocation
                    </button>
                </div>
            </div>

            <div class="allocation-grid" id="allocationContainer">
                <!-- Timeline or List view -->
                <div class="loading-spinner"></div>
            </div>
        `;

        await this.loadAllocations();
    }

    async loadAllocations() {
        try {
            const [allocationsRes, projectsRes, resourcesRes] = await Promise.all([
                authManager.apiRequest('/api/allocations'),
                authManager.apiRequest('/api/projects'),
                authManager.apiRequest('/api/resources')
            ]);

            this.allocations = await allocationsRes.json();
            this.projects = await projectsRes.json();
            this.resources = await resourcesRes.json();

            this.renderAllocations();
        } catch (error) {
            console.error('Error loading allocations:', error);
        }
    }

    renderAllocations() {
        const container = document.getElementById('allocationContainer');
        if (!container) return;

        // Group by Project
        const grouped = {};
        this.projects.forEach(p => {
            grouped[p.id] = {
                project: p,
                allocations: this.allocations.filter(a => a.project_id === p.id)
            };
        });

        const html = Object.values(grouped).map(group => {
            if (!group.project) return '';

            return `
                <div class="allocation-card">
                    <div class="card-header">
                        <h3>${group.project.name}</h3>
                        <div class="date-range">
                            ${new Date(group.project.start_date).toLocaleDateString()} - 
                            ${group.project.end_date ? new Date(group.project.end_date).toLocaleDateString() : 'Ongoing'}
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="allocation-list">
                            ${group.allocations.length > 0 ? group.allocations.map(a => {
                const resource = this.resources.find(r => r.id === a.resource_id);
                return resource ? `
                                    <div class="allocation-item">
                                        <div class="resource-info">
                                            <div class="avatar-tiny">${resource.name.charAt(0)}</div>
                                            <span>${resource.name}</span>
                                        </div>
                                        <div class="allocation-bar-container">
                                            <div class="allocation-bar" style="width: ${a.allocation_percentage}%"></div>
                                        </div>
                                        <span class="percentage">${a.allocation_percentage}%</span>
                                        <button class="btn-icon small" onclick="window.allocationManager.deallocate('${a.id}')">&times;</button>
                                    </div>
                                ` : '';
            }).join('') : '<div class="empty-text">No resources allocated</div>'}
                        </div>
                    </div>
                    <div class="card-footer">
                        <button class="btn-text" onclick="window.allocationManager.recommendResources('${group.project.id}')">
                            Recommended Resources
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html || '<div class="empty-state">No allocations found</div>';
    }

    async autoOptimize() {
        if (!confirm('This will automatically allocate resources to optimize utilization. Continue?')) return;

        try {
            const res = await authManager.apiRequest('/api/allocations/optimize-all', { method: 'POST' });
            const result = await res.json();
            app.showNotification({ message: `Optimization complete. ${result.allocations?.length || 0} allocations created.`, type: 'success' });
            this.loadAllocations();
        } catch (error) {
            app.showNotification({ message: 'Optimization failed', type: 'error' });
        }
    }

    async deallocate(id) {
        if (!confirm('Remove this allocation?')) return;

        try {
            await authManager.apiRequest(`/api/allocations/${id}`, { method: 'DELETE' });
            this.loadAllocations();
            app.showNotification({ message: 'Allocation removed', type: 'success' });
        } catch (error) {
            console.error(error);
        }
    }

    showAllocateModal() {
        // Modal implementation
        alert('Allocation Modal');
    }

    async recommendResources(projectId) {
        // Call AI recommendation endpoint
        try {
            const res = await authManager.apiRequest(`/api/ai/recommendations/${projectId}`);
            const recommendations = await res.json();
            console.log(recommendations);
            alert(`Found ${recommendations.length} recommended resources. Check console.`);
            // In a real app, show a modal with these recommendations
        } catch (error) {
            console.error(error);
        }
    }
}

window.allocationManager = new AllocationManager();
