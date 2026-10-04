import { getDb } from '../lib/db.js';
import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

function seed() {
  const db = getDb();

  // Clear existing data
  db.exec(`
    DELETE FROM audit_events;
    DELETE FROM comments;
    DELETE FROM idempotency_keys;
    DELETE FROM sessions;
    DELETE FROM work_items;
    DELETE FROM team_members;
    DELETE FROM teams;
    DELETE FROM users;
  `);

  const passwordHash = bcryptjs.hashSync('password123', 10);

  // Create users
  const users = [
    { id: uuidv4(), name: 'Alice Johnson', email: 'alice@newtonite.com', role: 'ADMIN' },
    { id: uuidv4(), name: 'Bob Smith', email: 'bob@newtonite.com', role: 'MEMBER' },
    { id: uuidv4(), name: 'Carol Davis', email: 'carol@newtonite.com', role: 'MEMBER' },
    { id: uuidv4(), name: 'Dave Wilson', email: 'dave@newtonite.com', role: 'MEMBER' },
    { id: uuidv4(), name: 'Eve Martinez', email: 'eve@newtonite.com', role: 'MEMBER' },
  ];

  const insertUser = db.prepare(
    'INSERT INTO users (id, name, email, passwordHash, role) VALUES (?, ?, ?, ?, ?)'
  );
  for (const u of users) {
    insertUser.run(u.id, u.name, u.email, passwordHash, u.role);
  }

  // Create teams
  const teams = [
    { id: uuidv4(), name: 'Engineering' },
    { id: uuidv4(), name: 'Operations' },
    { id: uuidv4(), name: 'Support' },
  ];

  const insertTeam = db.prepare('INSERT INTO teams (id, name) VALUES (?, ?)');
  for (const t of teams) {
    insertTeam.run(t.id, t.name);
  }

  // Add team members
  const insertMember = db.prepare(
    'INSERT INTO team_members (userId, teamId, role) VALUES (?, ?, ?)'
  );
  
  // Alice is admin - she's in all teams
  insertMember.run(users[0].id, teams[0].id, 'ADMIN');
  insertMember.run(users[0].id, teams[1].id, 'ADMIN');
  insertMember.run(users[0].id, teams[2].id, 'ADMIN');
  
  // Bob is Lead of Engineering
  insertMember.run(users[1].id, teams[0].id, 'LEAD');
  
  // Carol is Member of Engineering and Operations
  insertMember.run(users[2].id, teams[0].id, 'MEMBER');
  insertMember.run(users[2].id, teams[1].id, 'MEMBER');
  
  // Dave is Lead of Operations
  insertMember.run(users[3].id, teams[1].id, 'LEAD');
  
  // Eve is Member of Support
  insertMember.run(users[4].id, teams[2].id, 'MEMBER');

  // Create work items
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();
  const yesterday2 = new Date(Date.now() - 2 * 86400000).toISOString();

  const workItems = [
    {
      id: uuidv4(), title: 'Fix production database connection pooling',
      description: 'The connection pool is exhausting under heavy load causing 500 errors. Need to investigate and fix the pooling configuration.',
      status: 'IN_PROGRESS', priority: 'CRITICAL', teamId: teams[0].id,
      assigneeId: users[1].id, createdById: users[0].id, dueAt: yesterday,
    },
    {
      id: uuidv4(), title: 'Implement user onboarding flow',
      description: 'Design and implement the new user onboarding experience with progressive disclosure of features.',
      status: 'OPEN', priority: 'HIGH', teamId: teams[0].id,
      assigneeId: null, createdById: users[1].id, dueAt: nextWeek,
    },
    {
      id: uuidv4(), title: 'Update SSL certificates for staging',
      description: 'SSL certificates for staging environment are expiring next week. Need to renew and deploy.',
      status: 'BLOCKED', priority: 'HIGH', teamId: teams[1].id,
      assigneeId: users[3].id, createdById: users[0].id, dueAt: yesterday2,
    },
    {
      id: uuidv4(), title: 'Refactor authentication middleware',
      description: 'Current auth middleware is monolithic. Break it down into composable pieces.',
      status: 'OPEN', priority: 'MEDIUM', teamId: teams[0].id,
      assigneeId: users[2].id, createdById: users[1].id, dueAt: nextWeek,
    },
    {
      id: uuidv4(), title: 'Migrate monitoring to Grafana',
      description: 'Set up Grafana dashboards and migrate existing monitoring from the legacy system.',
      status: 'IN_PROGRESS', priority: 'MEDIUM', teamId: teams[1].id,
      assigneeId: users[2].id, createdById: users[3].id, dueAt: nextWeek,
    },
    {
      id: uuidv4(), title: 'Resolve customer complaint #4521',
      description: 'Customer reports intermittent data loss when uploading large files. Investigate and resolve.',
      status: 'OPEN', priority: 'HIGH', teamId: teams[2].id,
      assigneeId: users[4].id, createdById: users[4].id, dueAt: yesterday,
    },
    {
      id: uuidv4(), title: 'Write API documentation for v2 endpoints',
      description: 'Document all new v2 REST API endpoints with examples and error codes.',
      status: 'OPEN', priority: 'LOW', teamId: teams[0].id,
      assigneeId: null, createdById: users[1].id, dueAt: null,
    },
    {
      id: uuidv4(), title: 'Set up disaster recovery procedure',
      description: 'Create and document disaster recovery procedures including backup verification and restore testing.',
      status: 'OPEN', priority: 'MEDIUM', teamId: teams[1].id,
      assigneeId: null, createdById: users[0].id, dueAt: nextWeek,
    },
    {
      id: uuidv4(), title: 'Update knowledge base articles',
      description: 'Review and update all knowledge base articles for accuracy after the Q3 product update.',
      status: 'RESOLVED', priority: 'LOW', teamId: teams[2].id,
      assigneeId: users[4].id, createdById: users[4].id, dueAt: twoDaysAgo,
    },
    {
      id: uuidv4(), title: 'Performance audit of search feature',
      description: 'Search queries are taking >2s for some users. Profile and optimize database queries and indexing.',
      status: 'OPEN', priority: 'HIGH', teamId: teams[0].id,
      assigneeId: users[1].id, createdById: users[0].id, dueAt: nextWeek,
    },
  ];

  const insertWorkItem = db.prepare(`
    INSERT INTO work_items (id, title, description, status, priority, teamId, assigneeId, createdById, dueAt, version, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const insertAudit = db.prepare(`
    INSERT INTO audit_events (id, workItemId, actorId, action, oldValue, newValue, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertComment = db.prepare(`
    INSERT INTO comments (id, workItemId, userId, body, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const wi of workItems) {
    insertWorkItem.run(
      wi.id, wi.title, wi.description, wi.status, wi.priority,
      wi.teamId, wi.assigneeId, wi.createdById, wi.dueAt,
      twoDaysAgo, twoDaysAgo
    );

    // Create audit event for creation
    insertAudit.run(
      uuidv4(), wi.id, wi.createdById, 'CREATED',
      null, JSON.stringify({ title: wi.title, status: wi.status, priority: wi.priority }),
      twoDaysAgo
    );
  }

  // Add some comments
  insertComment.run(uuidv4(), workItems[0].id, users[0].id,
    'This is P0 - please investigate immediately and report findings.', twoDaysAgo);
  insertComment.run(uuidv4(), workItems[0].id, users[1].id,
    'Found the issue - connection pool max is set too low. Working on a fix.', yesterday);
  insertComment.run(uuidv4(), workItems[2].id, users[3].id,
    'Waiting on the certificate authority to issue new certs. ETA 2 business days.', yesterday);
  insertComment.run(uuidv4(), workItems[5].id, users[4].id,
    'Reproduced the issue. It happens with files larger than 50MB on slow connections.', yesterday);

  console.log('✅ Seed data created successfully!');
  console.log(`   Users: ${users.length}`);
  console.log(`   Teams: ${teams.length}`);
  console.log(`   Work Items: ${workItems.length}`);
  console.log('\n📋 Login credentials:');
  for (const u of users) {
    console.log(`   ${u.email} / password123 (${u.role})`);
  }
}

seed();
