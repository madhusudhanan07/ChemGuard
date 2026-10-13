import { Timestamp } from 'firebase-admin/firestore';
import { getDb } from '../config/firebase.js';

const COLL = 'storage_locations';
function now() { return Timestamp.now(); }

function buildPath(parentPath, name) { return parentPath ? parentPath + ' / ' + name : name; }
const TYPE_ORDER = { LAB: 0, CABINET: 1, COMPARTMENT: 2 };

export async function listLocations({ type, parentId } = {}) {
  const db = getDb();
  let q = db.collection(COLL).where('active', '==', true);
  if (type) q = q.where('type', '==', type);
  if (parentId !== undefined) q = q.where('parentId', '==', parentId || null);
  const snap = await q.get();
  return snap.docs.map(d => ({ locationId: d.id, ...d.data() }));
}

export async function createLocation(fields) {
  const db = getDb();
  const { type, name, parentId } = fields;
  if (!type || !['LAB','CABINET','COMPARTMENT'].includes(type)) { const e = new Error('type must be LAB, CABINET, or COMPARTMENT'); e.status = 400; e.code = 'VALIDATION_ERROR'; throw e; }
  if (!name || !String(name).trim()) { const e = new Error('name is required'); e.status = 400; e.code = 'VALIDATION_ERROR'; throw e; }
  const pid = parentId || null;
  // Validate parent exists and type hierarchy
  let parentPath = '';
  if (pid) {
    const parentDoc = await db.collection(COLL).doc(pid).get();
    if (!parentDoc.exists) { const e = new Error('Parent location not found.'); e.status = 404; e.code = 'NOT_FOUND'; throw e; }
    const pType = parentDoc.data().type;
    const allowed = { LAB: 'CABINET', CABINET: 'COMPARTMENT' };
    if (allowed[pType] !== type) { const e = new Error('Invalid hierarchy: a ' + pType + ' can only contain ' + (allowed[pType] || 'nothing')); e.status = 400; e.code = 'INVALID_HIERARCHY'; throw e; }
    parentPath = parentDoc.data().path || parentDoc.data().name;
  } else if (type !== 'LAB') {
    const e = new Error('Top-level locations must be of type LAB'); e.status = 400; e.code = 'INVALID_HIERARCHY'; throw e;
  }
  // Unique name under same parent
  let dupQ = db.collection(COLL).where('parentId', '==', pid).where('name', '==', name.trim()).where('type', '==', type).limit(1);
  const dup = await dupQ.get();
  if (!dup.empty) { const e = new Error('A ' + type.toLowerCase() + ' named ' + JSON.stringify(name.trim()) + ' already exists here.'); e.status = 409; e.code = 'DUPLICATE_NAME'; throw e; }
  const data = { type, name: name.trim(), parentId: pid, path: buildPath(parentPath, name.trim()), active: true, compartmentVersion: type === 'COMPARTMENT' ? 0 : null, createdAt: now(), updatedAt: now() };
  const ref = await db.collection(COLL).add(data);
  return { locationId: ref.id, ...data };
}

export async function updateLocation(id, fields) {
  const db = getDb();
  const doc = await db.collection(COLL).doc(id).get();
  if (!doc.exists) { const e = new Error('Location not found.'); e.status = 404; e.code = 'NOT_FOUND'; throw e; }
  if (!fields.name || !String(fields.name).trim()) { const e = new Error('name is required'); e.status = 400; e.code = 'VALIDATION_ERROR'; throw e; }
  const old = doc.data();
  const newPath = buildPath(old.path ? old.path.split(' / ').slice(0, -1).join(' / ') : '', fields.name.trim());
  await db.collection(COLL).doc(id).update({ name: fields.name.trim(), path: newPath, updatedAt: now() });
  return { locationId: id, ...old, name: fields.name.trim(), path: newPath };
}

export async function deleteLocation(id) {
  const db = getDb();
  const doc = await db.collection(COLL).doc(id).get();
  if (!doc.exists) { const e = new Error('Location not found.'); e.status = 404; e.code = 'NOT_FOUND'; throw e; }
  // Block if children exist
  const kids = await db.collection(COLL).where('parentId', '==', id).where('active', '==', true).limit(1).get();
  if (!kids.empty) { const e = new Error('Remove all sub-locations before deleting this location.'); e.status = 409; e.code = 'HAS_CHILDREN'; throw e; }
  // Block if active assignments exist (for compartments)
  if (doc.data().type === 'COMPARTMENT') {
    const assigns = await db.collection('storage_assignments').where('compartmentId', '==', id).where('status', '==', 'ACTIVE').limit(1).get();
    if (!assigns.empty) { const e = new Error('Remove all reagent assignments before deleting this compartment.'); e.status = 409; e.code = 'HAS_ACTIVE_ASSIGNMENTS'; throw e; }
  }
  await db.collection(COLL).doc(id).update({ active: false, updatedAt: now() });
  return { ok: true };
}
