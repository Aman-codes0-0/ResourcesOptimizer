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
    // Users table for authentication
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT DEFAULT 'viewer',
        resource_id TEXT,
        is_active INTEGER DEFAULT 1,
        last_login TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resource_id) REFERENCES resources(id)
      )
    `);

    // Sessions table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL,
        refresh_token TEXT,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Audit log table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        old_value TEXT,
        new_value TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Notifications table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        priority TEXT DEFAULT 'medium',
        is_read INTEGER DEFAULT 0,
        action_url TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        read_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

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
        hourly_rate REAL DEFAULT 0,
        department TEXT,
        location TEXT,
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
        budget REAL DEFAULT 0,
        actual_cost REAL DEFAULT 0,
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

    // Skills matrix table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS skills_matrix (
        id TEXT PRIMARY KEY,
        resource_id TEXT NOT NULL,
        skill_name TEXT NOT NULL,
        proficiency_level INTEGER DEFAULT 1,
        years_of_experience REAL DEFAULT 0,
        last_used TEXT,
        endorsed_by TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resource_id) REFERENCES resources(id)
      )
    `);

    // Certifications table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS certifications (
        id TEXT PRIMARY KEY,
        resource_id TEXT NOT NULL,
        certification_name TEXT NOT NULL,
        issuing_organization TEXT,
        issue_date TEXT,
        expiry_date TEXT,
        credential_id TEXT,
        credential_url TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resource_id) REFERENCES resources(id)
      )
    `);

    // Training records table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS training_records (
        id TEXT PRIMARY KEY,
        resource_id TEXT NOT NULL,
        training_name TEXT NOT NULL,
        training_type TEXT,
        provider TEXT,
        start_date TEXT,
        completion_date TEXT,
        status TEXT DEFAULT 'in_progress',
        cost REAL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resource_id) REFERENCES resources(id)
      )
    `);

    // Comments table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        comment_text TEXT NOT NULL,
        mentions TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Attachments table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS attachments (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        mime_type TEXT,
        uploaded_by TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
      )
    `);

    // Resource requests table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS resource_requests (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        requested_by TEXT NOT NULL,
        required_skills TEXT NOT NULL,
        required_count INTEGER DEFAULT 1,
        allocation_percentage INTEGER DEFAULT 100,
        start_date TEXT NOT NULL,
        end_date TEXT,
        priority TEXT DEFAULT 'medium',
        justification TEXT,
        status TEXT DEFAULT 'pending',
        approved_by TEXT,
        approved_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (requested_by) REFERENCES users(id),
        FOREIGN KEY (approved_by) REFERENCES users(id)
      )
    `);

    // Dashboard layouts table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS dashboard_layouts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        layout_name TEXT NOT NULL,
        layout_config TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Cost tracking table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS cost_tracking (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        resource_id TEXT,
        cost_type TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
        description TEXT,
        recorded_date TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (resource_id) REFERENCES resources(id)
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

  // User operations
  getAllUsers() {
    const result = this.db.exec('SELECT id, username, email, full_name, role, resource_id, is_active, last_login, created_at FROM users ORDER BY created_at DESC');
    return this.resultToObjects(result);
  }

  getUserById(id) {
    const stmt = this.db.prepare('SELECT id, username, email, full_name, role, resource_id, is_active, last_login, created_at FROM users WHERE id = ?');
    stmt.bind([id]);
    const result = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    return result[0] || null;
  }

  getUserByUsername(username) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
    stmt.bind([username]);
    const result = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    return result[0] || null;
  }

  getUserByEmail(email) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    stmt.bind([email]);
    const result = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    return result[0] || null;
  }

  createUser(user) {
    const stmt = this.db.prepare(`
      INSERT INTO users (id, username, email, password_hash, full_name, role, resource_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run([
      user.id, user.username, user.email, user.password_hash,
      user.full_name, user.role || 'viewer', user.resource_id || null,
      user.is_active !== undefined ? user.is_active : 1
    ]);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  updateUser(id, updates) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    const stmt = this.db.prepare(`UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
    stmt.run(values);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  updateUserLastLogin(id) {
    const stmt = this.db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  deleteUser(id) {
    const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  // Notification operations
  getAllNotifications(userId = null) {
    let query = 'SELECT * FROM notifications';
    if (userId) {
      query += ' WHERE user_id = ? OR user_id IS NULL';
    }
    query += ' ORDER BY created_at DESC LIMIT 100';

    if (userId) {
      const stmt = this.db.prepare(query);
      stmt.bind([userId]);
      const result = [];
      while (stmt.step()) {
        result.push(stmt.getAsObject());
      }
      stmt.free();
      return result;
    } else {
      const result = this.db.exec(query);
      return this.resultToObjects(result);
    }
  }

  getUnreadNotifications(userId) {
    const stmt = this.db.prepare('SELECT * FROM notifications WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0 ORDER BY created_at DESC');
    stmt.bind([userId]);
    const result = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    return result;
  }

  createNotification(notification) {
    const stmt = this.db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, priority, action_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run([
      notification.id, notification.user_id || null, notification.type,
      notification.title, notification.message, notification.priority || 'medium',
      notification.action_url || null
    ]);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  markNotificationAsRead(id) {
    const stmt = this.db.prepare('UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  markAllNotificationsAsRead(userId) {
    const stmt = this.db.prepare('UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_read = 0');
    stmt.run([userId]);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  deleteNotification(id) {
    const stmt = this.db.prepare('DELETE FROM notifications WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  // Audit log operations
  createAuditLog(log) {
    const stmt = this.db.prepare(`
      INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run([
      log.user_id || null, log.action, log.entity_type, log.entity_id || null,
      log.old_value || null, log.new_value || null, log.ip_address || null, log.user_agent || null
    ]);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  getAuditLogs(filters = {}) {
    let query = 'SELECT * FROM audit_log WHERE 1=1';
    const params = [];

    if (filters.user_id) {
      query += ' AND user_id = ?';
      params.push(filters.user_id);
    }
    if (filters.entity_type) {
      query += ' AND entity_type = ?';
      params.push(filters.entity_type);
    }
    if (filters.entity_id) {
      query += ' AND entity_id = ?';
      params.push(filters.entity_id);
    }
    if (filters.start_date) {
      query += ' AND created_at >= ?';
      params.push(filters.start_date);
    }
    if (filters.end_date) {
      query += ' AND created_at <= ?';
      params.push(filters.end_date);
    }

    query += ' ORDER BY created_at DESC LIMIT 1000';

    if (params.length > 0) {
      const stmt = this.db.prepare(query);
      stmt.bind(params);
      const result = [];
      while (stmt.step()) {
        result.push(stmt.getAsObject());
      }
      stmt.free();
      return result;
    } else {
      const result = this.db.exec(query);
      return this.resultToObjects(result);
    }
  }

  // Skills matrix operations
  getSkillsByResourceId(resourceId) {
    const stmt = this.db.prepare('SELECT * FROM skills_matrix WHERE resource_id = ? ORDER BY proficiency_level DESC');
    stmt.bind([resourceId]);
    const result = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    return result;
  }

  createSkill(skill) {
    const stmt = this.db.prepare(`
      INSERT INTO skills_matrix (id, resource_id, skill_name, proficiency_level, years_of_experience, last_used, endorsed_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run([
      skill.id, skill.resource_id, skill.skill_name, skill.proficiency_level || 1,
      skill.years_of_experience || 0, skill.last_used || null, skill.endorsed_by || null
    ]);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  updateSkill(id, updates) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    const stmt = this.db.prepare(`UPDATE skills_matrix SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
    stmt.run(values);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  deleteSkill(id) {
    const stmt = this.db.prepare('DELETE FROM skills_matrix WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  // Certification operations
  getCertificationsByResourceId(resourceId) {
    const stmt = this.db.prepare('SELECT * FROM certifications WHERE resource_id = ? ORDER BY issue_date DESC');
    stmt.bind([resourceId]);
    const result = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    return result;
  }

  createCertification(cert) {
    const stmt = this.db.prepare(`
      INSERT INTO certifications (id, resource_id, certification_name, issuing_organization, issue_date, expiry_date, credential_id, credential_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run([
      cert.id, cert.resource_id, cert.certification_name, cert.issuing_organization || null,
      cert.issue_date || null, cert.expiry_date || null, cert.credential_id || null,
      cert.credential_url || null, cert.status || 'active'
    ]);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  updateCertification(id, updates) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    const stmt = this.db.prepare(`UPDATE certifications SET ${fields} WHERE id = ?`);
    stmt.run(values);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  deleteCertification(id) {
    const stmt = this.db.prepare('DELETE FROM certifications WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  // Comment operations
  getCommentsByEntity(entityType, entityId) {
    const stmt = this.db.prepare(`
      SELECT c.*, u.full_name as user_name, u.username
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.entity_type = ? AND c.entity_id = ?
      ORDER BY c.created_at DESC
    `);
    stmt.bind([entityType, entityId]);
    const result = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    return result;
  }

  createComment(comment) {
    const stmt = this.db.prepare(`
      INSERT INTO comments (id, entity_type, entity_id, user_id, comment_text, mentions)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run([
      comment.id, comment.entity_type, comment.entity_id, comment.user_id,
      comment.comment_text, comment.mentions || null
    ]);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  updateComment(id, commentText) {
    const stmt = this.db.prepare('UPDATE comments SET comment_text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run([commentText, id]);
    stmt.free();
    this.save();
    return { changes: 1 };
  }

  deleteComment(id) {
    const stmt = this.db.prepare('DELETE FROM comments WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    this.save();
    return { changes: 1 };
  }


  close() {
    if (this.db) {
      this.save();
      this.db.close();
    }
  }
}

module.exports = ResourceDatabase;
