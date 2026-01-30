class SettingsManager {
    async render() {
        const container = document.getElementById('pageContent');
        container.innerHTML = `
            <div class="view-header">
                <h2>System Settings</h2>
            </div>

            <div class="settings-container">
                <div class="settings-nav">
                    <button class="settings-tab active" onclick="window.settingsManager.switchTab('profile')">Profile</button>
                    <button class="settings-tab" onclick="window.settingsManager.switchTab('notifications')">Notifications</button>
                    <button class="settings-tab" onclick="window.settingsManager.switchTab('integrations')">Integrations</button>
                    <button class="settings-tab" onclick="window.settingsManager.switchTab('users')">Users & Roles</button>
                    <button class="settings-tab" onclick="window.settingsManager.switchTab('system')">System</button>
                </div>

                <div class="settings-content">
                    <div id="profileTab" class="tab-pane active">
                        <h3>Profile Settings</h3>
                        <form id="profileForm" onsubmit="window.settingsManager.saveProfile(event)">
                            <div class="form-group">
                                <label>Full Name</label>
                                <input type="text" id="profileName" value="${app.user.full_name}">
                            </div>
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" id="profileEmail" value="${app.user.email}" disabled>
                            </div>
                            <div class="form-group">
                                <label>New Password</label>
                                <input type="password" id="profilePassword" placeholder="Leave empty to keep current">
                            </div>
                            <button type="submit" class="btn-primary">Save Changes</button>
                        </form>
                    </div>

                    <div id="notificationsTab" class="tab-pane">
                        <h3>Notification Preferences</h3>
                        <div class="form-group checkbox">
                            <label><input type="checkbox" checked> Email Notifications</label>
                        </div>
                        <div class="form-group checkbox">
                            <label><input type="checkbox" checked> Browser Notifications</label>
                        </div>
                        <div class="form-group checkbox">
                            <label><input type="checkbox"> Slack Notifications</label>
                        </div>
                        <h4>Alert Rules</h4>
                        <div class="alert-rules" id="alertRulesList">
                            <!-- Rules loaded here -->
                        </div>
                    </div>

                    <div id="integrationsTab" class="tab-pane">
                        <h3>Integration Hub</h3>
                        <div class="dashboard-grid">
                            <div class="list-card">
                                <div class="card-header">
                                    <div class="flex-row">
                                        <span class="material-icons">bug_report</span>
                                        <h4>JIRA</h4>
                                    </div>
                                    <button class="btn-text">Connect</button>
                                </div>
                                <p>Sync projects and issues from JIRA.</p>
                            </div>
                            <div class="list-card">
                                <div class="card-header">
                                    <div class="flex-row">
                                        <span class="material-icons">chat</span>
                                        <h4>Slack</h4>
                                    </div>
                                    <button class="btn-text">Connect</button>
                                </div>
                                <p>Send alerts and reports to Slack channels.</p>
                            </div>
                            <div class="list-card">
                                <div class="card-header">
                                    <div class="flex-row">
                                        <span class="material-icons">calendar_today</span>
                                        <h4>Google Calendar</h4>
                                    </div>
                                    <button class="btn-text">Connect</button>
                                </div>
                                <p>Sync project timelines and resource availability.</p>
                            </div>
                        </div>
                    </div>

                    <div id="usersTab" class="tab-pane">
                        <div class="flex-between">
                            <h3>User Management</h3>
                            <button class="btn-secondary small">Add User</button>
                        </div>
                        <div id="usersList" class="mt-4">
                            <div class="loading-spinner"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (authManager.hasRole('admin')) {
            this.loadUsers();
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        event.target.classList.add('active');
        document.getElementById(tabName + 'Tab').classList.add('active');
    }

    async saveProfile(event) {
        event.preventDefault();
        const fullName = document.getElementById('profileName').value;
        const password = document.getElementById('profilePassword').value;

        const updates = { full_name: fullName };
        if (password) updates.password = password;

        try {
            await authManager.apiRequest(`/api/users/${app.user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            // Update local user data
            app.user.full_name = fullName;
            app.updateUserProfile();

            app.showNotification({ message: 'Profile updated', type: 'success' });
        } catch (error) {
            app.showNotification({ message: 'Update failed', type: 'error' });
        }
    }

    async loadUsers() {
        const container = document.getElementById('usersList');
        try {
            const res = await authManager.apiRequest('/api/users');
            const users = await res.json();

            container.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(u => `
                            <tr>
                                <td>${u.username}</td>
                                <td>${u.email}</td>
                                <td><span class="badge ${u.role}">${u.role}</span></td>
                                <td>${u.is_active ? 'Active' : 'Inactive'}</td>
                                <td>
                                    <button class="btn-icon small"><span class="material-icons">edit</span></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (error) {
            container.innerHTML = '<div class="error">Failed to load users (Admin only)</div>';
        }
    }
}

window.settingsManager = new SettingsManager();
