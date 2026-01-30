const ResourceDatabase = require('../database');
const bcrypt = require('bcryptjs');

async function seedData() {
    const db = new ResourceDatabase();
    await db.initialize();

    console.log('Seeding data...');

    // 1. Create Users
    try {
        const passwordHash = await bcrypt.hash('password123', 10);

        // Admin
        const admin = await db.getUserByEmail('admin@example.com');
        if (!admin) {
            await db.createUser({
                id: 'user-admin',
                username: 'admin',
                email: 'admin@example.com',
                password_hash: passwordHash,
                role: 'admin',
                full_name: 'System Admin',
                is_active: 1
            });
            console.log('Created admin user');
        } else {
            console.log('Admin user already exists');
        }

        // Manager
        const manager = await db.getUserByEmail('manager@example.com');
        if (!manager) {
            await db.createUser({
                id: 'user-manager',
                username: 'manager',
                email: 'manager@example.com',
                password_hash: passwordHash,
                role: 'manager',
                full_name: 'Project Manager',
                is_active: 1
            });
            console.log('Created manager user');
        }
    } catch (e) {
        console.error('Error creating users:', e);
    }

    // 2. Create Resources
    try {
        const skills = ['React', 'Node.js', 'Python', 'Java', 'UI/UX', 'DevOps', 'SQL'];
        const roles = ['Developer', 'Designer', 'Architect', 'DevOps Engineer', 'QA'];

        for (let i = 1; i <= 20; i++) {
            const id = `resource-${i}`;
            const exists = await db.getResourceById(id);
            if (!exists) {
                const role = roles[Math.floor(Math.random() * roles.length)];
                const resourceSkills = [skills[Math.floor(Math.random() * skills.length)], skills[Math.floor(Math.random() * skills.length)]].join(', ');

                await db.createResource({
                    id: id,
                    name: `Resource ${i}`,
                    email: `resource${i}@example.com`,
                    role: role,
                    skills: resourceSkills,
                    availability: 100,
                    current_utilization: 0,
                    availability_start: new Date().toISOString(),
                    status: Math.random() > 0.3 ? 'available' : 'busy',
                    hourly_rate: 50 + Math.floor(Math.random() * 100)
                });
            }
        }
        console.log('Seeded resources');
    } catch (e) {
        console.error('Error seeding resources:', e);
    }

    // 3. Create Projects
    try {
        for (let i = 1; i <= 5; i++) {
            const id = `project-${i}`;
            const exists = await db.getProjectById(id);
            if (!exists) {
                await db.createProject({
                    id: id,
                    name: `Project ${String.fromCharCode(65 + i)}`,
                    description: `Key strategic initiative ${i}`,
                    start_date: new Date().toISOString(),
                    end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
                    status: i === 1 ? 'completed' : 'active',
                    priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
                    required_skills: 'React, Node.js',
                    budget: 50000 + Math.floor(Math.random() * 50000)
                });
            }
        }
        console.log('Seeded projects');
    } catch (e) {
        console.error('Error seeding projects:', e);
    }

    console.log('Seed complete! You can now log in with admin@example.com / password123');
}

seedData().catch(console.error);
