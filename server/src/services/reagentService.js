import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getDb } from '../config/firebase.js';
import { logEvent, EVENT_TYPE } from './auditService.js';

const CAS_RE = /^\d{2,7}-\d{2}-\d{1}$/;
const COLL = 'reagents';

function now() { return Timestamp.now(); }

function validateReagent(f, requireAll = true) {
  const errs = [];
  if (requireAll || f.containerId !== undefined) { if (!f.containerId || !String(f.containerId).trim()) errs.push({ field: 'containerId', message: 'Required' }); }
  if (requireAll || f.chemicalName !== undefined) { if (!f.chemicalName || !String(f.chemicalName).trim()) errs.push({ field: 'chemicalName', message: 'Required' }); }
  if (requireAll || f.casNumber !== undefined) { const cas = String(f.casNumber || '').trim(); if (!cas) errs.push({ field: 'casNumber', message: 'Required' }); else if (!CAS_RE.test(cas)) errs.push({ field: 'casNumber', message: 'Invalid CAS format. Example: 64-19-7' }); }
  if (f.concentration !== undefined && f.concentration !== 'UNKNOWN' && f.concentration !== '') { const n = Number(f.concentration); if (isNaN(n) || n <= 0) errs.push({ field: 'concentration', message: 'Must be a positive number or UNKNOWN' }); }
  if (f.concentration !== undefined && f.concentration !== 'UNKNOWN' && f.concentration !== '') { if (!f.concentrationUnit || !String(f.concentrationUnit).trim()) errs.push({ field: 'concentrationUnit', message: 'Required when concentration is numeric' }); }
  if (requireAll || f.quantityOnHand !== undefined) { const q = Number(f.quantityOnHand); if (isNaN(q) || q < 0) errs.push({ field: 'quantityOnHand', message: 'Must be a non-negative number' }); }
  if (requireAll || f.quantityUnit !== undefined) { if (!f.quantityUnit || !String(f.quantityUnit).trim()) errs.push({ field: 'quantityUnit', message: 'Required' }); }
  if (requireAll || f.hazardClasses !== undefined) { if (!f.hazardClasses || !Array.isArray(f.hazardClasses) || f.hazardClasses.length === 0) errs.push({ field: 'hazardClasses', message: 'At least one hazard class is required, or [UNKNOWN]' }); }
  const sds = f.sdsStatus;
  if (sds === 'VERIFIED') errs.push({ field: 'sdsStatus', message: 'VERIFIED status can only be set by an Administrator via the authenticated backend.' });
  if ((sds === 'UNVERIFIED') && !f.sdsReference) errs.push({ field: 'sdsReference', message: 'Required when SDS status is UNVERIFIED' });
  return errs;
}

export async function listReagents({ search = '', archivedOnly = false } = {}) {
  const db = getDb();
  let q = db.collection(COLL).where('archived', '==', archivedOnly);
  const snap = await q.get();
  let results = snap.docs.map(d => ({ reagentId: d.id, ...d.data() }));
  if (search) {
    const ql = search.toLowerCase();
    results = results.filter(r => (r.chemicalName || '').toLowerCase().includes(ql) || (r.casNumber || '').includes(search));
  }
  return results;
}

export async function getReagent(id) {
  const db = getDb();
  const doc = await db.collection(COLL).doc(id).get();
  if (!doc.exists) return null;
  return { reagentId: doc.id, ...doc.data() };
}

export async function createReagent(fields) {
  const db = getDb();
  const errs = validateReagent(fields, true);
  if (errs.length) { const e = new Error('Validation failed'); e.status = 400; e.code = 'VALIDATION_ERROR'; e.fields = errs; throw e; }
  // Check duplicate containerId
  const dup = await db.collection(COLL).where('containerId', '==', fields.containerId.trim()).limit(1).get();
  if (!dup.empty) { const e = new Error('A reagent with that Container ID already exists.'); e.status = 409; e.code = 'DUPLICATE_CONTAINER_ID'; throw e; }
  const data = { ...fields, containerId: fields.containerId.trim(), casNumber: fields.casNumber.trim(), archived: false, createdAt: now(), updatedAt: now() };
  const ref = await db.collection(COLL).add(data);
  await logEvent(EVENT_TYPE.REAGENT_CREATE, `Created reagent: ${data.chemicalName} (${data.casNumber})`, { reagentId: ref.id });
  return { reagentId: ref.id, ...data };
}

export async function updateReagent(id, fields) {
  const db = getDb();
  const doc = await db.collection(COLL).doc(id).get();
  if (!doc.exists) { const e = new Error('Reagent not found.'); e.status = 404; e.code = 'NOT_FOUND'; throw e; }
  const errs = validateReagent(fields, false);
  if (errs.length) { const e = new Error('Validation failed'); e.status = 400; e.code = 'VALIDATION_ERROR'; e.fields = errs; throw e; }
  const update = { ...fields, updatedAt: now() };
  if (update.casNumber) update.casNumber = String(update.casNumber).trim();
  if (update.containerId) update.containerId = String(update.containerId).trim();
  delete update.reagentId; delete update.createdAt; delete update.archived;
  await db.collection(COLL).doc(id).update(update);
  const d = doc.data();
  await logEvent(EVENT_TYPE.REAGENT_UPDATE, `Updated reagent: ${d.chemicalName || 'Unknown'}`, { reagentId: id });
  return { reagentId: id, ...d, ...update };
}

export async function archiveReagent(id) {
  const db = getDb();
  const doc = await db.collection(COLL).doc(id).get();
  if (!doc.exists) { const e = new Error('Reagent not found.'); e.status = 404; e.code = 'NOT_FOUND'; throw e; }
  // Check for active storage assignments
  const active = await db.collection('storage_assignments').where('reagentId', '==', id).where('status', '==', 'ACTIVE').limit(1).get();
  if (!active.empty) { const e = new Error('Cannot archive: reagent has an active storage assignment. Remove it first.'); e.status = 409; e.code = 'HAS_ACTIVE_ASSIGNMENT'; throw e; }
  await db.collection(COLL).doc(id).update({ archived: true, updatedAt: now() });
  const d = doc.data();
  await logEvent(EVENT_TYPE.REAGENT_ARCHIVE, `Archived reagent: ${d.chemicalName || 'Unknown'}`, { reagentId: id });
  return { ok: true };
}

export async function restoreReagent(id) {
  const db = getDb();
  const doc = await db.collection(COLL).doc(id).get();
  if (!doc.exists) { const e = new Error('Reagent not found.'); e.status = 404; e.code = 'NOT_FOUND'; throw e; }
  await db.collection(COLL).doc(id).update({ archived: false, updatedAt: now() });
  return { ok: true };
}
