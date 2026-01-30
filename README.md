# Smart Resource Utilization and Bench Optimization System

A comprehensive rule-based system for optimizing resource allocation, managing bench resources, and maximizing team utilization across projects.

## 🚀 Features

### Core Functionality
- **Smart Resource Allocation**: Automated resource-to-project matching based on skills, availability, and priorities
- **Bench Optimization**: Track and optimize resources on bench with urgency-based recommendations
- **Rule-Based Engine**: Intelligent decision-making using predefined business rules
- **Real-Time Dashboard**: Live metrics and utilization tracking
- **Analytics & Insights**: Comprehensive analytics with conflict detection and optimization suggestions

### Rule Engine Capabilities
1. **Skill-Based Matching**: Automatically match resources to projects based on required skills
2. **Utilization Analysis**: Identify underutilized, optimal, and overutilized resources
3. **Priority-Based Allocation**: Allocate resources based on project priority and deadlines
4. **Bench Management**: Track bench duration and provide actionable recommendations
5. **Load Balancing**: Suggest workload redistribution to prevent burnout
6. **Conflict Detection**: Identify and alert on allocation conflicts

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## 🛠️ Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the server**:
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

3. **Access the application**:
   Open your browser and navigate to `http://localhost:3000`

## 📁 Project Structure

```
resource-optimization-system/
├── server.js                 # Express server with REST API
├── database.js              # SQLite database layer
├── rule-engine.js           # Core rule-based logic
├── allocation-optimizer.js  # Allocation algorithms
├── package.json             # Dependencies
├── resources.db             # SQLite database (auto-created)
└── public/
    ├── index.html          # Main HTML structure
    ├── styles.css          # Modern UI styling
    └── app.js              # Frontend JavaScript
```

## 🎯 Usage Guide

### Dashboard
- View real-time metrics: total resources, bench count, active projects, average utilization
- Monitor utilization breakdown by category
- Review alerts and recommendations

### Resources Management
- Add new resources with skills and availability
- View all resources with their utilization status
- Track resource allocation history

### Projects Management
- Create projects with required skills and priorities
- Auto-allocate resources to projects
- Track project status and resource requirements

### Bench View
- View all available resources on bench
- See days on bench with urgency indicators
- Find matching projects for bench resources

### Allocations
- Manual allocation with validation
- Auto-optimize all allocations
- Deallocate resources from projects

### Analytics
- **Conflicts**: Detect overallocation and capacity issues
- **Reallocation Suggestions**: Optimize existing allocations
- **Availability Forecast**: Predict upcoming resource availability
- **Load Balancing**: Redistribute workload suggestions

## 🔧 API Endpoints

### Resources
- `GET /api/resources` - Get all resources
- `GET /api/resources/:id` - Get resource by ID
- `GET /api/resources/bench/all` - Get bench resources
- `POST /api/resources` - Create resource
- `PUT /api/resources/:id` - Update resource
- `DELETE /api/resources/:id` - Delete resource

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Allocations
- `GET /api/allocations` - Get all allocations
- `POST /api/allocations/auto/:projectId` - Auto-allocate to project
- `POST /api/allocations/manual` - Manual allocation
- `DELETE /api/allocations/:id` - Deallocate
- `POST /api/allocations/optimize-all` - Optimize all allocations

### Rule Engine
- `GET /api/rules/match/:projectId` - Get best resources for project
- `GET /api/rules/utilization` - Analyze utilization
- `GET /api/rules/bench-optimization/:resourceId` - Get bench optimization strategy
- `POST /api/rules/recommendations` - Generate recommendations
- `GET /api/recommendations` - Get all recommendations
- `GET /api/rules/load-balancing` - Get load balancing suggestions

### Analytics
- `GET /api/analytics/dashboard` - Dashboard metrics
- `GET /api/analytics/conflicts` - Allocation conflicts
- `GET /api/analytics/reallocation-suggestions` - Reallocation suggestions
- `GET /api/analytics/availability-forecast?days=30` - Availability forecast

## 📊 Rule Engine Logic

### Skill Matching Algorithm
- Calculates exact and partial skill matches
- Scores from 0-100% based on match quality
- Recommends allocation based on match score:
  - 90%+: Excellent match
  - 70-89%: Good match
  - 50-69%: Partial match (consider with training)
  - <50%: Not recommended

### Utilization Categories
- **Underutilized**: <50% utilization
- **Optimal**: 50-90% utilization
- **Overutilized**: >90% utilization
- **Bench**: 0% utilization (available)

### Bench Urgency Levels
- **Critical**: 30+ days on bench
- **High**: 14-29 days on bench
- **Medium**: 7-13 days on bench
- **Low**: <7 days on bench

### Priority Scoring
- **Critical**: 100 points
- **High**: 75 points
- **Medium**: 50 points
- **Low**: 25 points
- Bonus points for approaching deadlines

## 🎨 UI Features

- **Dark Theme**: Modern dark mode with vibrant accents
- **Glassmorphism**: Beautiful glass-effect cards
- **Real-Time Updates**: WebSocket-powered live data
- **Responsive Design**: Works on desktop and mobile
- **Smooth Animations**: Polished micro-interactions
- **Interactive Charts**: Visual utilization breakdown

## 🔄 Real-Time Updates

The system uses WebSocket connections to provide real-time updates:
- Resource changes
- Project updates
- New allocations
- Recommendation updates

Connection status is displayed in the sidebar.

## 📝 Sample Data

The system comes pre-loaded with sample data:
- 8 sample resources with various skills
- 4 sample projects with different priorities
- Realistic utilization scenarios

## 🚦 Getting Started Workflow

1. **Review Dashboard**: Check current metrics and alerts
2. **Add Resources**: Add your team members with their skills
3. **Create Projects**: Define projects with required skills
4. **Auto-Allocate**: Use auto-allocation for optimal matching
5. **Monitor Bench**: Keep track of available resources
6. **Review Analytics**: Check for conflicts and optimization opportunities

## 🛡️ Best Practices

1. **Regular Monitoring**: Check dashboard daily for alerts
2. **Bench Management**: Address critical bench alerts promptly
3. **Skill Updates**: Keep resource skills up-to-date
4. **Priority Setting**: Set accurate project priorities
5. **Load Balancing**: Act on overutilization warnings

## 🔮 Future Enhancements

- Machine learning-based allocation predictions
- Historical trend analysis
- Custom rule configuration UI
- Email notifications for alerts
- Export reports to PDF/Excel
- Integration with HR systems

## 📄 License

MIT License

## 👥 Support

For issues or questions, please open an issue on the project repository.

---

**Built with ❤️ using Node.js, Express, SQLite, and modern web technologies**
