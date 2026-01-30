const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

class ResourceDatabase {
  constructor(dbPath = 'resources.db') {
    this.dbPath = dbPath;
    this.db = null;
    this.initialized = false;
  }

  async initialize() {
    const SQL = await initSqlJs();

    // Try to load existing database
    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    this.initializeTables();
    this.seedSampleData();
    this.save();
    this.initialized = true;
  }

  save() {
    if (this.db) {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    }
  }

  initializeTables() {
    // Resources table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS resources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        skills TEXT NOT NULL,
        availability INTEGER DEFAULT 100,
        current_utilization INTEGER DEFAULT 0,
        status TEXT DEFAULT 'available',
        bench_since TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Projects table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        required_skills TEXT NOT NULL,
        required_resources INTEGER DEFAULT 1,
        priority TEXT DEFAULT 'medium',
        start_date TEXT,
        end_date TEXT,
        status TEXT DEFAULT 'planning',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Allocations table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS allocations (
        id TEXT PRIMARY KEY,
        resource_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        allocation_percentage INTEGER DEFAULT 100,
        start_date TEXT NOT NULL,
        end_date TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resource_id) REFERENCES resources(id),
        FOREIGN KEY (project_id) REFERENCES projects(id)
      )
    `);

    // Utilization history table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS utilization_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resource_id TEXT NOT NULL,
        utilization INTEGER NOT NULL,
        recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resource_id) REFERENCES resources(id)
      )
    `);

    // Recommendations table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS recommendations (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        resource_id TEXT,
        project_id TEXT,
        description TEXT NOT NULL,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  seedSampleData() {
    const result = this.db.exec('SELECT COUNT(*) as count FROM resources');
    const count = result[0] ? result[0].values[0][0] : 0;

    if (count === 0) {
      const sampleResources = [
        { id: 'r1', name: 'Alice Johnson', email: 'alice@company.com', role: 'Full Stack Developer', skills: 'JavaScript,React,Node.js,Python', availability: 100, current_utilization: 0, status: 'available', bench_since: new Date().toISOString() },
        { id: 'r2', name: 'Bob Smith', email: 'bob@company.com', role: 'Backend Developer', skills: 'Java,Spring Boot,MySQL,Microservices', availability: 100, current_utilization: 80, status: 'allocated', bench_since: null },
        { id: 'r3', name: 'Carol Davis', email: 'carol@company.com', role: 'Frontend Developer', skills: 'React,Vue.js,CSS,TypeScript', availability: 100, current_utilization: 0, status: 'available', bench_since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'r4', name: 'David Lee', email: 'david@company.com', role: 'DevOps Engineer', skills: 'Docker,Kubernetes,AWS,CI/CD', availability: 100, current_utilization: 100, status: 'allocated', bench_since: null },
        { id: 'r5', name: 'Emma Wilson', email: 'emma@company.com', role: 'Data Scientist', skills: 'Python,Machine Learning,TensorFlow,SQL', availability: 100, current_utilization: 50, status: 'allocated', bench_since: null },
        { id: 'r6', name: 'Frank Brown', email: 'frank@company.com', role: 'UI/UX Designer', skills: 'Figma,Adobe XD,User Research,Prototyping', availability: 100, current_utilization: 0, status: 'available', bench_since: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'r7', name: 'Grace Taylor', email: 'grace@company.com', role: 'QA Engineer', skills: 'Selenium,Jest,Test Automation,API Testing', availability: 100, current_utilization: 60, status: 'allocated', bench_since: null },
        { id: 'r8', name: 'Henry Martinez', email: 'henry@company.com', role: 'Mobile Developer', skills: 'React Native,iOS,Android,Flutter', availability: 100, current_utilization: 0, status: 'available', bench_since: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
      ];

      const stmt = this.db.prepare(`
        INSERT INTO resources (id, name, email, role, skills, availability, current_utilization, status, bench_since)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const resource of sampleResources) {
        stmt.run([
          resource.id, resource.name, resource.email, resource.role,
          resource.skills, resource.availability, resource.current_utilization,
          resource.status, resource.bench_since
        ]);
      }
      stmt.free();

      const sampleProjects = [
        { id: 'p1', name: 'E-Commerce Platform', description: 'Build a modern e-commerce platform', required_skills: 'React,Node.js,MySQL', required_resources: 2, priority: 'high', start_date: new Date().toISOString(), end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'active' },
        { id: 'p2', name: 'Mobile Banking App', description: 'Develop a secure mobile banking application', required_skills: 'React Native,Security,API Integration', required_resources: 1, priority: 'high', start_date: new Date().toISOString(), end_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(), status: 'planning' },
        { id: 'p3', name: 'Data Analytics Dashboard', description: 'Create analytics dashboard for business intelligence', required_skills: 'Python,Machine Learning,Data Visualization', required_resources: 1, priority: 'medium', start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), status: 'planning' },
        { id: 'p4', name: 'Cloud Migration', description: 'Migrate legacy systems to cloud infrastructure', required_skills: 'AWS,Docker,Kubernetes', required_resources: 1, priority: 'medium', start_date: new Date().toISOString(), end_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), status: 'active' },
      ];

      const projectStmt = this.db.prepare(`
        INSERT INTO projects (id, name, description, required_skills, required_resources, priority, start_date, end_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const project of sampleProjects) {
        projectStmt.run([
          project.id, project.name, project.description, project.required_skills,
          project.required_resources, project.priority, project.start_date,
          project.end_date, project.status
        ]);
      }
      projectStmt.free();
    }
  }

  // Resource operations
  getAllResources() {
    const result = this.db.exec('SELECT * FROM resources ORDER BY name');
    return this.resultToObjects(result);
  }

  getResourceById(id) {
    const stmt = this.db.prepare('SELECT * FROM resources WHERE id = ?');
    stmt.bind([id]);
    const result = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    return result[0] || null;
  }

  getBenchResources() {
    const stmt = this.db.prepare('SELECT * FROM resources WHERE status = ? ORDER BY bench_since ASC');
    stmt.bind(['available']);
    const result = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    return result;
  }

  createResource(resource) {
    const stmt = this.db.prepare(`
      INSERT INTO resources (id, name, email, role, skills, availability, current_utilization, status, bench_since)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run([
      resource.id, resource.name, resource.email, resource.role,
      resource.skills, resource.availability || 100, resource.current_utilization || 0,
      resource.status || 'available', resource.bench_since || new Date().toISOString()
    ]);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  updateResource(id, updates) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    const stmt = this.db.prepare(`UPDATE resources SET ${fields} WHERE id = ?`);
    stmt.run(values);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  deleteResource(id) {
    const stmt = this.db.prepare('DELETE FROM resources WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  // Project operations
  getAllProjects() {
    const result = this.db.exec('SELECT * FROM projects ORDER BY priority DESC, created_at DESC');
    return this.resultToObjects(result);
  }

  getProjectById(id) {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    stmt.bind([id]);
    const result = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    return result[0] || null;
  }

  createProject(project) {
    const stmt = this.db.prepare(`
      INSERT INTO projects (id, name, description, required_skills, required_resources, priority, start_date, end_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run([
      project.id, project.name, project.description, project.required_skills,
      project.required_resources || 1, project.priority || 'medium',
      project.start_date, project.end_date, project.status || 'planning'
    ]);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  updateProject(id, updates) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    const stmt = this.db.prepare(`UPDATE projects SET ${fields} WHERE id = ?`);
    stmt.run(values);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  deleteProject(id) {
    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  // Allocation operations
  getAllAllocations() {
    const result = this.db.exec(`
      SELECT a.*, r.name as resource_name, p.name as project_name
      FROM allocations a
      JOIN resources r ON a.resource_id = r.id
      JOIN projects p ON a.project_id = p.id
      WHERE a.status = 'active'
      ORDER BY a.created_at DESC
    `);
    return this.resultToObjects(result);
  }

  createAllocation(allocation) {
    const stmt = this.db.prepare(`
      INSERT INTO allocations (id, resource_id, project_id, allocation_percentage, start_date, end_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run([
      allocation.id, allocation.resource_id, allocation.project_id,
      allocation.allocation_percentage || 100, allocation.start_date,
      allocation.end_date, allocation.status || 'active'
    ]);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  updateAllocation(id, updates) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    const stmt = this.db.prepare(`UPDATE allocations SET ${fields} WHERE id = ?`);
    stmt.run(values);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  deleteAllocation(id) {
    const stmt = this.db.prepare('DELETE FROM allocations WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  // Recommendations operations
  getAllRecommendations() {
    const stmt = this.db.prepare('SELECT * FROM recommendations WHERE status = ? ORDER BY priority DESC, created_at DESC');
    stmt.bind(['pending']);
    const result = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    return result;
  }

  createRecommendation(recommendation) {
    const stmt = this.db.prepare(`
      INSERT INTO recommendations (id, type, resource_id, project_id, description, priority, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run([
      recommendation.id, recommendation.type, recommendation.resource_id,
      recommendation.project_id, recommendation.description,
      recommendation.priority || 'medium', recommendation.status || 'pending'
    ]);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  updateRecommendation(id, updates) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    const stmt = this.db.prepare(`UPDATE recommendations SET ${fields} WHERE id = ?`);
    stmt.run(values);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  clearRecommendations() {
    this.db.run('DELETE FROM recommendations');
    this.save();
    return { changes: 1 };
  }

  // Helper to convert sql.js results to objects
  resultToObjects(result) {
    if (!result || result.length === 0) return [];
    const columns = result[0].columns;
    const values = result[0].values;
    return values.map(row => {
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
  }

  close() {
    if (this.db) {
      this.save();
      this.db.close();
    }
  }
}

module.exports = ResourceDatabase;
