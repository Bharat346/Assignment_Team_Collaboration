import { getDb } from './db';
import { cookies } from 'next/headers';

/**
 * Get the current authenticated user from the session cookie.
 * Returns null if not authenticated.
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;
  
  if (!sessionId) return null;
  
  const db = getDb();
  const session = db.prepare(`
    SELECT s.*, u.id as userId, u.name, u.email, u.role
    FROM sessions s
    JOIN users u ON s.userId = u.id
    WHERE s.id = ? AND s.expiresAt > datetime('now')
  `).get(sessionId);
  
  if (!session) return null;
  
  return {
    id: session.userId,
    name: session.name,
    email: session.email,
    role: session.role,
  };
}

/**
 * Require authentication. Returns user or throws 401 response.
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return user;
}

/**
 * Check if user has access to a team
 */
export function hasTeamAccess(userId, teamId, userRole) {
  if (userRole === 'ADMIN') return true;
  
  const db = getDb();
  const membership = db.prepare(
    'SELECT * FROM team_members WHERE userId = ? AND teamId = ?'
  ).get(userId, teamId);
  
  return !!membership;
}

/**
 * Get user's role within a specific team
 */
export function getTeamRole(userId, teamId, userRole) {
  if (userRole === 'ADMIN') return 'ADMIN';
  
  const db = getDb();
  const membership = db.prepare(
    'SELECT role FROM team_members WHERE userId = ? AND teamId = ?'
  ).get(userId, teamId);
  
  return membership?.role || null;
}

/**
 * Check if user can modify a work item
 */
export function canModifyWorkItem(user, workItem) {
  if (user.role === 'ADMIN') return true;
  
  const teamRole = getTeamRole(user.id, workItem.teamId, user.role);
  return !!teamRole;
}

/**
 * Check if user can assign work items in a team
 */
export function canAssignWork(user, teamId) {
  if (user.role === 'ADMIN') return true;
  
  const teamRole = getTeamRole(user.id, teamId, user.role);
  return !!teamRole;
}

/**
 * Check if user can change priority/status of work items in a team
 */
export function canChangePriorityOrStatus(user, workItem) {
  if (user.role === 'ADMIN') return true;
  
  const teamRole = getTeamRole(user.id, workItem.teamId, user.role);
  return !!teamRole;
}

/**
 * Get all team IDs the user is a member of
 */
export function getUserTeamIds(userId, userRole) {
  if (userRole === 'ADMIN') {
    const db = getDb();
    return db.prepare('SELECT id FROM teams').all().map(t => t.id);
  }
  
  const db = getDb();
  return db.prepare(
    'SELECT teamId FROM team_members WHERE userId = ?'
  ).all(userId).map(t => t.teamId);
}
