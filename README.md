# TeamOptimizer - Intelligent Resource Management System

## Overview
TeamOptimizer is a comprehensive, AI-powered resource management platform designed to help organizations optimize their workforce, track project costs, and streamline allocation workflows.

## Features
- **Smart Resource Management**: Track availability, skills, and utilization of all resources.
- **AI Recommendations**: Get intelligent suggestions for project staffing based on skills and availability.
- **Advanced Analytics**: Visual dashboards for utilization trends, budget vs. actuals, and skill demand.
- **Workflow Automation**: Streamlined request and approval process for resource allocations.
- **Cost Analysis**: Real-time project cost tracking and overrun alerts.
- **Integration Hub**: Ready-to-connect structure for JIRA, Slack, and Google Calendar.
- **Reporting**: Generate PDF executive summaries and export data to Excel/CSV.

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Update the settings (DB credentials, JWT secret, etc.)

### Running the Application
Start the development server:
```bash
npm start
```
The application will be available at `http://localhost:3000`.

### Default Login
- **Username/Email**: admin@teamoptimizer.com (Create this user via registration if not exists, or use the test seed script)
- **Password**: admin123

## Project Structure
- `server.js` - Main application entry point and API server.
- `public/` - Frontend single-page application (HTML/CSS/JS).
- `services/` - Core business logic engines (Workflow, Export, Cost).
- `ai/` - AI and recommendation logic.
- `integrations/` - External system connectors.
- `database.js` - SQLite database wrapper.

## Key Modules
- **Dashboard**: High-level overview of metrics.
- **Allocations**: Gantt-style allocation view and manual/auto assignment.
- **AI Insights**: Churn risk prediction and team composition.
- **Reports**: Downloadable reports and data dumps.

## License
Proprietary - Internal Use Only
