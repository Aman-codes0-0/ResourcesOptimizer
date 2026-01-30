const nodemailer = require('nodemailer');
const { WebClient } = require('@slack/web-api');
require('dotenv').config();

class NotificationService {
    constructor() {
        this.emailEnabled = process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true';
        this.slackEnabled = process.env.ENABLE_SLACK_NOTIFICATIONS === 'true';

        // Email transporter
        if (this.emailEnabled) {
            this.emailTransporter = nodemailer.createTransporter({
                host: process.env.EMAIL_HOST,
                port: parseInt(process.env.EMAIL_PORT || '587'),
                secure: process.env.EMAIL_SECURE === 'true',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                }
            });
        }

        // Slack client
        if (this.slackEnabled && process.env.SLACK_BOT_TOKEN) {
            this.slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
        }
    }

    /**
     * Send email notification
     * @param {object} options - Email options
     */
    async sendEmail(options) {
        if (!this.emailEnabled || !this.emailTransporter) {
            console.log('Email notifications are disabled');
            return { success: false, message: 'Email notifications disabled' };
        }

        try {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: options.to,
                subject: options.subject,
                html: options.html || options.text,
                text: options.text
            };

            const info = await this.emailTransporter.sendMail(mailOptions);
            console.log('Email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending email:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send Slack message
     * @param {object} options - Slack message options
     */
    async sendSlackMessage(options) {
        if (!this.slackEnabled || !this.slackClient) {
            console.log('Slack notifications are disabled');
            return { success: false, message: 'Slack notifications disabled' };
        }

        try {
            const result = await this.slackClient.chat.postMessage({
                channel: options.channel || '#general',
                text: options.text,
                blocks: options.blocks
            });

            console.log('Slack message sent:', result.ts);
            return { success: true, timestamp: result.ts };
        } catch (error) {
            console.error('Error sending Slack message:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send Slack webhook notification
     * @param {object} payload - Webhook payload
     */
    async sendSlackWebhook(payload) {
        if (!this.slackEnabled || !process.env.SLACK_WEBHOOK_URL) {
            console.log('Slack webhook notifications are disabled');
            return { success: false, message: 'Slack webhook disabled' };
        }

        try {
            const axios = require('axios');
            await axios.post(process.env.SLACK_WEBHOOK_URL, payload);
            console.log('Slack webhook sent');
            return { success: true };
        } catch (error) {
            console.error('Error sending Slack webhook:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send bench alert notification
     * @param {object} resource - Resource on bench
     * @param {number} daysOnBench - Days on bench
     */
    async sendBenchAlert(resource, daysOnBench) {
        const urgency = this.getBenchUrgency(daysOnBench);
        const subject = `[${urgency}] Resource on Bench: ${resource.name}`;
        const message = `
            <h2>Bench Alert - ${urgency} Priority</h2>
            <p><strong>${resource.name}</strong> has been on bench for <strong>${daysOnBench} days</strong>.</p>
            <p><strong>Role:</strong> ${resource.role}</p>
            <p><strong>Skills:</strong> ${resource.skills}</p>
            <p><strong>Action Required:</strong> Please allocate this resource to a project immediately.</p>
        `;

        // Send email
        await this.sendEmail({
            to: process.env.EMAIL_USER, // In production, send to managers
            subject,
            html: message
        });

        // Send Slack
        await this.sendSlackWebhook({
            text: `🚨 *${subject}*\n${resource.name} (${resource.role}) has been on bench for ${daysOnBench} days.\nSkills: ${resource.skills}`
        });

        return { success: true };
    }

    /**
     * Send project deadline alert
     * @param {object} project - Project approaching deadline
     * @param {number} daysRemaining - Days until deadline
     */
    async sendDeadlineAlert(project, daysRemaining) {
        const subject = `Project Deadline Alert: ${project.name}`;
        const message = `
            <h2>Project Deadline Approaching</h2>
            <p><strong>${project.name}</strong> has <strong>${daysRemaining} days</strong> remaining until deadline.</p>
            <p><strong>Priority:</strong> ${project.priority}</p>
            <p><strong>Status:</strong> ${project.status}</p>
            <p><strong>Required Skills:</strong> ${project.required_skills}</p>
        `;

        await this.sendEmail({
            to: process.env.EMAIL_USER,
            subject,
            html: message
        });

        await this.sendSlackWebhook({
            text: `⏰ *${subject}*\n${project.name} has ${daysRemaining} days until deadline.\nPriority: ${project.priority} | Status: ${project.status}`
        });

        return { success: true };
    }

    /**
     * Send overutilization alert
     * @param {object} resource - Overutilized resource
     * @param {number} utilization - Current utilization percentage
     */
    async sendOverutilizationAlert(resource, utilization) {
        const subject = `Overutilization Alert: ${resource.name}`;
        const message = `
            <h2>Resource Overutilization Detected</h2>
            <p><strong>${resource.name}</strong> is currently at <strong>${utilization}%</strong> utilization.</p>
            <p><strong>Role:</strong> ${resource.role}</p>
            <p><strong>Recommended Action:</strong> Consider redistributing workload to prevent burnout.</p>
        `;

        await this.sendEmail({
            to: process.env.EMAIL_USER,
            subject,
            html: message
        });

        await this.sendSlackWebhook({
            text: `⚠️ *${subject}*\n${resource.name} is at ${utilization}% utilization. Consider workload redistribution.`
        });

        return { success: true };
    }

    /**
     * Send skill gap alert
     * @param {object} project - Project with skill gap
     * @param {array} missingSkills - Missing skills
     */
    async sendSkillGapAlert(project, missingSkills) {
        const subject = `Skill Gap Alert: ${project.name}`;
        const message = `
            <h2>Skill Gap Detected</h2>
            <p>Project <strong>${project.name}</strong> requires skills that are not available in the current resource pool.</p>
            <p><strong>Missing Skills:</strong> ${missingSkills.join(', ')}</p>
            <p><strong>Recommended Action:</strong> Consider hiring or training resources in these skills.</p>
        `;

        await this.sendEmail({
            to: process.env.EMAIL_USER,
            subject,
            html: message
        });

        await this.sendSlackWebhook({
            text: `🔍 *${subject}*\nMissing skills: ${missingSkills.join(', ')}\nConsider hiring or training.`
        });

        return { success: true };
    }

    /**
     * Send welcome email to new user
     * @param {object} user - New user
     * @param {string} tempPassword - Temporary password
     */
    async sendWelcomeEmail(user, tempPassword) {
        const subject = 'Welcome to TeamOptimizer';
        const message = `
            <h2>Welcome to TeamOptimizer!</h2>
            <p>Hello <strong>${user.full_name}</strong>,</p>
            <p>Your account has been created successfully.</p>
            <p><strong>Username:</strong> ${user.username}</p>
            <p><strong>Temporary Password:</strong> ${tempPassword}</p>
            <p><strong>Role:</strong> ${user.role}</p>
            <p>Please log in and change your password immediately.</p>
            <p>Login URL: <a href="http://localhost:3000">http://localhost:3000</a></p>
        `;

        return await this.sendEmail({
            to: user.email,
            subject,
            html: message
        });
    }

    /**
     * Send password reset email
     * @param {object} user - User requesting reset
     * @param {string} resetToken - Reset token
     */
    async sendPasswordResetEmail(user, resetToken) {
        const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;
        const subject = 'Password Reset Request';
        const message = `
            <h2>Password Reset Request</h2>
            <p>Hello <strong>${user.full_name}</strong>,</p>
            <p>You requested a password reset. Click the link below to reset your password:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
        `;

        return await this.sendEmail({
            to: user.email,
            subject,
            html: message
        });
    }

    /**
     * Get bench urgency level
     * @param {number} daysOnBench - Days on bench
     * @returns {string} Urgency level
     */
    getBenchUrgency(daysOnBench) {
        if (daysOnBench >= 30) return 'CRITICAL';
        if (daysOnBench >= 14) return 'HIGH';
        if (daysOnBench >= 7) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * Test email configuration
     */
    async testEmailConnection() {
        if (!this.emailTransporter) {
            return { success: false, message: 'Email not configured' };
        }

        try {
            await this.emailTransporter.verify();
            return { success: true, message: 'Email connection successful' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

module.exports = new NotificationService();
