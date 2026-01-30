class WorkflowEngine {
    constructor(database) {
        this.db = database;
        this.slaThresholds = {
            high: 24,      // hours
            medium: 48,
            low: 72
        };
    }

    /**
     * Submit resource request
     */
    async submitRequest(requestData) {
        const request = {
            id: `req-${Date.now()}`,
            project_id: requestData.project_id,
            requested_by: requestData.requested_by,
            required_skills: requestData.required_skills,
            required_count: requestData.required_count || 1,
            allocation_percentage: requestData.allocation_percentage || 100,
            priority: requestData.priority || 'medium',
            status: 'pending',
            justification: requestData.justification || '',
            created_at: new Date().toISOString()
        };

        // Save to database
        const stmt = this.db.db.prepare(`
            INSERT INTO resource_requests (id, project_id, requested_by, required_skills, required_count, allocation_percentage, priority, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run([
            request.id, request.project_id, request.requested_by, request.required_skills,
            request.required_count, request.allocation_percentage, request.priority,
            request.status, request.created_at
        ]);
        stmt.free();
        this.db.save();

        // Create notification for approvers
        this.db.createNotification({
            id: `notif-req-${Date.now()}`,
            type: 'resource_request',
            title: 'New Resource Request',
            message: `Resource request for ${request.required_count} resources with skills: ${request.required_skills}`,
            priority: request.priority
        });

        return request;
    }

    /**
     * Approve request
     */
    async approveRequest(requestId, approverId, comments = '') {
        const stmt = this.db.db.prepare(`
            UPDATE resource_requests 
            SET status = 'approved', approved_by = ?, approved_at = ?, approval_comments = ?
            WHERE id = ?
        `);
        stmt.run([approverId, new Date().toISOString(), comments, requestId]);
        stmt.free();
        this.db.save();

        // Notify requester
        const request = this.getRequestById(requestId);
        this.db.createNotification({
            id: `notif-approved-${Date.now()}`,
            user_id: request.requested_by,
            type: 'request_approved',
            title: 'Resource Request Approved',
            message: `Your resource request has been approved${comments ? ': ' + comments : ''}`,
            priority: 'medium'
        });

        return { success: true };
    }

    /**
     * Reject request
     */
    async rejectRequest(requestId, approverId, reason = '') {
        const stmt = this.db.db.prepare(`
            UPDATE resource_requests 
            SET status = 'rejected', approved_by = ?, approved_at = ?, approval_comments = ?
            WHERE id = ?
        `);
        stmt.run([approverId, new Date().toISOString(), reason, requestId]);
        stmt.free();
        this.db.save();

        // Notify requester
        const request = this.getRequestById(requestId);
        this.db.createNotification({
            id: `notif-rejected-${Date.now()}`,
            user_id: request.requested_by,
            type: 'request_rejected',
            title: 'Resource Request Rejected',
            message: `Your resource request was rejected${reason ? ': ' + reason : ''}`,
            priority: 'high'
        });

        return { success: true };
    }

    /**
     * Get request by ID
     */
    getRequestById(requestId) {
        const stmt = this.db.db.prepare('SELECT * FROM resource_requests WHERE id = ?');
        stmt.bind([requestId]);
        const result = [];
        while (stmt.step()) {
            result.push(stmt.getAsObject());
        }
        stmt.free();
        return result[0] || null;
    }

    /**
     * Get all pending requests
     */
    getPendingRequests() {
        const stmt = this.db.db.prepare('SELECT * FROM resource_requests WHERE status = ? ORDER BY created_at DESC');
        stmt.bind(['pending']);
        const result = [];
        while (stmt.step()) {
            result.push(stmt.getAsObject());
        }
        stmt.free();
        return result;
    }

    /**
     * Check SLA violations
     */
    checkSLAViolations() {
        const pendingRequests = this.getPendingRequests();
        const violations = [];

        pendingRequests.forEach(request => {
            const hoursElapsed = this.calculateHoursElapsed(request.created_at);
            const threshold = this.slaThresholds[request.priority];

            if (hoursElapsed > threshold) {
                violations.push({
                    requestId: request.id,
                    hoursElapsed,
                    threshold,
                    priority: request.priority
                });

                // Escalate
                this.escalateRequest(request);
            }
        });

        return violations;
    }

    /**
     * Escalate request
     */
    escalateRequest(request) {
        // Create high-priority notification
        this.db.createNotification({
            id: `notif-escalate-${Date.now()}`,
            type: 'request_escalated',
            title: 'SLA Violation: Resource Request Pending',
            message: `Resource request ${request.id} has exceeded SLA threshold`,
            priority: 'critical'
        });
    }

    /**
     * Calculate hours elapsed
     */
    calculateHoursElapsed(createdAt) {
        const created = new Date(createdAt);
        const now = new Date();
        return (now - created) / (1000 * 60 * 60);
    }
}

module.exports = WorkflowEngine;
