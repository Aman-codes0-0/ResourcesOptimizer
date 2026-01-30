const axios = require('axios');

class IntegrationHub {
    constructor(config = {}) {
        this.config = config;
        this.integrations = {
            jira: null,
            slack: null,
            googleCalendar: null
        };
    }

    /**
     * Initialize JIRA integration
     */
    initJira(jiraConfig) {
        this.integrations.jira = {
            baseUrl: jiraConfig.baseUrl,
            email: jiraConfig.email,
            apiToken: jiraConfig.apiToken,
            projectKey: jiraConfig.projectKey
        };
    }

    /**
     * Sync projects from JIRA
     */
    async syncJiraProjects() {
        if (!this.integrations.jira) {
            throw new Error('JIRA integration not configured');
        }

        const { baseUrl, email, apiToken, projectKey } = this.integrations.jira;
        const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

        try {
            const response = await axios.get(
                `${baseUrl}/rest/api/3/search?jql=project=${projectKey}`,
                {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const issues = response.data.issues || [];
            const projects = issues.map(issue => ({
                externalId: issue.key,
                name: issue.fields.summary,
                description: issue.fields.description || '',
                status: this.mapJiraStatus(issue.fields.status.name),
                priority: this.mapJiraPriority(issue.fields.priority?.name),
                source: 'jira'
            }));

            return projects;
        } catch (error) {
            console.error('JIRA sync error:', error.message);
            throw error;
        }
    }

    /**
     * Create JIRA issue
     */
    async createJiraIssue(projectData) {
        if (!this.integrations.jira) {
            throw new Error('JIRA integration not configured');
        }

        const { baseUrl, email, apiToken, projectKey } = this.integrations.jira;
        const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

        try {
            const response = await axios.post(
                `${baseUrl}/rest/api/3/issue`,
                {
                    fields: {
                        project: { key: projectKey },
                        summary: projectData.name,
                        description: projectData.description,
                        issuetype: { name: 'Task' }
                    }
                },
                {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('JIRA create issue error:', error.message);
            throw error;
        }
    }

    /**
     * Initialize Slack integration
     */
    initSlack(slackConfig) {
        this.integrations.slack = {
            botToken: slackConfig.botToken,
            channel: slackConfig.channel
        };
    }

    /**
     * Send Slack notification
     */
    async sendSlackNotification(message, channel = null) {
        if (!this.integrations.slack) {
            throw new Error('Slack integration not configured');
        }

        const { botToken, channel: defaultChannel } = this.integrations.slack;
        const targetChannel = channel || defaultChannel;

        try {
            const response = await axios.post(
                'https://slack.com/api/chat.postMessage',
                {
                    channel: targetChannel,
                    text: message
                },
                {
                    headers: {
                        'Authorization': `Bearer ${botToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Slack notification error:', error.message);
            throw error;
        }
    }

    /**
     * Initialize Google Calendar integration
     */
    initGoogleCalendar(calendarConfig) {
        this.integrations.googleCalendar = {
            apiKey: calendarConfig.apiKey,
            calendarId: calendarConfig.calendarId
        };
    }

    /**
     * Create calendar event
     */
    async createCalendarEvent(eventData) {
        if (!this.integrations.googleCalendar) {
            throw new Error('Google Calendar integration not configured');
        }

        const { apiKey, calendarId } = this.integrations.googleCalendar;

        try {
            const response = await axios.post(
                `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${apiKey}`,
                {
                    summary: eventData.title,
                    description: eventData.description,
                    start: {
                        dateTime: eventData.startTime,
                        timeZone: 'UTC'
                    },
                    end: {
                        dateTime: eventData.endTime,
                        timeZone: 'UTC'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Google Calendar error:', error.message);
            throw error;
        }
    }

    /**
     * Helper methods
     */
    mapJiraStatus(jiraStatus) {
        const statusMap = {
            'To Do': 'planning',
            'In Progress': 'active',
            'Done': 'completed',
            'On Hold': 'on-hold'
        };
        return statusMap[jiraStatus] || 'planning';
    }

    mapJiraPriority(jiraPriority) {
        const priorityMap = {
            'Highest': 'high',
            'High': 'high',
            'Medium': 'medium',
            'Low': 'low',
            'Lowest': 'low'
        };
        return priorityMap[jiraPriority] || 'medium';
    }

    /**
     * Get integration status
     */
    getIntegrationStatus() {
        return {
            jira: !!this.integrations.jira,
            slack: !!this.integrations.slack,
            googleCalendar: !!this.integrations.googleCalendar
        };
    }
}

module.exports = IntegrationHub;
