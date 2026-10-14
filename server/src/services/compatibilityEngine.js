import { RULESET_VERSION, findApplicableRules } from '../rules/compatibilityRules.js';

export const NO_CONFLICT_DISCLAIMER = 'No documented conflict found based on the current curated ruleset. This result does not confirm the combination is universally safe. Physical chemical segregation requires current manufacturer SDS guidance and review under your laboratory safety procedures.';

export function evaluate(proposedReagent, occupants, compartment) {
  const incompatibilities = [];
  const reviewTriggers    = [];
  const proposedCas       = (proposedReagent.casNumber || '').trim();

  for (const occupant of occupants) {
    const occupantCas     = (occupant.casNumber || '').trim();
    const applicableRules = findApplicableRules(proposedCas, occupantCas);
    const pairConflicts   = applicableRules.filter(r => r.outcome === 'INCOMPATIBLE');
    if (pairConflicts.length > 0) {
      pairConflicts.forEach(rule => {
        incompatibilities.push({ occupantId: occupant.reagentId, occupantName: occupant.chemicalName, occupantCas, ruleId: rule.ruleId, conflictDescription: rule.conflictDescription, source: rule.source });
      });
      continue; // CCE-4: INCOMPATIBLE takes precedence; no NEEDS_REVIEW for this pair
    }
    if (proposedReagent.sdsStatus !== 'VERIFIED' || occupant.sdsStatus !== 'VERIFIED') {
      reviewTriggers.push({ reason: 'UNVERIFIED_SDS', occupantId: occupant.reagentId, occupantName: occupant.chemicalName, detail: 'SDS verification required for both reagents before storage approval.' });
      continue;
    }
    if ((Array.isArray(proposedReagent.hazardClasses) && proposedReagent.hazardClasses.includes('UNKNOWN')) || (Array.isArray(occupant.hazardClasses) && occupant.hazardClasses.includes('UNKNOWN'))) {
      reviewTriggers.push({ reason: 'UNKNOWN_HAZARD', occupantId: occupant.reagentId, occupantName: occupant.chemicalName, detail: 'Hazard class is unknown for one or both reagents.' });
      continue;
    }
    if (proposedReagent.concentration === 'UNKNOWN' || occupant.concentration === 'UNKNOWN') {
      reviewTriggers.push({ reason: 'UNKNOWN_CONCENTRATION', occupantId: occupant.reagentId, occupantName: occupant.chemicalName, detail: 'Concentration is unknown for one or both reagents.' });
      continue;
    }
    // CCE-5: no applicable rule => NEEDS_REVIEW
    if (applicableRules.length === 0) {
      reviewTriggers.push({ reason: 'NO_RULE_COVERAGE', occupantId: occupant.reagentId, occupantName: occupant.chemicalName, detail: 'No verified compatibility rule covers this chemical pair. Absence of a rule does not imply safety.' });
    }
  }

  // Phase 3: empty-compartment checks (CCE-6, EC-4)
  if (occupants.length === 0) {
    if (proposedReagent.sdsStatus !== 'VERIFIED') reviewTriggers.push({ reason: 'UNVERIFIED_SDS_EMPTY_COMPARTMENT', detail: 'Proposed reagent SDS is not verified. Verification required even for empty compartments.' });
    if (Array.isArray(proposedReagent.hazardClasses) && proposedReagent.hazardClasses.includes('UNKNOWN')) reviewTriggers.push({ reason: 'UNKNOWN_HAZARD_EMPTY_COMPARTMENT', detail: 'Hazard class is unknown for the proposed reagent.' });
  }

  // Phase 4: final decision — INCOMPATIBLE beats NEEDS_REVIEW (CCE-4, EC-12)
  const evaluatedAt = new Date().toISOString();
  if (incompatibilities.length > 0) return { result: 'INCOMPATIBLE', conflicts: incompatibilities, rulesetVersion: RULESET_VERSION, evaluatedAt };
  if (reviewTriggers.length > 0)    return { result: 'NEEDS_REVIEW',   triggers:  reviewTriggers,    rulesetVersion: RULESET_VERSION, evaluatedAt };
  // CCE-6, CCE-8: only here when ALL pairs verified + explicit coverage + no conflict
  return { result: 'NO_DOCUMENTED_CONFLICT', disclaimer: NO_CONFLICT_DISCLAIMER, rulesetVersion: RULESET_VERSION, evaluatedAt };
}

/**
 * Compare two reagents directly without compartment context.
 * Returns compatibility assessment for analytical purposes only.
 * Does NOT imply physical co-storage or create storage assignments.
 */
export function comparePairwise(reagentA, reagentB) {
  const incompatibilities = [];
  const reviewTriggers = [];
  const casA = (reagentA.casNumber || '').trim();
  const casB = (reagentB.casNumber || '').trim();

  // Check rule-based incompatibility
  const applicableRules = findApplicableRules(casA, casB);
  const conflicts = applicableRules.filter(r => r.outcome === 'INCOMPATIBLE');
  
  if (conflicts.length > 0) {
    conflicts.forEach(rule => {
      incompatibilities.push({
        reagentAId: reagentA.reagentId,
        reagentAName: reagentA.chemicalName,
        reagentACas: casA,
        reagentBId: reagentB.reagentId,
        reagentBName: reagentB.chemicalName,
        reagentBCas: casB,
        ruleId: rule.ruleId,
        conflictDescription: rule.conflictDescription,
        source: rule.source
      });
    });
  }

  // Check data quality triggers
  if (reagentA.sdsStatus !== 'VERIFIED' || reagentB.sdsStatus !== 'VERIFIED') {
    reviewTriggers.push({
      reason: 'UNVERIFIED_SDS',
      detail: `SDS verification required for both reagents. A: ${reagentA.sdsStatus}, B: ${reagentB.sdsStatus}`
    });
  }

  if ((Array.isArray(reagentA.hazardClasses) && reagentA.hazardClasses.includes('UNKNOWN')) ||
      (Array.isArray(reagentB.hazardClasses) && reagentB.hazardClasses.includes('UNKNOWN'))) {
    reviewTriggers.push({
      reason: 'UNKNOWN_HAZARD',
      detail: 'Hazard class is unknown for one or both reagents.'
    });
  }

  if (reagentA.concentration === 'UNKNOWN' || reagentB.concentration === 'UNKNOWN') {
    reviewTriggers.push({
      reason: 'UNKNOWN_CONCENTRATION',
      detail: 'Concentration is unknown for one or both reagents.'
    });
  }

  // Check rule coverage
  if (conflicts.length === 0 && applicableRules.length === 0) {
    reviewTriggers.push({
      reason: 'NO_RULE_COVERAGE',
      detail: 'No verified compatibility rule covers this chemical pair. Absence of a rule does not imply safety.'
    });
  }

  const evaluatedAt = new Date().toISOString();
  const disclaimer = 'This pairwise comparison is for analytical purposes only. It does NOT imply these reagents are physically co-stored or authorize co-storage. Physical storage requires compartment-based assessment and Administrator approval.';

  if (incompatibilities.length > 0) {
    return { result: 'INCOMPATIBLE', conflicts: incompatibilities, disclaimer, rulesetVersion: RULESET_VERSION, evaluatedAt };
  }
  if (reviewTriggers.length > 0) {
    return { result: 'NEEDS_REVIEW', triggers: reviewTriggers, disclaimer, rulesetVersion: RULESET_VERSION, evaluatedAt };
  }
  return { result: 'NO_DOCUMENTED_CONFLICT', disclaimer: NO_CONFLICT_DISCLAIMER + ' ' + disclaimer, rulesetVersion: RULESET_VERSION, evaluatedAt };
}