import { getDb } from '../config/firebase.js';

export async function getDashboardSummary() {
  const db = getDb();
  // All queries run in parallel for speed
  const [activeSnap, locsSnap, sdsSnap, alertsSnap, auditSnap] = await Promise.all([
    db.collection('reagents').where('archived', '==', false).count().get(),
    db.collection('storage_locations').where('active', '==', true).count().get(),
    db.collection('reagents').where('archived', '==', false).where('sdsStatus', 'in', ['MISSING', 'UNVERIFIED']).count().get(),
    db.collection('safety_alerts').where('status', 'in', ['OPEN', 'PENDING_REVIEW']).count().get().catch(() => null),
    db.collection('audit_log').orderBy('timestamp', 'desc').limit(5).get().catch(() => ({ docs: [] })),
  ]);

  const recentAudit = auditSnap.docs ? auditSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];

  return {
    active:       activeSnap.data().count,
    locations:    locsSnap.data().count,
    missingSds:   sdsSnap.data().count,
    openAlerts:   alertsSnap ? alertsSnap.data().count : 0,
    recentAudit,
  };
}
