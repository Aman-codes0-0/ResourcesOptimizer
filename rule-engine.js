const { v4: uuidv4 } = require('uuid');

class RuleEngine {
    constructor(database) {
        this.db = database;
    }

    // Calculate skill match score between resource and project
    calculateSkillMatch(resourceSkills, requiredSkills) {
        const resSkills = resourceSkills.toLowerCase().split(',').map(s => s.trim());
        const reqSkills = requiredSkills.toLowerCase().split(',').map(s => s.trim());

        let matchCount = 0;
        let partialMatchCount = 0;

        for (const reqSkill of reqSkills) {
            if (resSkills.some(rs => rs === reqSkill)) {
                matchCount++;
            } else if (resSkills.some(rs => rs.includes(reqSkill) || reqSkill.includes(rs))) {
                partialMatchCount++;
            }
        }

        const exactMatchScore = (matchCount / reqSkills.length) * 100;
        const partialMatchScore = (partialMatchCount / reqSkills.length) * 50;

        return {
            score: Math.min(exactMatchScore + partialMatchScore, 100),
            matchedSkills: matchCount,
            totalRequired: reqSkills.length,
            isFullMatch: matchCount === reqSkills.length
        };
    }

    // Rule 1: Skill-Based Matching
    findBestResourcesForProject(projectId) {
        const project = this.db.getProjectById(projectId);
        if (!project) return [];

        const availableResources = this.db.getBenchResources();
        const matches = [];

        for (const resource of availableResources) {
            const skillMatch = this.calculateSkillMatch(resource.skills, project.required_skills);

            if (skillMatch.score >= 50) { // At least 50% match
                matches.push({
                    resource,
                    skillMatch,
                    recommendation: this.getMatchRecommendation(skillMatch.score)
                });
            }
        }

        // Sort by skill match score (highest first)
        return matches.sort((a, b) => b.skillMatch.score - a.skillMatch.score);
    }

    getMatchRecommendation(score) {
        if (score >= 90) return 'Excellent match - Immediate allocation recommended';
        if (score >= 70) return 'Good match - Allocation recommended';
        if (score >= 50) return 'Partial match - Consider with training';
        return 'Low match - Not recommended';
    }

    // Rule 2: Utilization Analysis
    analyzeResourceUtilization() {
        const resources = this.db.getAllResources();
        const analysis = {
            underutilized: [],
            optimal: [],
            overutilized: [],
            bench: []
        };

        for (const resource of resources) {
            const utilization = resource.current_utilization;

            if (resource.status === 'available') {
                const benchDays = this.calculateBenchDays(resource.bench_since);
                analysis.bench.push({
                    ...resource,
                    benchDays,
                    urgency: this.getBenchUrgency(benchDays)
                });
            } else if (utilization < 50) {
                analysis.underutilized.push({
                    ...resource,
                    recommendation: 'Increase allocation or move to bench'
                });
            } else if (utilization >= 50 && utilization <= 90) {
                analysis.optimal.push({
                    ...resource,
                    recommendation: 'Optimal utilization'
                });
            } else {
                analysis.overutilized.push({
                    ...resource,
                    recommendation: 'Risk of burnout - Consider load balancing'
                });
            }
        }

        return analysis;
    }

    calculateBenchDays(benchSince) {
        if (!benchSince) return 0;
        const benchDate = new Date(benchSince);
        const now = new Date();
        return Math.floor((now - benchDate) / (1000 * 60 * 60 * 24));
    }

    getBenchUrgency(days) {
        if (days >= 30) return 'critical';
        if (days >= 14) return 'high';
        if (days >= 7) return 'medium';
        return 'low';
    }

    // Rule 3: Priority-Based Allocation
    getPriorityScore(project) {
        const priorityScores = {
            'critical': 100,
            'high': 75,
            'medium': 50,
            'low': 25
        };

        let score = priorityScores[project.priority] || 50;

        // Increase score if deadline is approaching
        if (project.start_date) {
            const daysUntilStart = this.calculateDaysUntil(project.start_date);
            if (daysUntilStart <= 7) score += 20;
            else if (daysUntilStart <= 14) score += 10;
        }

        return Math.min(score, 100);
    }

    calculateDaysUntil(dateString) {
        const targetDate = new Date(dateString);
        const now = new Date();
        return Math.floor((targetDate - now) / (1000 * 60 * 60 * 24));
    }

    // Rule 4: Automated Allocation Recommendations
    generateAllocationRecommendations() {
        const projects = this.db.getAllProjects().filter(p => p.status === 'planning' || p.status === 'active');
        const recommendations = [];

        // Clear old recommendations
        this.db.clearRecommendations();

        for (const project of projects) {
            const matches = this.findBestResourcesForProject(project.id);
            const priorityScore = this.getPriorityScore(project);

            for (let i = 0; i < Math.min(matches.length, project.required_resources); i++) {
                const match = matches[i];

                const recommendation = {
                    id: uuidv4(),
                    type: 'allocation',
                    resource_id: match.resource.id,
                    project_id: project.id,
                    description: `Allocate ${match.resource.name} to ${project.name} (${match.skillMatch.score.toFixed(0)}% skill match)`,
                    priority: this.getRecommendationPriority(priorityScore, match.skillMatch.score),
                    status: 'pending'
                };

                this.db.createRecommendation(recommendation);
                recommendations.push(recommendation);
            }
        }

        // Generate bench optimization recommendations
        const benchAnalysis = this.analyzeResourceUtilization();
        for (const resource of benchAnalysis.bench) {
            if (resource.urgency === 'critical' || resource.urgency === 'high') {
                const recommendation = {
                    id: uuidv4(),
                    type: 'bench_alert',
                    resource_id: resource.id,
                    project_id: null,
                    description: `${resource.name} has been on bench for ${resource.benchDays} days - Urgent allocation needed`,
                    priority: resource.urgency === 'critical' ? 'high' : 'medium',
                    status: 'pending'
                };

                this.db.createRecommendation(recommendation);
                recommendations.push(recommendation);
            }
        }

        return recommendations;
    }

    getRecommendationPriority(projectPriority, skillMatchScore) {
        if (projectPriority >= 80 && skillMatchScore >= 80) return 'high';
        if (projectPriority >= 60 || skillMatchScore >= 70) return 'medium';
        return 'low';
    }

    // Rule 5: Bench Optimization Strategy
    getBenchOptimizationStrategy(resourceId) {
        const resource = this.db.getResourceById(resourceId);
        if (!resource || resource.status !== 'available') return null;

        const benchDays = this.calculateBenchDays(resource.bench_since);
        const allProjects = this.db.getAllProjects();
        const potentialMatches = [];

        for (const project of allProjects) {
            const skillMatch = this.calculateSkillMatch(resource.skills, project.required_skills);
            if (skillMatch.score >= 40) {
                potentialMatches.push({
                    project,
                    skillMatch,
                    priority: this.getPriorityScore(project)
                });
            }
        }

        potentialMatches.sort((a, b) => {
            // Sort by combination of skill match and project priority
            const scoreA = (a.skillMatch.score * 0.6) + (a.priority * 0.4);
            const scoreB = (b.skillMatch.score * 0.6) + (b.priority * 0.4);
            return scoreB - scoreA;
        });

        return {
            resource,
            benchDays,
            urgency: this.getBenchUrgency(benchDays),
            potentialProjects: potentialMatches.slice(0, 5),
            recommendations: this.getBenchActionRecommendations(benchDays, potentialMatches.length)
        };
    }

    getBenchActionRecommendations(benchDays, matchCount) {
        const actions = [];

        if (matchCount > 0) {
            actions.push('Allocate to one of the matched projects');
        }

        if (benchDays >= 14) {
            actions.push('Consider upskilling or training programs');
            actions.push('Explore internal mobility opportunities');
        }

        if (benchDays >= 30) {
            actions.push('URGENT: Review resource retention strategy');
            actions.push('Consider temporary assignments or shadow projects');
        }

        if (matchCount === 0) {
            actions.push('Review skill set alignment with current project portfolio');
            actions.push('Consider skill development in high-demand areas');
        }

        return actions;
    }

    // Rule 6: Load Balancing
    suggestLoadBalancing() {
        const utilizationAnalysis = this.analyzeResourceUtilization();
        const suggestions = [];

        // Find overutilized resources
        for (const overutilized of utilizationAnalysis.overutilized) {
            // Find underutilized resources with similar skills
            for (const underutilized of utilizationAnalysis.underutilized) {
                const skillMatch = this.calculateSkillMatch(underutilized.skills, overutilized.skills);

                if (skillMatch.score >= 60) {
                    suggestions.push({
                        from: overutilized.name,
                        to: underutilized.name,
                        reason: `Transfer some workload from ${overutilized.name} (${overutilized.current_utilization}%) to ${underutilized.name} (${underutilized.current_utilization}%)`,
                        skillMatch: skillMatch.score
                    });
                }
            }
        }

        return suggestions;
    }

    // Get comprehensive dashboard metrics
    getDashboardMetrics() {
        const resources = this.db.getAllResources();
        const projects = this.db.getAllProjects();
        const allocations = this.db.getAllAllocations();
        const utilizationAnalysis = this.analyzeResourceUtilization();

        const totalResources = resources.length;
        const benchCount = utilizationAnalysis.bench.length;
        const activeProjects = projects.filter(p => p.status === 'active').length;

        const totalUtilization = resources.reduce((sum, r) => sum + r.current_utilization, 0);
        const avgUtilization = totalResources > 0 ? totalUtilization / totalResources : 0;

        const criticalBench = utilizationAnalysis.bench.filter(r => r.urgency === 'critical').length;
        const highPriorityProjects = projects.filter(p => p.priority === 'high' || p.priority === 'critical').length;

        return {
            totalResources,
            benchCount,
            benchPercentage: ((benchCount / totalResources) * 100).toFixed(1),
            activeProjects,
            totalAllocations: allocations.length,
            avgUtilization: avgUtilization.toFixed(1),
            utilizationBreakdown: {
                underutilized: utilizationAnalysis.underutilized.length,
                optimal: utilizationAnalysis.optimal.length,
                overutilized: utilizationAnalysis.overutilized.length,
                bench: benchCount
            },
            alerts: {
                criticalBench,
                highPriorityProjects,
                overutilizedResources: utilizationAnalysis.overutilized.length
            }
        };
    }
}

module.exports = RuleEngine;
