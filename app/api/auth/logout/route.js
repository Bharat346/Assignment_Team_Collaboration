import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session_id')?.value;

    if (sessionId) {
      const db = getDb();
      db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    }

    cookieStore.delete('session_id');

    return Response.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
