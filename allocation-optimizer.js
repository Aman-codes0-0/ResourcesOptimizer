const { v4: uuidv4 } = require('uuid');

class AllocationOptimizer {
    constructor(database, ruleEngine) {
        this.db = database;
        this.ruleEngine = ruleEngine;
    }

    // Automatic allocation based on rules
    autoAllocate(projectId) {
        const project = this.db.getProjectById(projectId);
        if (!project) {
            return { success: false, error: 'Project not found' };
        }

        const matches = this.ruleEngine.findBestResourcesForProject(projectId);

        if (matches.length === 0) {
            return {
                success: false,
                error: 'No suitable resources found',
                suggestion: 'Consider upskilling bench resources or hiring'
            };
        }

        const allocations = [];
        const resourcesNeeded = project.required_resources;

        for (let i = 0; i < Math.min(matches.length, resourcesNeeded); i++) {
            const match = matches[i];

            // Create allocation
            const allocation = {
                id: uuidv4(),
                resource_id: match.resource.id,
                project_id: projectId,
                allocation_percentage: 100,
                start_date: project.start_date || new Date().toISOString(),
                end_date: project.end_date,
                status: 'active'
            };

            this.db.createAllocation(allocation);

            // Update resource status
            this.db.updateResource(match.resource.id, {
                status: 'allocated',
                current_utilization: 100,
                bench_since: null
            });

            allocations.push({
                allocation,
                resource: match.resource,
                skillMatch: match.skillMatch
            });
        }

        // Update project status
        if (allocations.length > 0) {
            this.db.updateProject(projectId, { status: 'active' });
        }

        return {
            success: true,
            allocations,
            message: `Successfully allocated ${allocations.length} resource(s) to ${project.name}`
        };
    }

    // Manual allocation with validation
    manualAllocate(resourceId, projectId, allocationPercentage = 100) {
        const resource = this.db.getResourceById(resourceId);
        const project = this.db.getProjectById(projectId);

        if (!resource) {
            return { success: false, error: 'Resource not found' };
        }

        if (!project) {
            return { success: false, error: 'Project not found' };
        }

        // Check if resource has capacity
        const newUtilization = resource.current_utilization + allocationPercentage;
        if (newUtilization > 100) {
            return {
                success: false,
                error: `Resource is overallocated. Current: ${resource.current_utilization}%, Requested: ${allocationPercentage}%`,
                suggestion: 'Consider partial allocation or find another resource'
            };
        }

        // Calculate skill match for warning
        const skillMatch = this.ruleEngine.calculateSkillMatch(resource.skills, project.required_skills);

        const allocation = {
            id: uuidv4(),
            resource_id: resourceId,
            project_id: projectId,
            allocation_percentage: allocationPercentage,
            start_date: project.start_date || new Date().toISOString(),
            end_date: project.end_date,
            status: 'active'
        };

        this.db.createAllocation(allocation);

        // Update resource
        this.db.updateResource(resourceId, {
            status: newUtilization >= 100 ? 'allocated' : 'partially_allocated',
            current_utilization: newUtilization,
            bench_since: null
        });

        return {
            success: true,
            allocation,
            skillMatch,
            warning: skillMatch.score < 70 ? 'Low skill match - consider training or mentorship' : null,
            message: `Successfully allocated ${resource.name} to ${project.name} at ${allocationPercentage}%`
        };
    }

    // Deallocate resource from project
    deallocate(allocationId) {
        const allocations = this.db.getAllAllocations();
        const allocation = allocations.find(a => a.id === allocationId);

        if (!allocation) {
            return { success: false, error: 'Allocation not found' };
        }

        const resource = this.db.getResourceById(allocation.resource_id);

        // Update allocation status
        this.db.updateAllocation(allocationId, { status: 'completed' });

        // Update resource utilization
        const newUtilization = Math.max(0, resource.current_utilization - allocation.allocation_percentage);

        this.db.updateResource(allocation.resource_id, {
            status: newUtilization === 0 ? 'available' : 'partially_allocated',
            current_utilization: newUtilization,
            bench_since: newUtilization === 0 ? new Date().toISOString() : null
        });

        return {
            success: true,
            message: `Successfully deallocated ${allocation.resource_name} from ${allocation.project_name}`
        };
    }

    // Optimize all allocations
    optimizeAllAllocations() {
        const projects = this.db.getAllProjects().filter(p => p.status === 'planning');
        const results = {
            successful: [],
            failed: [],
            totalProcessed: projects.length
        };

        // Sort projects by priority
        const sortedProjects = projects.sort((a, b) => {
            const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
        });

        for (const project of sortedProjects) {
            const result = this.autoAllocate(project.id);

            if (result.success) {
                results.successful.push({
                    project: project.name,
                    allocations: result.allocations.length
                });
            } else {
                results.failed.push({
                    project: project.name,
                    reason: result.error
                });
            }
        }

        return results;
    }

    // Get allocation conflicts
    findAllocationConflicts() {
        const resources = this.db.getAllResources();
        const conflicts = [];

        for (const resource of resources) {
            if (resource.current_utilization > 100) {
                conflicts.push({
                    type: 'overallocation',
                    resource: resource.name,
                    utilization: resource.current_utilization,
                    severity: 'high',
                    recommendation: 'Reduce allocation or redistribute workload'
                });
            }

            if (resource.current_utilization > 90 && resource.current_utilization <= 100) {
                conflicts.push({
                    type: 'near_capacity',
                    resource: resource.name,
                    utilization: resource.current_utilization,
                    severity: 'medium',
                    recommendation: 'Monitor closely for burnout risk'
                });
            }
        }

        return conflicts;
    }

    // Suggest reallocation for better optimization
    suggestReallocation() {
        const suggestions = [];
        const utilizationAnalysis = this.ruleEngine.analyzeResourceUtilization();
        const projects = this.db.getAllProjects().filter(p => p.status === 'active');

        // Find projects that could benefit from better skill matches
        for (const project of projects) {
            const currentAllocations = this.db.getAllAllocations()
                .filter(a => a.project_id === project.id);

            for (const allocation of currentAllocations) {
                const currentResource = this.db.getResourceById(allocation.resource_id);
                const currentMatch = this.ruleEngine.calculateSkillMatch(
                    currentResource.skills,
                    project.required_skills
                );

                // Find better matches on bench
                const benchResources = utilizationAnalysis.bench;
                for (const benchResource of benchResources) {
                    const benchMatch = this.ruleEngine.calculateSkillMatch(
                        benchResource.skills,
                        project.required_skills
                    );

                    if (benchMatch.score > currentMatch.score + 20) { // Significantly better match
                        suggestions.push({
                            type: 'skill_upgrade',
                            project: project.name,
                            currentResource: currentResource.name,
                            currentMatch: currentMatch.score,
                            suggestedResource: benchResource.name,
                            suggestedMatch: benchMatch.score,
                            benefit: `${(benchMatch.score - currentMatch.score).toFixed(0)}% better skill match`,
                            priority: benchMatch.score >= 90 ? 'high' : 'medium'
                        });
                    }
                }
            }
        }

        return suggestions;
    }

    // Calculate resource availability forecast
    getAvailabilityForecast(days = 30) {
        const resources = this.db.getAllResources();
        const allocations = this.db.getAllAllocations();
        const forecast = [];

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        for (const resource of resources) {
            const activeAllocations = allocations.filter(a =>
                a.resource_id === resource.id &&
                a.status === 'active'
            );

            const upcomingReleases = activeAllocations.filter(a => {
                if (!a.end_date) return false;
                const endDate = new Date(a.end_date);
                return endDate <= futureDate;
            });

            if (upcomingReleases.length > 0) {
                const earliestRelease = upcomingReleases.reduce((earliest, current) => {
                    const currentEnd = new Date(current.end_date);
                    const earliestEnd = new Date(earliest.end_date);
                    return currentEnd < earliestEnd ? current : earliest;
                });

                forecast.push({
                    resource: resource.name,
                    skills: resource.skills,
                    availableFrom: earliestRelease.end_date,
                    daysUntilAvailable: Math.floor(
                        (new Date(earliestRelease.end_date) - new Date()) / (1000 * 60 * 60 * 24)
                    ),
                    currentProject: earliestRelease.project_name
                });
            }
        }

        return forecast.sort((a, b) => a.daysUntilAvailable - b.daysUntilAvailable);
    }
}

module.exports = AllocationOptimizer;
