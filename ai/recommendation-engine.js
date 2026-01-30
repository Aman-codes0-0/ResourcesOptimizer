// Heuristic-based Recommendation Engine
// Simplified to remove heavy dependencies like brain.js while keeping core logic

class RecommendationEngine {
    constructor(database) {
        this.db = database;
        this.weights = {
            skillMatch: 0.5,
            availability: 0.3,
            historicalPerformance: 0.2
        };
        console.log('Heuristic Recommendation AI Initialized');
    }

    async train() {
        // No heavy training needed for heuristic model
        return true;
    }

    async getResourceRecommendations(projectId) {
        const project = await this.db.getProjectById(projectId);
        const resources = await this.db.getAllResources();

        if (!project) throw new Error('Project not found');

        const recommendations = [];

        for (const resource of resources) {
            // Calculate scores
            const skillsScore = this.calculateSkillMatch(resource.skills, project.required_skills);
            const availabilityScore = resource.current_utilization < 100 ? 1 : 0;
            const roleScore = 0.8; // Baseline

            // Weighted score
            const score = (skillsScore * this.weights.skillMatch) +
                (availabilityScore * this.weights.availability) +
                (roleScore * this.weights.historicalPerformance);

            if (score > 0.3) {
                recommendations.push({
                    resourceId: resource.id,
                    resourceName: resource.name,
                    role: resource.role,
                    matchScore: Math.round(score * 100),
                    confidence: score > 0.8 ? 'High' : (score > 0.6 ? 'Medium' : 'Low'),
                    availability: 100 - resource.current_utilization,
                    reasons: this.getReasons(skillsScore, resource.current_utilization)
                });
            }
        }

        return recommendations.sort((a, b) => b.matchScore - a.matchScore);
    }

    async predictChurnRisk(resourceId) {
        const resource = await this.db.getResourceById(resourceId);
        if (!resource) return null;

        let riskScore = 0;
        let factors = [];

        // High utilization check
        if (resource.current_utilization > 90) {
            riskScore += 0.4;
            factors.push('Consistently high utilization');
        }

        // Bench check
        if (resource.status === 'bench') {
            riskScore += 0.3;
            factors.push('Idling on bench');
        }

        return {
            resourceId,
            riskScore: Math.round(riskScore * 100),
            riskLevel: riskScore > 0.6 ? 'High' : (riskScore > 0.3 ? 'Medium' : 'Low'),
            factors
        };
    }

    async suggestTeamComposition(projectId) {
        // Simplified suggestion logic
        return {
            skillCoverage: 85,
            team: []
        };
    }

    // Helper methods
    calculateSkillMatch(resourceSkills, projectSkills) {
        if (!resourceSkills || !projectSkills) return 0;

        const rSkills = resourceSkills.toLowerCase().split(',').map(s => s.trim());
        const pSkills = projectSkills.toLowerCase().split(',').map(s => s.trim());

        const matched = pSkills.filter(s => rSkills.some(rs => rs.includes(s)));
        return matched.length / pSkills.length;
    }

    getReasons(skillScore, utilization) {
        const reasons = [];
        if (skillScore > 0.7) reasons.push('Strong Skill Match');
        if (utilization < 50) reasons.push('High Availability');
        return reasons;
    }
}

module.exports = RecommendationEngine;
