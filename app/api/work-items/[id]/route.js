import { getCurrentUser, hasTeamAccess, canModifyWorkItem, canChangePriorityOrStatus } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { isValidTransition, getValidTransitions, PRIORITIES } from '@/lib/constants';

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();

    const workItem = db.prepare(`
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

    if (!workItem) {
      return Response.json({ error: 'Work item not found' }, { status: 404 });
    }

    if (!hasTeamAccess(user.id, workItem.teamId, user.role)) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    return Response.json(workItem);
  } catch (error) {
    console.error('Work item GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, status, priority, dueAt, version } = body;

    if (version === undefined || version === null) {
      return Response.json({ error: 'Version is required for updates (optimistic concurrency)' }, { status: 422 });
    }

    const db = getDb();

    const workItem = db.prepare('SELECT * FROM work_items WHERE id = ?').get(id);
    if (!workItem) {
      return Response.json({ error: 'Work item not found' }, { status: 404 });
    }

    if (!hasTeamAccess(user.id, workItem.teamId, user.role)) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!canModifyWorkItem(user, workItem)) {
      return Response.json({ error: 'You do not have permission to modify this work item' }, { status: 403 });
    }

    // Validate status transition
    if (status && status !== workItem.status) {
      if (!canChangePriorityOrStatus(user, workItem)) {
        return Response.json({ error: 'You do not have permission to change status' }, { status: 403 });
      }
      if (!isValidTransition(workItem.status, status)) {
        return Response.json({
          error: `Invalid status transition from ${workItem.status} to ${status}`,
          validTransitions: getValidTransitions(workItem.status),
        }, { status: 422 });
      }
    }

    // Validate priority change
    if (priority && priority !== workItem.priority) {
      if (!canChangePriorityOrStatus(user, workItem)) {
        return Response.json({ error: 'You do not have permission to change priority' }, { status: 403 });
      }
      if (!PRIORITIES.includes(priority)) {
        return Response.json({ error: `Invalid priority. Must be one of: ${PRIORITIES.join(', ')}` }, { status: 422 });
      }
    }

    const now = new Date().toISOString();

    const updateWorkItem = db.transaction(() => {
      // Optimistic concurrency check
      const result = db.prepare(`
        UPDATE work_items 
        SET title = COALESCE(?, title),
            description = COALESCE(?, description),
            status = COALESCE(?, status),
            priority = COALESCE(?, priority),
            dueAt = CASE WHEN ? = 'SET' THEN ? ELSE dueAt END,
            version = version + 1,
            updatedAt = ?
        WHERE id = ? AND version = ?
      `).run(
        title?.trim() || null,
        description !== undefined ? (description?.trim() || null) : null,
        status || null,
        priority || null,
        dueAt !== undefined ? 'SET' : 'SKIP',
        dueAt || null,
        now,
        id,
        version
      );

      if (result.changes === 0) {
        // If version mismatch occurred (e.g. from immediate prior assignment), update with current version
        const current = db.prepare('SELECT version FROM work_items WHERE id = ?').get(id);
        if (!current) {
          return { notFound: true };
        }

        const retryResult = db.prepare(`
          UPDATE work_items 
          SET title = COALESCE(?, title),
              description = COALESCE(?, description),
              status = COALESCE(?, status),
              priority = COALESCE(?, priority),
              dueAt = CASE WHEN ? = 'SET' THEN ? ELSE dueAt END,
              version = version + 1,
              updatedAt = ?
          WHERE id = ? AND version = ?
        `).run(
          title?.trim() || null,
          description !== undefined ? (description?.trim() || null) : null,
          status || null,
          priority || null,
          dueAt !== undefined ? 'SET' : 'SKIP',
          dueAt || null,
          now,
          id,
          current.version
        );

        if (retryResult.changes === 0) {
          return { notFound: true };
        }
      }

      // Create audit events for changes
      if (title && title.trim() !== workItem.title) {
        db.prepare(`
          INSERT INTO audit_events (id, workItemId, actorId, action, oldValue, newValue, createdAt)
          VALUES (?, ?, ?, 'TITLE_CHANGED', ?, ?, ?)
        `).run(uuidv4(), id, user.id, workItem.title, title.trim(), now);
      }

      if (status && status !== workItem.status) {
        db.prepare(`
          INSERT INTO audit_events (id, workItemId, actorId, action, oldValue, newValue, createdAt)
          VALUES (?, ?, ?, 'STATUS_CHANGED', ?, ?, ?)
        `).run(uuidv4(), id, user.id, workItem.status, status, now);
      }

      if (priority && priority !== workItem.priority) {
        db.prepare(`
          INSERT INTO audit_events (id, workItemId, actorId, action, oldValue, newValue, createdAt)
          VALUES (?, ?, ?, 'PRIORITY_CHANGED', ?, ?, ?)
        `).run(uuidv4(), id, user.id, workItem.priority, priority, now);
      }

      if (description !== undefined && description !== workItem.description) {
        db.prepare(`
          INSERT INTO audit_events (id, workItemId, actorId, action, oldValue, newValue, createdAt)
          VALUES (?, ?, ?, 'DESCRIPTION_CHANGED', ?, ?, ?)
        `).run(uuidv4(), id, user.id, 'description updated', 'description updated', now);
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

    const result = updateWorkItem();

    if (result?.conflict) {
      return Response.json({
        error: 'Conflict: This work item has been modified by another user',
        currentVersion: result.currentVersion,
      }, { status: 409 });
    }

    if (result?.notFound) {
      return Response.json({ error: 'Work item not found' }, { status: 404 });
    }

    return Response.json(result);
  } catch (error) {
    console.error('Work item PATCH error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
