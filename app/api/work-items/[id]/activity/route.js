import { getCurrentUser, hasTeamAccess } from '@/lib/auth';
import { getDb } from '@/lib/db';

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

    const activities = db.prepare(`
      SELECT ae.*, u.name as actorName, u.email as actorEmail
      FROM audit_events ae
      JOIN users u ON ae.actorId = u.id
      WHERE ae.workItemId = ?
      ORDER BY ae.createdAt ASC
    `).all(id);

    return Response.json(activities);
  } catch (error) {
    console.error('Activity GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
