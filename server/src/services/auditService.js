import { Timestamp } from 'firebase-admin/firestore';
import { getDb } from '../config/firebase.js';

export const EVENT_TYPE = {
  REAGENT_CREATE:   'REAGENT_CREATE',
  REAGENT_UPDATE:   'REAGENT_UPDATE',
  REAGENT_ARCHIVE:  'REAGENT_ARCHIVE',
  REAGENT_RESTORE:  'REAGENT_RESTORE',
  LOCATION_CREATE:  'LOCATION_CREATE',
  LOCATION_RENAME:  'LOCATION_RENAME',
  LOCATION_DELETE:  'LOCATION_DELETE',
  ALERT_EVALUATION: 'ALERT_EVALUATION',
};

/**
 * Log an audit event to Firestore.
 * @param {string} eventType - One of EVENT_TYPE values
 * @param {string} summary - Human-readable event description
 * @param {object} metadata - Additional context (reagentId, locationId, etc.)
 */
export async function logEvent(eventType, summary, metadata = {}) {
  const db = getDb();
  await db.collection('audit_log').add({
    eventType,
    summary,
    metadata,
    timestamp: Timestamp.now(),
    createdAt: Timestamp.now(),
  });
}

/**
 * Retrieve audit log with optional filtering.
 */
export async function listEvents({ eventType, limit = 50 } = {}) {
  const db = getDb();
  let q = db.collection('audit_log').orderBy('timestamp', 'desc');
  if (eventType) q = q.where('eventType', '==', eventType);
  const snap = await q.limit(Math.min(limit, 200)).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}