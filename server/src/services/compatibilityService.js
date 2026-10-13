import { getDb } from '../config/firebase.js';
import { evaluate } from './compatibilityEngine.js';
import { RULESET_VERSION } from '../rules/compatibilityRules.js';

export async function checkCompatibility(reagentId, compartmentId) {
  const db = getDb();
  const reagentDoc = await db.collection('reagents').doc(reagentId).get();
  if (!reagentDoc.exists) { const e = new Error('Reagent not found.'); e.status = 404; e.code = 'NOT_FOUND'; throw e; }
  const proposedReagent = { reagentId: reagentDoc.id, ...reagentDoc.data() };
  if (proposedReagent.archived) { const e = new Error('Cannot check compatibility for an archived reagent.'); e.status = 409; e.code = 'REAGENT_ARCHIVED'; throw e; }
  const compDoc = await db.collection('storage_locations').doc(compartmentId).get();
  if (!compDoc.exists) { const e = new Error('Compartment not found.'); e.status = 404; e.code = 'NOT_FOUND'; throw e; }
  if (compDoc.data().type !== 'COMPARTMENT') { const e = new Error('Target location is not a COMPARTMENT.'); e.status = 400; e.code = 'INVALID_LOCATION_TYPE'; throw e; }
  const compartment = { locationId: compDoc.id, ...compDoc.data() };
  const assignSnap = await db.collection('storage_assignments').where('compartmentId', '==', compartmentId).where('status', '==', 'ACTIVE').get();
  const occupantIds = assignSnap.docs.map(d => d.data().reagentId);
  const occupants = [];
  if (occupantIds.length > 0) {
    const docs = await Promise.all(occupantIds.map(id => db.collection('reagents').doc(id).get()));
    for (const od of docs) {
      if (od.exists) occupants.push({ reagentId: od.id, ...od.data() });
      else occupants.push({ reagentId: od.id, chemicalName: 'Unknown', casNumber: '', sdsStatus: 'MISSING', hazardClasses: ['UNKNOWN'], concentration: 'UNKNOWN' });
    }
  }
  const engineResult = evaluate(proposedReagent, occupants, compartment);
  return { ...engineResult, proposedReagent: { reagentId: proposedReagent.reagentId, chemicalName: proposedReagent.chemicalName, casNumber: proposedReagent.casNumber, sdsStatus: proposedReagent.sdsStatus }, compartment: { locationId: compartment.locationId, name: compartment.name, path: compartment.path }, occupantCount: occupants.length, rulesetVersion: RULESET_VERSION };
}
