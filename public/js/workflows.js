class WorkflowManager {
    async render() {
        const container = document.getElementById('pageContent');
        container.innerHTML = `
            <div class="view-header">
                <h2>Resource Requests & Workflows</h2>
                <div class="actions">
                    <button class="btn-primary" onclick="window.workflowManager.showRequestModal()">
                        <span class="material-icons">add</span> New Request
                    </button>
                </div>
            </div>

            <div class="dashboard-grid">
                <div class="list-card wide">
                    <div class="card-header">
                        <h3>Pending Requests</h3>
                        <div class="filters">
                            <span class="badge warning" id="pendingCount">0 Pending</span>
                        </div>
                    </div>
                    <div class="list-body" id="pendingRequestsList">
                        <div class="loading-spinner"></div>
                    </div>
                </div>

                <div class="list-card">
                    <div class="card-header">
                        <h3>My Requests</h3>
                    </div>
                    <div class="list-body" id="myRequestsList">
                        <!-- My requests loaded here -->
                    </div>
                </div>
            </div>
        `;

        await this.loadPendingRequests();
    }

    async loadPendingRequests() {
        const container = document.getElementById('pendingRequestsList');

        try {
            // Only managers/admins can see all pending requests
            if (!authManager.hasRole('manager', 'admin')) {
                container.innerHTML = '<div class="empty-state">You do not have permission to view all requests</div>';
                return;
            }

            const res = await authManager.apiRequest('/api/workflow/requests/pending');
            const requests = await res.json();

            document.getElementById('pendingCount').textContent = `${requests.length} Pending`;

            if (requests.length === 0) {
                container.innerHTML = '<div class="empty-state">No pending requests</div>';
                return;
            }

            container.innerHTML = requests.map(req => `
                <div class="request-item priority-${req.priority}">
                    <div class="req-header">
                        <h4>Request #${req.id.split('-')[1]}</h4>
                        <span class="badge ${req.priority}">${req.priority.toUpperCase()}</span>
                    </div>
                    <div class="req-details">
                        <div class="req-info">
                            <strong>Project:</strong> ${req.project_id} <br>
                            <strong>For:</strong> ${req.required_skills} (${req.required_count})
                        </div>
                        <div class="req-meta">
                            Submitted: ${new Date(req.created_at).toLocaleDateString()}
                        </div>
                    </div>
                    ${req.justification ? `<div class="req-justification">"${req.justification}"</div>` : ''}
                    <div class="req-actions">
                        <button class="btn-success small" onclick="window.workflowManager.approveRequest('${req.id}')">Approve</button>
                        <button class="btn-danger small" onclick="window.workflowManager.rejectRequest('${req.id}')">Reject</button>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            container.innerHTML = `<div class="error">Failed to load requests: ${error.message}</div>`;
        }
    }

    async approveRequest(id) {
        const comments = prompt('Approval Comments (optional):');
        if (comments === null) return;

        try {
            await authManager.apiRequest(`/api/workflow/requests/${id}/approve`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comments })
            });
            app.showNotification({ message: 'Request approved', type: 'success' });
            this.loadPendingRequests();
        } catch (error) {
            app.showNotification({ message: 'Action failed', type: 'error' });
        }
    }

    async rejectRequest(id) {
        const reason = prompt('Rejection Reason (required):');
        if (!reason) return;

        try {
            await authManager.apiRequest(`/api/workflow/requests/${id}/reject`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });
            app.showNotification({ message: 'Request rejected', type: 'success' });
            this.loadPendingRequests();
        } catch (error) {
            app.showNotification({ message: 'Action failed', type: 'error' });
        }
    }

    showRequestModal() {
        // Modal implementation logic
        alert('Request Modal');
    }
}

window.workflowManager = new WorkflowManager();
