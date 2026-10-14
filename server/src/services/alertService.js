import { Timestamp } from 'firebase-admin/firestore';
import { getDb } from '../config/firebase.js';
import { evaluate } from './compatibilityEngine.js';
import { RULESET_VERSION } from '../rules/compatibilityRules.js';

export const ALERT_TYPE = {
  MISSING_OR_UNVERIFIED_SDS: 'MISSING_OR_UNVERIFIED_SDS',
  VERIFIED_INCOMPATIBILITY:  'VERIFIED_INCOMPATIBILITY',
  MANUAL_REVIEW_REQUIRED:    'MANUAL_REVIEW_REQUIRED',
};

export const ALERT_STATUS = {
  OPEN:           'OPEN',
  PENDING_REVIEW: 'PENDING_REVIEW',
  CLOSED:         'CLOSED',
};

function now() { return Timestamp.now(); }

function dedupKey(type, reagentId, extra) {
  return type + '|' + reagentId + (extra ? '|' + extra : '');
}

export async function evaluateAllAlerts() {
  const db = getDb();
  const summary = { created: 0, updated: 0, closed: 0, errors: [] };

  let reagents = [];
  try {
    const snap = await db.collection('reagents').where('archived', '==', false).get();
    reagents = snap.docs.map(d => ({ reagentId: d.id, ...d.data() }));
  } catch (err) {
    summary.errors.push('Failed to load reagents: ' + err.message);
    return summary;
  }

  let existingAlerts = [];
  try {
    const snap = await db.collection('safety_alerts')
      .where('status', 'in', [ALERT_STATUS.OPEN, ALERT_STATUS.PENDING_REVIEW])
      .get();
    existingAlerts = snap.docs.map(d => ({ alertId: d.id, ...d.data() }));
  } catch (err) {
    summary.errors.push('Failed to load existing alerts: ' + err.message);
    return summary;
  }

  const existingKeys = new Map();
  existingAlerts.forEach(a => {
    const k = dedupKey(a.type, a.reagentId, a.compartmentId || '');
    existingKeys.set(k, a);
  });
  const activeKeys = new Set();

  for (const reagent of reagents) {
    // A — MISSING_OR_UNVERIFIED_SDS (SDS-6: URL alone != VERIFIED)
    if (reagent.sdsStatus === 'MISSING' || reagent.sdsStatus === 'UNVERIFIED') {
      const key = dedupKey(ALERT_TYPE.MISSING_OR_UNVERIFIED_SDS, reagent.reagentId, '');
      activeKeys.add(key);
      if (!existingKeys.has(key)) {
        const isMissing = reagent.sdsStatus === 'MISSING';
        await db.collection('safety_alerts').add({
          type:        ALERT_TYPE.MISSING_OR_UNVERIFIED_SDS,
          status:      ALERT_STATUS.OPEN,
          severity:    'DATA_QUALITY',
          title:       isMissing ? 'Missing SDS' : 'Unverified SDS',
          description: isMissing
            ? 'No Safety Data Sheet has been recorded for this reagent. Compatibility cannot be assessed without SDS information.'
            : 'SDS reference recorded but not formally verified by an Administrator. Storage approval requires verified SDS.',
          reagentId:   reagent.reagentId,
          reagentName: reagent.chemicalName,
          casNumber:   reagent.casNumber,
          sdsStatus:   reagent.sdsStatus,
          createdAt:   now(),
          updatedAt:   now(),
        });
        summary.created++;
      }
    }

    // B — VERIFIED_INCOMPATIBILITY and MANUAL_REVIEW_REQUIRED
    // Only applicable when the reagent has an active storage assignment.
    try {
      const assignSnap = await db.collection('storage_assignments')
        .where('reagentId', '==', reagent.reagentId)
        .where('status', '==', 'ACTIVE')
        .get();

      for (const assignDoc of assignSnap.docs) {
        const compartmentId = assignDoc.data().compartmentId;
        const compDoc = await db.collection('storage_locations').doc(compartmentId).get();
        if (!compDoc.exists) continue;
        const compartment = { locationId: compDoc.id, ...compDoc.data() };

        const occupantSnap = await db.collection('storage_assignments')
          .where('compartmentId', '==', compartmentId)
          .where('status', '==', 'ACTIVE')
          .get();
        const occupantIds = occupantSnap.docs
          .map(d => d.data().reagentId)
          .filter(id => id !== reagent.reagentId);

        const occupants = [];
        if (occupantIds.length > 0) {
          const oDocs = await Promise.all(occupantIds.map(id => db.collection('reagents').doc(id).get()));
          for (const od of oDocs) {
            if (od.exists) occupants.push({ reagentId: od.id, ...od.data() });
          }
        }
        if (occupants.length === 0) continue;

        const result = evaluate(reagent, occupants, compartment);

        if (result.result === 'INCOMPATIBLE') {
          for (const conflict of result.conflicts) {
            const key = dedupKey(ALERT_TYPE.VERIFIED_INCOMPATIBILITY, reagent.reagentId, compartmentId + '|' + conflict.ruleId);
            activeKeys.add(key);
            if (!existingKeys.has(key)) {
              await db.collection('safety_alerts').add({
                type:                ALERT_TYPE.VERIFIED_INCOMPATIBILITY,
                status:              ALERT_STATUS.OPEN,
                severity:            'HAZARD',
                title:               'Verified Storage Incompatibility',
                description:         conflict.conflictDescription,
                reagentId:           reagent.reagentId,
                reagentName:         reagent.chemicalName,
                casNumber:           reagent.casNumber,
                conflictReagentId:   conflict.occupantId,
                conflictReagentName: conflict.occupantName,
                compartmentId,
                ruleId:              conflict.ruleId,
                evidenceReference:   conflict.source ? conflict.source.title + ' — ' + conflict.source.organization + ' — ' + conflict.source.url : null,
                sourceUrl:           conflict.source ? conflict.source.url : null,
                rulesetVersion:      RULESET_VERSION,
                createdAt:           now(),
                updatedAt:           now(),
              });
              summary.created++;
            }
          }
        } else if (result.result === 'NEEDS_REVIEW') {
          const key = dedupKey(ALERT_TYPE.MANUAL_REVIEW_REQUIRED, reagent.reagentId, compartmentId);
          activeKeys.add(key);
          if (!existingKeys.has(key)) {
            const reasons = result.triggers.map(t => t.reason.replace(/_/g, ' ')).join('; ');
            const detail  = result.triggers.map(t => t.detail).filter(Boolean).join(' ');
            await db.collection('safety_alerts').add({
              type:          ALERT_TYPE.MANUAL_REVIEW_REQUIRED,
              status:        ALERT_STATUS.PENDING_REVIEW,
              severity:      'REVIEW',
              title:         'Storage Review Required',
              description:   'Co-storage requires review: ' + reasons + '. ' + detail,
              reagentId:     reagent.reagentId,
              reagentName:   reagent.chemicalName,
              casNumber:     reagent.casNumber,
              compartmentId,
              reviewReasons: result.triggers,
              rulesetVersion: RULESET_VERSION,
              createdAt:     now(),
              updatedAt:     now(),
            });
            summary.created++;
          }
        }
        // NO_DOCUMENTED_CONFLICT: no alert (T10)
      }
    } catch (err) {
      summary.errors.push('Error evaluating reagent ' + reagent.reagentId + ': ' + err.message);
    }
  }

  // Close stale alerts whose condition is resolved
  for (const [key, alert] of existingKeys) {
    if (!activeKeys.has(key)) {
      try {
        await db.collection('safety_alerts').doc(alert.alertId).update({
          status:     ALERT_STATUS.CLOSED,
          resolvedAt: now(),
          updatedAt:  now(),
          resolvedBy: 'system_auto',
        });
        summary.closed++;
      } catch (err) {
        summary.errors.push('Error closing stale alert ' + alert.alertId + ': ' + err.message);
      }
    }
  }

  return summary;
}

export async function listAlerts({ status, type, limit = 50 } = {}) {
  const db = getDb();
  // Build query with where filters only — orderBy+where requires a composite Firestore index.
  // Sorting is done in Node after fetching to avoid index creation in Spark tier.
  let q = db.collection('safety_alerts');
  if (status) q = q.where('status', '==', status);
  if (type)   q = q.where('type',   '==', type);
  const snap = await q.limit(Math.min(limit * 2, 400)).get();
  const docs = snap.docs.map(d => ({ alertId: d.id, ...d.data() }));
  docs.sort((a, b) => {
    const ta = a.createdAt?._seconds ?? (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
    const tb = b.createdAt?._seconds ?? (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
    return tb - ta;
  });
  return docs.slice(0, Math.min(limit, 200));
}

export async function getAlert(id) {
  const db = getDb();
  const doc = await db.collection('safety_alerts').doc(id).get();
  if (!doc.exists) return null;
  return { alertId: doc.id, ...doc.data() };
}

export async function getAlertSummary() {
  const db = getDb();
  const [openSnap, pendingSnap, sdsSnap, incompSnap, reviewSnap] = await Promise.all([
    db.collection('safety_alerts').where('status', '==', ALERT_STATUS.OPEN).count().get(),
    db.collection('safety_alerts').where('status', '==', ALERT_STATUS.PENDING_REVIEW).count().get(),
    db.collection('safety_alerts').where('status', '==', ALERT_STATUS.OPEN).where('type', '==', ALERT_TYPE.MISSING_OR_UNVERIFIED_SDS).count().get(),
    db.collection('safety_alerts').where('status', '==', ALERT_STATUS.OPEN).where('type', '==', ALERT_TYPE.VERIFIED_INCOMPATIBILITY).count().get(),
    db.collection('safety_alerts').where('status', 'in', [ALERT_STATUS.OPEN, ALERT_STATUS.PENDING_REVIEW]).where('type', '==', ALERT_TYPE.MANUAL_REVIEW_REQUIRED).count().get(),
  ]);
  return {
    open:              openSnap.data().count,
    pendingReview:     pendingSnap.data().count,
    total:             openSnap.data().count + pendingSnap.data().count,
    bySdsIssue:        sdsSnap.data().count,
    byIncompatibility: incompSnap.data().count,
    byReviewRequired:  reviewSnap.data().count,
  };
}
