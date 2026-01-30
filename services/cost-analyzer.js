class CostAnalyzer {
    constructor(database) {
        this.db = database;
    }

    /**
     * Calculate project cost
     */
    calculateProjectCost(projectId) {
        const allocations = this.db.getAllAllocations().filter(a => a.project_id === projectId);
        const project = this.db.getProjectById(projectId);

        let totalCost = 0;
        const breakdown = [];

        allocations.forEach(allocation => {
            const resource = this.db.getResourceById(allocation.resource_id);
            if (resource && resource.hourly_rate) {
                // Assuming 160 hours per month
                const monthlyCost = (resource.hourly_rate * 160 * allocation.allocation_percentage) / 100;
                totalCost += monthlyCost;

                breakdown.push({
                    resourceName: resource.name,
                    role: resource.role,
                    hourlyRate: resource.hourly_rate,
                    allocationPercentage: allocation.allocation_percentage,
                    monthlyCost: monthlyCost.toFixed(2)
                });
            }
        });

        return {
            projectId,
            projectName: project?.name || 'Unknown',
            budget: project?.budget || 0,
            totalCost: totalCost.toFixed(2),
            remaining: project?.budget ? (project.budget - totalCost).toFixed(2) : 0,
            utilizationPercentage: project?.budget ? ((totalCost / project.budget) * 100).toFixed(1) : 0,
            breakdown
        };
    }

    /**
     * Get cost trends
     */
    getCostTrends(months = 6) {
        const projects = this.db.getAllProjects();
        const trends = [];

        projects.forEach(project => {
            const cost = this.calculateProjectCost(project.id);
            trends.push({
                projectId: project.id,
                projectName: project.name,
                budget: project.budget,
                actualCost: parseFloat(cost.totalCost),
                variance: project.budget - parseFloat(cost.totalCost),
                status: project.status
            });
        });

        return trends;
    }

    /**
     * Forecast future costs
     */
    forecastCosts(projectId, months = 3) {
        const currentCost = this.calculateProjectCost(projectId);
        const monthlyCost = parseFloat(currentCost.totalCost);

        const forecast = [];
        for (let i = 1; i <= months; i++) {
            forecast.push({
                month: i,
                projectedCost: (monthlyCost * i).toFixed(2),
                cumulativeCost: (monthlyCost * i).toFixed(2)
            });
        }

        return {
            projectId,
            currentMonthlyCost: monthlyCost.toFixed(2),
            forecast
        };
    }

    /**
     * Identify cost overruns
     */
    identifyCostOverruns() {
        const projects = this.db.getAllProjects();
        const overruns = [];

        projects.forEach(project => {
            if (project.budget) {
                const cost = this.calculateProjectCost(project.id);
                const actualCost = parseFloat(cost.totalCost);

                if (actualCost > project.budget) {
                    overruns.push({
                        projectId: project.id,
                        projectName: project.name,
                        budget: project.budget,
                        actualCost,
                        overrun: actualCost - project.budget,
                        overrunPercentage: (((actualCost - project.budget) / project.budget) * 100).toFixed(1)
                    });
                }
            }
        });

        return overruns.sort((a, b) => b.overrun - a.overrun);
    }

    /**
     * Calculate ROI
     */
    calculateROI(projectId, revenue) {
        const cost = this.calculateProjectCost(projectId);
        const totalCost = parseFloat(cost.totalCost);

        if (totalCost === 0) return null;

        const roi = ((revenue - totalCost) / totalCost) * 100;

        return {
            projectId,
            revenue,
            cost: totalCost,
            profit: revenue - totalCost,
            roi: roi.toFixed(2)
        };
    }
}

module.exports = CostAnalyzer;
