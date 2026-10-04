import { getCurrentUser, hasTeamAccess } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();

    const workItem = db.prepare('SELECT teamId FROM work_items WHERE id = ?').get(id);
    if (!workItem) {
      return Response.json({ error: 'Work item not found' }, { status: 404 });
    }

    if (!hasTeamAccess(user.id, workItem.teamId, user.role)) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    const comments = db.prepare(`
      SELECT c.*, u.name as userName, u.email as userEmail
      FROM comments c
      JOIN users u ON c.userId = u.id
      WHERE c.workItemId = ?
      ORDER BY c.createdAt ASC
    `).all(id);

    return Response.json(comments);
  } catch (error) {
    console.error('Comments GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { body: commentBody } = body;

    if (!commentBody?.trim()) {
      return Response.json({ error: 'Comment body is required' }, { status: 422 });
    }

    const db = getDb();

    const workItem = db.prepare('SELECT teamId FROM work_items WHERE id = ?').get(id);
    if (!workItem) {
      return Response.json({ error: 'Work item not found' }, { status: 404 });
    }

    if (!hasTeamAccess(user.id, workItem.teamId, user.role)) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    const commentId = uuidv4();
    const now = new Date().toISOString();

    const createComment = db.transaction(() => {
      db.prepare(`
        INSERT INTO comments (id, workItemId, userId, body, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(commentId, id, user.id, commentBody.trim(), now);

      // Audit event for comment
      db.prepare(`
        INSERT INTO audit_events (id, workItemId, actorId, action, oldValue, newValue, createdAt)
        VALUES (?, ?, ?, 'COMMENTED', NULL, ?, ?)
      `).run(uuidv4(), id, user.id, commentBody.trim().substring(0, 200), now);

      // Update work item timestamp
      db.prepare('UPDATE work_items SET updatedAt = ? WHERE id = ?').run(now, id);

      return db.prepare(`
        SELECT c.*, u.name as userName, u.email as userEmail
        FROM comments c
        JOIN users u ON c.userId = u.id
        WHERE c.id = ?
      `).get(commentId);
    });

    const comment = createComment();
    return Response.json(comment, { status: 201 });
  } catch (error) {
    console.error('Comments POST error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
