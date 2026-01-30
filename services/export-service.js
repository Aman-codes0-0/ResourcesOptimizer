const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

class ExportService {
    constructor(database) {
        this.db = database;
        this.exportDir = path.join(__dirname, '..', 'exports');

        // Create exports directory if it doesn't exist
        if (!fs.existsSync(this.exportDir)) {
            fs.mkdirSync(this.exportDir, { recursive: true });
        }
    }

    /**
     * Generate PDF report
     */
    async generatePDFReport(reportType, options = {}) {
        const doc = new PDFDocument({ margin: 50 });
        const filename = `${reportType}_${Date.now()}.pdf`;
        const filepath = path.join(this.exportDir, filename);
        const stream = fs.createWriteStream(filepath);

        doc.pipe(stream);

        // Add header
        this.addPDFHeader(doc, reportType);

        // Add content based on report type
        switch (reportType) {
            case 'executive':
                await this.addExecutiveSummary(doc);
                break;
            case 'utilization':
                await this.addUtilizationReport(doc);
                break;
            case 'projects':
                await this.addProjectsReport(doc);
                break;
            case 'skills':
                await this.addSkillsReport(doc);
                break;
            default:
                doc.text('Report type not implemented');
        }

        // Add footer
        this.addPDFFooter(doc);

        doc.end();

        return new Promise((resolve) => {
            stream.on('finish', () => resolve(filename));
        });
    }

    /**
     * Add PDF header
     */
    addPDFHeader(doc, reportType) {
        doc.fontSize(24).text('TeamOptimizer', { align: 'center' });
        doc.fontSize(16).text(this.formatReportTitle(reportType), { align: 'center' });
        doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(2);
    }

    /**
     * Add PDF footer
     */
    addPDFFooter(doc) {
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            doc.fontSize(8).text(
                `Page ${i + 1} of ${pages.count}`,
                50,
                doc.page.height - 50,
                { align: 'center' }
            );
        }
    }

    /**
     * Add executive summary to PDF
     */
    async addExecutiveSummary(doc) {
        const resources = this.db.getAllResources();
        const projects = this.db.getAllProjects();
        const allocations = this.db.getAllAllocations();

        doc.fontSize(14).text('Executive Summary', { underline: true });
        doc.moveDown();

        // Key metrics
        const totalResources = resources.length;
        const benchResources = resources.filter(r => r.status === 'available').length;
        const avgUtilization = resources.reduce((sum, r) => sum + r.current_utilization, 0) / totalResources;
        const activeProjects = projects.filter(p => p.status === 'active').length;

        doc.fontSize(12).text(`Total Resources: ${totalResources}`);
        doc.text(`Resources on Bench: ${benchResources}`);
        doc.text(`Average Utilization: ${avgUtilization.toFixed(1)}%`);
        doc.text(`Active Projects: ${activeProjects}`);
        doc.text(`Total Allocations: ${allocations.length}`);
        doc.moveDown();

        // Top performers
        doc.fontSize(14).text('Top Performers', { underline: true });
        doc.moveDown();
        const topPerformers = resources
            .filter(r => r.current_utilization > 0)
            .sort((a, b) => b.current_utilization - a.current_utilization)
            .slice(0, 5);

        topPerformers.forEach((resource, index) => {
            doc.fontSize(10).text(`${index + 1}. ${resource.name} - ${resource.current_utilization}% utilization`);
        });
    }

    /**
     * Add utilization report to PDF
     */
    async addUtilizationReport(doc) {
        const resources = this.db.getAllResources();

        doc.fontSize(14).text('Resource Utilization Report', { underline: true });
        doc.moveDown();

        // Group by utilization ranges
        const ranges = {
            'Overutilized (>90%)': resources.filter(r => r.current_utilization > 90),
            'Well Utilized (70-90%)': resources.filter(r => r.current_utilization >= 70 && r.current_utilization <= 90),
            'Underutilized (30-70%)': resources.filter(r => r.current_utilization >= 30 && r.current_utilization < 70),
            'On Bench (<30%)': resources.filter(r => r.current_utilization < 30)
        };

        Object.entries(ranges).forEach(([range, resourceList]) => {
            doc.fontSize(12).text(`${range}: ${resourceList.length} resources`, { underline: true });
            doc.moveDown(0.5);

            resourceList.forEach(resource => {
                doc.fontSize(10).text(`  • ${resource.name} (${resource.role}) - ${resource.current_utilization}%`);
            });
            doc.moveDown();
        });
    }

    /**
     * Add projects report to PDF
     */
    async addProjectsReport(doc) {
        const projects = this.db.getAllProjects();

        doc.fontSize(14).text('Projects Report', { underline: true });
        doc.moveDown();

        // Group by status
        const statuses = ['active', 'planning', 'completed', 'on-hold'];

        statuses.forEach(status => {
            const statusProjects = projects.filter(p => p.status === status);
            if (statusProjects.length > 0) {
                doc.fontSize(12).text(`${status.toUpperCase()}: ${statusProjects.length} projects`, { underline: true });
                doc.moveDown(0.5);

                statusProjects.forEach(project => {
                    doc.fontSize(10).text(`  • ${project.name}`);
                    doc.fontSize(9).text(`    Priority: ${project.priority} | Required: ${project.required_resources} resources`);
                    doc.text(`    Skills: ${project.required_skills}`);
                });
                doc.moveDown();
            }
        });
    }

    /**
     * Add skills report to PDF
     */
    async addSkillsReport(doc) {
        const resources = this.db.getAllResources();

        doc.fontSize(14).text('Skills Inventory Report', { underline: true });
        doc.moveDown();

        // Aggregate skills
        const skillsMap = new Map();

        resources.forEach(resource => {
            const skills = resource.skills.split(',').map(s => s.trim());
            skills.forEach(skill => {
                if (!skillsMap.has(skill)) {
                    skillsMap.set(skill, []);
                }
                skillsMap.get(skill).push(resource.name);
            });
        });

        // Sort by count
        const sortedSkills = Array.from(skillsMap.entries())
            .sort((a, b) => b[1].length - a[1].length);

        doc.fontSize(12).text(`Total Unique Skills: ${sortedSkills.length}`);
        doc.moveDown();

        sortedSkills.forEach(([skill, resourceNames]) => {
            doc.fontSize(10).text(`${skill}: ${resourceNames.length} resources`);
        });
    }

    /**
     * Generate Excel export
     */
    async generateExcelExport(dataType, filters = {}) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(dataType);

        // Get data
        let data;
        switch (dataType) {
            case 'resources':
                data = this.db.getAllResources();
                break;
            case 'projects':
                data = this.db.getAllProjects();
                break;
            case 'allocations':
                data = this.db.getAllAllocations();
                break;
            default:
                throw new Error('Invalid data type');
        }

        if (data.length === 0) {
            throw new Error('No data to export');
        }

        // Add headers with styling
        const headers = Object.keys(data[0]);
        worksheet.addRow(headers);
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };

        // Add data rows
        data.forEach(row => {
            worksheet.addRow(Object.values(row));
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, cell => {
                const length = cell.value ? cell.value.toString().length : 10;
                if (length > maxLength) {
                    maxLength = length;
                }
            });
            column.width = Math.min(maxLength + 2, 50);
        });

        // Add filters
        worksheet.autoFilter = {
            from: 'A1',
            to: `${String.fromCharCode(65 + headers.length - 1)}1`
        };

        // Save file
        const filename = `${dataType}_export_${Date.now()}.xlsx`;
        const filepath = path.join(this.exportDir, filename);
        await workbook.xlsx.writeFile(filepath);

        return filename;
    }

    /**
     * Generate CSV export
     */
    async generateCSVExport(dataType, filters = {}) {
        let data;
        switch (dataType) {
            case 'resources':
                data = this.db.getAllResources();
                break;
            case 'projects':
                data = this.db.getAllProjects();
                break;
            case 'allocations':
                data = this.db.getAllAllocations();
                break;
            default:
                throw new Error('Invalid data type');
        }

        if (data.length === 0) {
            throw new Error('No data to export');
        }

        // Create CSV content
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];

        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                // Escape commas and quotes
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csvRows.push(values.join(','));
        });

        const csvContent = csvRows.join('\n');

        // Save file
        const filename = `${dataType}_export_${Date.now()}.csv`;
        const filepath = path.join(this.exportDir, filename);
        fs.writeFileSync(filepath, csvContent);

        return filename;
    }

    /**
     * Get export file path
     */
    getExportPath(filename) {
        return path.join(this.exportDir, filename);
    }

    /**
     * Delete export file
     */
    deleteExport(filename) {
        const filepath = path.join(this.exportDir, filename);
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            return true;
        }
        return false;
    }

    /**
     * List all exports
     */
    listExports() {
        if (!fs.existsSync(this.exportDir)) {
            return [];
        }

        return fs.readdirSync(this.exportDir).map(filename => {
            const filepath = path.join(this.exportDir, filename);
            const stats = fs.statSync(filepath);
            return {
                filename,
                size: stats.size,
                created: stats.birthtime,
                type: path.extname(filename).substring(1)
            };
        });
    }

    /**
     * Helper methods
     */
    formatReportTitle(reportType) {
        const titles = {
            executive: 'Executive Summary Report',
            utilization: 'Resource Utilization Report',
            projects: 'Projects Status Report',
            skills: 'Skills Inventory Report'
        };
        return titles[reportType] || 'Report';
    }
}

module.exports = ExportService;
