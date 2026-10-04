import { getCurrentUser, hasTeamAccess, canAssignWork } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { assigneeId, version } = body;

    if (version === undefined || version === null) {
      return Response.json({ error: 'Version is required for assignment (optimistic concurrency)' }, { status: 422 });
    }

    const db = getDb();

    const workItem = db.prepare('SELECT * FROM work_items WHERE id = ?').get(id);
    if (!workItem) {
      return Response.json({ error: 'Work item not found' }, { status: 404 });
    }

    if (!hasTeamAccess(user.id, workItem.teamId, user.role)) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!canAssignWork(user, workItem.teamId)) {
      // Members can self-assign unassigned items
      if (workItem.assigneeId !== null || assigneeId !== user.id) {
        return Response.json({ error: 'You do not have permission to assign work items' }, { status: 403 });
      }
    }

    // Validate assignee is a team member
    if (assigneeId) {
      const isMember = db.prepare(
        'SELECT 1 FROM team_members WHERE userId = ? AND teamId = ?'
      ).get(assigneeId, workItem.teamId);
      
      if (!isMember) {
        return Response.json({ error: 'Assignee is not a member of this team' }, { status: 422 });
      }
    }

    const now = new Date().toISOString();

    const assignWorkItem = db.transaction(() => {
      // Atomic concurrent assignment with version check
      const result = db.prepare(`
        UPDATE work_items 
        SET assigneeId = ?,
            version = version + 1,
            updatedAt = ?
        WHERE id = ? AND version = ?
      `).run(assigneeId || null, now, id, version);

      if (result.changes === 0) {
        const current = db.prepare('SELECT version, assigneeId FROM work_items WHERE id = ?').get(id);
        if (current) {
          if (current.version !== version) {
            const assignee = current.assigneeId 
              ? db.prepare('SELECT name FROM users WHERE id = ?').get(current.assigneeId)
              : null;
            return { 
              conflict: true, 
              currentVersion: current.version,
              currentAssignee: assignee?.name || null
            };
          }
        }
        return { notFound: true };
      }

      // Audit event
      const oldAssignee = workItem.assigneeId 
        ? db.prepare('SELECT name FROM users WHERE id = ?').get(workItem.assigneeId)?.name 
        : null;
      const newAssignee = assigneeId 
        ? db.prepare('SELECT name FROM users WHERE id = ?').get(assigneeId)?.name 
        : null;

      db.prepare(`
        INSERT INTO audit_events (id, workItemId, actorId, action, oldValue, newValue, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(), id, user.id, 
        assigneeId ? 'ASSIGNED' : 'UNASSIGNED',
        oldAssignee || 'unassigned',
        newAssignee || 'unassigned',
        now
      );

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

    const result = assignWorkItem();

    if (result?.conflict) {
      return Response.json({
        error: `Conflict: This work item has already been ${result.currentAssignee ? `assigned to ${result.currentAssignee}` : 'modified'} by another user`,
        currentVersion: result.currentVersion,
      }, { status: 409 });
    }

    if (result?.notFound) {
      return Response.json({ error: 'Work item not found' }, { status: 404 });
    }

    return Response.json(result);
  } catch (error) {
    console.error('Assign error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
