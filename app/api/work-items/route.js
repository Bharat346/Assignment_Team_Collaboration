import { getCurrentUser, getUserTeamIds, hasTeamAccess } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { STATUSES, PRIORITIES } from '@/lib/constants';

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;
    
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const teamId = searchParams.get('teamId');
    const assigneeId = searchParams.get('assigneeId');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const view = searchParams.get('view'); // 'my', 'unassigned', 'overdue', 'critical', 'blocked'

    const allowedTeamIds = getUserTeamIds(user.id, user.role);
    
    if (allowedTeamIds.length === 0) {
      return Response.json({ items: [], total: 0, page, limit });
    }

    let conditions = [];
    let params = [];

    // Team access restriction
    const placeholders = allowedTeamIds.map(() => '?').join(',');
    conditions.push(`wi.teamId IN (${placeholders})`);
    params.push(...allowedTeamIds);

    // Filters
    if (status && STATUSES.includes(status)) {
      conditions.push('wi.status = ?');
      params.push(status);
    }

    if (priority && PRIORITIES.includes(priority)) {
      conditions.push('wi.priority = ?');
      params.push(priority);
    }

    if (teamId) {
      if (!hasTeamAccess(user.id, teamId, user.role)) {
        return Response.json({ error: 'Access denied to this team' }, { status: 403 });
      }
      conditions.push('wi.teamId = ?');
      params.push(teamId);
    }

    if (assigneeId) {
      conditions.push('wi.assigneeId = ?');
      params.push(assigneeId);
    }

    if (search) {
      conditions.push('(wi.title LIKE ? OR wi.description LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    // View-specific filters
    if (view === 'my') {
      conditions.push('wi.assigneeId = ?');
      params.push(user.id);
    } else if (view === 'unassigned') {
      conditions.push('wi.assigneeId IS NULL');
    } else if (view === 'overdue') {
      conditions.push("wi.dueAt < datetime('now') AND wi.status NOT IN ('RESOLVED', 'CLOSED')");
    } else if (view === 'critical') {
      conditions.push("wi.priority IN ('CRITICAL', 'HIGH') AND wi.status NOT IN ('RESOLVED', 'CLOSED')");
    } else if (view === 'blocked') {
      conditions.push("wi.status = 'BLOCKED'");
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validate sort
    const allowedSorts = ['updatedAt', 'createdAt', 'priority', 'status', 'title', 'dueAt'];
    const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'updatedAt';
    const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Priority sort uses a custom ordering
    let orderClause;
    if (safeSortBy === 'priority') {
      orderClause = `ORDER BY CASE wi.priority 
        WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 
        WHEN 'MEDIUM' THEN 3 WHEN 'LOW' THEN 4 END ${safeSortOrder}`;
    } else {
      orderClause = `ORDER BY wi.${safeSortBy} ${safeSortOrder}`;
    }

    const db = getDb();

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as total FROM work_items wi ${whereClause}
    `).get(...params);

    // Get items with joins
    const items = db.prepare(`
      SELECT 
        wi.*,
        creator.name as creatorName,
        creator.email as creatorEmail,
        assignee.name as assigneeName,
        assignee.email as assigneeEmail,
        team.name as teamName
      FROM work_items wi
      LEFT JOIN users creator ON wi.createdById = creator.id
      LEFT JOIN users assignee ON wi.assigneeId = assignee.id
      LEFT JOIN teams team ON wi.teamId = team.id
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return Response.json({
      items,
      total: countResult.total,
      page,
      limit,
      totalPages: Math.ceil(countResult.total / limit),
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('Work items GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, priority, teamId, assigneeId, dueAt } = body;
    const idempotencyKey = request.headers.get('Idempotency-Key') || body.idempotencyKey;

    // Validate required fields
    if (!title?.trim()) {
      return Response.json({ error: 'Title is required' }, { status: 422 });
    }
    if (!teamId) {
      return Response.json({ error: 'Team is required' }, { status: 422 });
    }

    // Check team access
    if (!hasTeamAccess(user.id, teamId, user.role)) {
      return Response.json({ error: 'You do not have access to this team' }, { status: 403 });
    }

    // Validate priority
    if (priority && !PRIORITIES.includes(priority)) {
      return Response.json({ error: `Invalid priority. Must be one of: ${PRIORITIES.join(', ')}` }, { status: 422 });
    }

    const db = getDb();

    // Check idempotency
    if (idempotencyKey) {
      const existing = db.prepare(
        'SELECT result FROM idempotency_keys WHERE key = ? AND userId = ? AND operation = ?'
      ).get(idempotencyKey, user.id, 'CREATE_WORK_ITEM');

      if (existing) {
        return Response.json(JSON.parse(existing.result), { status: 200 });
      }
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    // Transactional create
    const createWorkItem = db.transaction(() => {
      db.prepare(`
        INSERT INTO work_items (id, title, description, status, priority, teamId, assigneeId, createdById, dueAt, version, createdAt, updatedAt)
        VALUES (?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(id, title.trim(), description?.trim() || null, priority || 'MEDIUM', teamId, assigneeId || null, user.id, dueAt || null, now, now);

      // Create audit event
      db.prepare(`
        INSERT INTO audit_events (id, workItemId, actorId, action, oldValue, newValue, createdAt)
        VALUES (?, ?, ?, 'CREATED', NULL, ?, ?)
      `).run(uuidv4(), id, user.id, JSON.stringify({ title: title.trim(), priority: priority || 'MEDIUM', teamId }), now);

      if (assigneeId) {
        db.prepare(`
          INSERT INTO audit_events (id, workItemId, actorId, action, oldValue, newValue, createdAt)
          VALUES (?, ?, ?, 'ASSIGNED', NULL, ?, ?)
        `).run(uuidv4(), id, user.id, assigneeId, now);
      }

      // Save idempotency key
      if (idempotencyKey) {
        const result = { id, title: title.trim(), status: 'OPEN', priority: priority || 'MEDIUM' };
        db.prepare(
          'INSERT INTO idempotency_keys (key, userId, operation, result) VALUES (?, ?, ?, ?)'
        ).run(idempotencyKey, user.id, 'CREATE_WORK_ITEM', JSON.stringify(result));
      }

      return db.prepare(`
        SELECT 
          wi.*,
          creator.name as creatorName,
          creator.email as creatorEmail,
          assignee.name as assigneeName,
          assignee.email as assigneeEmail,
          team.name as teamName
        FROM work_items wi
        LEFT JOIN users creator ON wi.createdById = creator.id
        LEFT JOIN users assignee ON wi.assigneeId = assignee.id
        LEFT JOIN teams team ON wi.teamId = team.id
        WHERE wi.id = ?
      `).get(id);
    });

    const workItem = createWorkItem();

    return Response.json(workItem, { status: 201 });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('Work items POST error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
