const notificationService = require('./notification-service');

class AlertEngine {
    constructor(database) {
        this.db = database;
        this.alertRules = {
            benchCritical: 30,      // Days on bench before critical alert
            benchHigh: 14,          // Days on bench before high alert
            benchMedium: 7,         // Days on bench before medium alert
            overutilization: 90,    // Utilization percentage threshold
            underutilization: 30,   // Utilization percentage threshold
            deadlineWarning: 7,     // Days before deadline to send warning
            certificationExpiry: 30 // Days before certification expiry
        };
    }

    /**
     * Check all resources for bench alerts
     */
    async checkBenchAlerts() {
        const benchResources = this.db.getBenchResources();
        const alerts = [];

        for (const resource of benchResources) {
            if (!resource.bench_since) continue;

            const daysOnBench = this.calculateDaysOnBench(resource.bench_since);

            // Send alert if exceeds thresholds
            if (daysOnBench >= this.alertRules.benchMedium) {
                const urgency = this.getBenchUrgency(daysOnBench);

                // Create notification in database
                const notification = {
                    id: `notif-bench-${resource.id}-${Date.now()}`,
                    type: 'bench_alert',
                    title: `${urgency} Bench Alert: ${resource.name}`,
                    message: `${resource.name} has been on bench for ${daysOnBench} days`,
                    priority: urgency.toLowerCase()
                };

                this.db.createNotification(notification);

                // Send external notifications
                await notificationService.sendBenchAlert(resource, daysOnBench);

                alerts.push({
                    resource: resource.name,
                    daysOnBench,
                    urgency
                });
            }
        }

        return alerts;
    }

    /**
     * Check all resources for utilization alerts
     */
    async checkUtilizationAlerts() {
        const resources = this.db.getAllResources();
        const alerts = [];

        for (const resource of resources) {
            const utilization = resource.current_utilization;

            // Overutilization alert
            if (utilization >= this.alertRules.overutilization) {
                const notification = {
                    id: `notif-overutil-${resource.id}-${Date.now()}`,
                    type: 'overutilization',
                    title: `Overutilization Alert: ${resource.name}`,
                    message: `${resource.name} is at ${utilization}% utilization`,
                    priority: 'high'
                };

                this.db.createNotification(notification);
                await notificationService.sendOverutilizationAlert(resource, utilization);

                alerts.push({
                    resource: resource.name,
                    utilization,
                    type: 'overutilized'
                });
            }

            // Underutilization alert (but not on bench)
            if (utilization > 0 && utilization < this.alertRules.underutilization) {
                const notification = {
                    id: `notif-underutil-${resource.id}-${Date.now()}`,
                    type: 'underutilization',
                    title: `Underutilization: ${resource.name}`,
                    message: `${resource.name} is only at ${utilization}% utilization`,
                    priority: 'medium'
                };

                this.db.createNotification(notification);

                alerts.push({
                    resource: resource.name,
                    utilization,
                    type: 'underutilized'
                });
            }
        }

        return alerts;
    }

    /**
     * Check all projects for deadline alerts
     */
    async checkDeadlineAlerts() {
        const projects = this.db.getAllProjects();
        const alerts = [];

        for (const project of projects) {
            if (!project.end_date || project.status === 'completed') continue;

            const daysRemaining = this.calculateDaysUntilDeadline(project.end_date);

            if (daysRemaining <= this.alertRules.deadlineWarning && daysRemaining > 0) {
                const notification = {
                    id: `notif-deadline-${project.id}-${Date.now()}`,
                    type: 'deadline_warning',
                    title: `Deadline Approaching: ${project.name}`,
                    message: `${project.name} has ${daysRemaining} days until deadline`,
                    priority: daysRemaining <= 3 ? 'high' : 'medium'
                };

                this.db.createNotification(notification);
                await notificationService.sendDeadlineAlert(project, daysRemaining);

                alerts.push({
                    project: project.name,
                    daysRemaining
                });
            }

            // Overdue projects
            if (daysRemaining < 0) {
                const notification = {
                    id: `notif-overdue-${project.id}-${Date.now()}`,
                    type: 'project_overdue',
                    title: `Project Overdue: ${project.name}`,
                    message: `${project.name} is ${Math.abs(daysRemaining)} days overdue`,
                    priority: 'critical'
                };

                this.db.createNotification(notification);

                alerts.push({
                    project: project.name,
                    daysOverdue: Math.abs(daysRemaining)
                });
            }
        }

        return alerts;
    }

    /**
     * Check for skill gaps in projects
     */
    async checkSkillGaps() {
        const projects = this.db.getAllProjects();
        const resources = this.db.getAllResources();
        const alerts = [];

        // Build available skills set
        const availableSkills = new Set();
        resources.forEach(resource => {
            const skills = resource.skills.split(',').map(s => s.trim().toLowerCase());
            skills.forEach(skill => availableSkills.add(skill));
        });

        for (const project of projects) {
            if (project.status === 'completed') continue;

            const requiredSkills = project.required_skills.split(',').map(s => s.trim().toLowerCase());
            const missingSkills = requiredSkills.filter(skill => !availableSkills.has(skill));

            if (missingSkills.length > 0) {
                const notification = {
                    id: `notif-skillgap-${project.id}-${Date.now()}`,
                    type: 'skill_gap',
                    title: `Skill Gap: ${project.name}`,
                    message: `Missing skills: ${missingSkills.join(', ')}`,
                    priority: 'high'
                };

                this.db.createNotification(notification);
                await notificationService.sendSkillGapAlert(project, missingSkills);

                alerts.push({
                    project: project.name,
                    missingSkills
                });
            }
        }

        return alerts;
    }

    /**
     * Check for expiring certifications
     */
    async checkCertificationExpiry() {
        const resources = this.db.getAllResources();
        const alerts = [];

        for (const resource of resources) {
            const certifications = this.db.getCertificationsByResourceId(resource.id);

            for (const cert of certifications) {
                if (!cert.expiry_date || cert.status !== 'active') continue;

                const daysUntilExpiry = this.calculateDaysUntilDeadline(cert.expiry_date);

                if (daysUntilExpiry <= this.alertRules.certificationExpiry && daysUntilExpiry > 0) {
                    const notification = {
                        id: `notif-certexp-${cert.id}-${Date.now()}`,
                        type: 'certification_expiry',
                        title: `Certification Expiring: ${cert.certification_name}`,
                        message: `${resource.name}'s ${cert.certification_name} expires in ${daysUntilExpiry} days`,
                        priority: daysUntilExpiry <= 7 ? 'high' : 'medium'
                    };

                    this.db.createNotification(notification);

                    alerts.push({
                        resource: resource.name,
                        certification: cert.certification_name,
                        daysUntilExpiry
                    });
                }

                // Expired certifications
                if (daysUntilExpiry < 0) {
                    const notification = {
                        id: `notif-certexpired-${cert.id}-${Date.now()}`,
                        type: 'certification_expired',
                        title: `Certification Expired: ${cert.certification_name}`,
                        message: `${resource.name}'s ${cert.certification_name} has expired`,
                        priority: 'high'
                    };

                    this.db.createNotification(notification);

                    // Update certification status
                    this.db.updateCertification(cert.id, { status: 'expired' });

                    alerts.push({
                        resource: resource.name,
                        certification: cert.certification_name,
                        status: 'expired'
                    });
                }
            }
        }

        return alerts;
    }

    /**
     * Run all alert checks
     */
    async runAllChecks() {
        console.log('Running alert engine checks...');

        const results = {
            benchAlerts: await this.checkBenchAlerts(),
            utilizationAlerts: await this.checkUtilizationAlerts(),
            deadlineAlerts: await this.checkDeadlineAlerts(),
            skillGaps: await this.checkSkillGaps(),
            certificationAlerts: await this.checkCertificationExpiry(),
            timestamp: new Date().toISOString()
        };

        console.log('Alert engine checks completed:', {
            bench: results.benchAlerts.length,
            utilization: results.utilizationAlerts.length,
            deadlines: results.deadlineAlerts.length,
            skillGaps: results.skillGaps.length,
            certifications: results.certificationAlerts.length
        });

        return results;
    }

    /**
     * Calculate days on bench
     */
    calculateDaysOnBench(benchSince) {
        const benchDate = new Date(benchSince);
        const now = new Date();
        const diffTime = Math.abs(now - benchDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Calculate days until deadline
     */
    calculateDaysUntilDeadline(deadline) {
        const deadlineDate = new Date(deadline);
        const now = new Date();
        const diffTime = deadlineDate - now;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Get bench urgency level
     */
    getBenchUrgency(daysOnBench) {
        if (daysOnBench >= this.alertRules.benchCritical) return 'CRITICAL';
        if (daysOnBench >= this.alertRules.benchHigh) return 'HIGH';
        if (daysOnBench >= this.alertRules.benchMedium) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * Update alert rules
     */
    updateAlertRules(newRules) {
        this.alertRules = { ...this.alertRules, ...newRules };
        return this.alertRules;
    }

    /**
     * Get current alert rules
     */
    getAlertRules() {
        return this.alertRules;
    }
}

module.exports = AlertEngine;
