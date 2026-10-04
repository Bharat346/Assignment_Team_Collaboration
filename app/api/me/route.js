import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const db = getDb();
    
    // Get user's team memberships
    const teams = db.prepare(`
      SELECT t.id, t.name, tm.role as teamRole
      FROM teams t
      JOIN team_members tm ON t.id = tm.teamId
      WHERE tm.userId = ?
    `).all(user.id);

    return Response.json({
      ...user,
      teams,
    });
  } catch (error) {
    console.error('Me error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
