class ReportManager {
    render() {
        const container = document.getElementById('pageContent');
        container.innerHTML = `
            <div class="view-header">
                <h2>Reports Center</h2>
            </div>

            <div class="reports-grid">
                <!-- PDF Reports -->
                <div class="report-section">
                    <h3>Standard Reports (PDF)</h3>
                    <div class="report-cards">
                        <div class="report-card">
                            <div class="icon-box pdf">
                                <span class="material-icons">picture_as_pdf</span>
                            </div>
                            <h4>Executive Summary</h4>
                            <p>High-level overview of resources and projects.</p>
                            <button class="btn-secondary" onclick="window.reportManager.generatePDF('executive')">Generate PDF</button>
                        </div>
                        <div class="report-card">
                             <div class="icon-box pdf">
                                <span class="material-icons">picture_as_pdf</span>
                            </div>
                            <h4>Resource Utilization</h4>
                            <p>Detailed utilization metrics per resource.</p>
                            <button class="btn-secondary" onclick="window.reportManager.generatePDF('utilization')">Generate PDF</button>
                        </div>
                        <div class="report-card">
                             <div class="icon-box pdf">
                                <span class="material-icons">picture_as_pdf</span>
                            </div>
                            <h4>Project Status</h4>
                            <p>Current status and health of all projects.</p>
                            <button class="btn-secondary" onclick="window.reportManager.generatePDF('projects')">Generate PDF</button>
                        </div>
                        <div class="report-card">
                             <div class="icon-box pdf">
                                <span class="material-icons">picture_as_pdf</span>
                            </div>
                            <h4>Skills Inventory</h4>
                            <p>Breakdown of available skills across the org.</p>
                            <button class="btn-secondary" onclick="window.reportManager.generatePDF('skills')">Generate PDF</button>
                        </div>
                    </div>
                </div>

                <!-- Data Exports -->
                <div class="report-section">
                    <h3>Data Exports (Excel/CSV)</h3>
                    <div class="report-cards">
                        <div class="report-card">
                             <div class="icon-box excel">
                                <span class="material-icons">grid_on</span>
                            </div>
                            <h4>Resources Data</h4>
                            <div class="export-actions">
                                <button class="btn-text" onclick="window.reportManager.exportData('resources', 'excel')">Excel</button>
                                <span class="separator">|</span>
                                <button class="btn-text" onclick="window.reportManager.exportData('resources', 'csv')">CSV</button>
                            </div>
                        </div>
                        <div class="report-card">
                             <div class="icon-box excel">
                                <span class="material-icons">grid_on</span>
                            </div>
                            <h4>Projects Data</h4>
                            <div class="export-actions">
                                <button class="btn-text" onclick="window.reportManager.exportData('projects', 'excel')">Excel</button>
                                <span class="separator">|</span>
                                <button class="btn-text" onclick="window.reportManager.exportData('projects', 'csv')">CSV</button>
                            </div>
                        </div>
                         <div class="report-card">
                             <div class="icon-box excel">
                                <span class="material-icons">grid_on</span>
                            </div>
                            <h4>Allocations Data</h4>
                            <div class="export-actions">
                                <button class="btn-text" onclick="window.reportManager.exportData('allocations', 'excel')">Excel</button>
                                <span class="separator">|</span>
                                <button class="btn-text" onclick="window.reportManager.exportData('allocations', 'csv')">CSV</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async generatePDF(reportType) {
        try {
            app.showNotification({ message: 'Generating report...', type: 'info' });
            const res = await authManager.apiRequest('/api/export/pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reportType })
            });
            const data = await res.json();
            this.downloadFile(data.url);
            app.showNotification({ message: 'Report generated successfully', type: 'success' });
        } catch (error) {
            app.showNotification({ message: 'Failed to generate report', type: 'error' });
        }
    }

    async exportData(dataType, format) {
        try {
            app.showNotification({ message: `Exporting ${dataType}...`, type: 'info' });
            const endpoint = format === 'excel' ? '/api/export/excel' : '/api/export/csv';

            const res = await authManager.apiRequest(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dataType })
            });
            const data = await res.json();
            this.downloadFile(data.url);
            app.showNotification({ message: 'Export complete', type: 'success' });
        } catch (error) {
            app.showNotification({ message: 'Export failed', type: 'error' });
        }
    }

    downloadFile(url) {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

window.reportManager = new ReportManager();
