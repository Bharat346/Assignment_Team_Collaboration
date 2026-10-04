import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const db = getDb();
    
    let teams;
    if (user.role === 'ADMIN') {
      teams = db.prepare(`
        SELECT t.*, 
          (SELECT COUNT(*) FROM team_members tm WHERE tm.teamId = t.id) as memberCount
        FROM teams t
        ORDER BY t.name
      `).all();
    } else {
      teams = db.prepare(`
        SELECT t.*,
          tm.role as userRole,
          (SELECT COUNT(*) FROM team_members tm2 WHERE tm2.teamId = t.id) as memberCount
        FROM teams t
        JOIN team_members tm ON t.id = tm.teamId AND tm.userId = ?
        ORDER BY t.name
      `).all(user.id);
    }

    // Get members for each team
    const getMembers = db.prepare(`
      SELECT u.id, u.name, u.email, tm.role
      FROM users u
      JOIN team_members tm ON u.id = tm.userId
      WHERE tm.teamId = ?
      ORDER BY u.name
    `);

    const teamsWithMembers = teams.map(team => ({
      ...team,
      members: getMembers.all(team.id),
    }));

    return Response.json(teamsWithMembers);
  } catch (error) {
    console.error('Teams error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
