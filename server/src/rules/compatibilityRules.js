// ChemGuard Curated Compatibility Ruleset - Version 1.0.0
// POLICY: Every rule must cite a source that specifically supports the exact pair.
// Rules without pair-specific authoritative evidence are PROHIBITED.
// This file is server-side only and must not be sent to the browser.

export const RULESET_VERSION = '1.0.0';

// Rule schema:
//   ruleId, outcome, chemicalA.casNumbers[], chemicalB.casNumbers[],
//   concentrationScope, conflictDescription, source{title,organization,url,section,documentDate}
// Matching is symmetric: A vs B and B vs A both trigger the rule.

export const rules = [
  {
    ruleId: 'CCE-RULE-001',
    outcome: 'INCOMPATIBLE',
    chemicalA: { casNumbers: ['7697-37-2'], nameHint: 'Nitric acid' },
    chemicalB: { casNumbers: ['64-19-7'], nameHint: 'Acetic acid (glacial)' },
    concentrationScope: 'any',
    conflictDescription: 'Nitric acid is a strong oxidizer incompatible with organic acids including acetic acid. Co-storage may cause ignition or violent reaction.',
    source: {
      title: 'Safe Storage of Hazardous Chemicals - Segregate Incompatibles',
      organization: 'UC Berkeley Office of Environment, Health and Safety',
      url: 'https://ehs.berkeley.edu/safe-storage-hazardous-chemicals/30-segregate-incompatibles',
      section: 'Incompatible Chemical Classes',
      documentDate: 'current',
    },
  },
  {
    ruleId: 'CCE-RULE-002',
    outcome: 'INCOMPATIBLE',
    chemicalA: { casNumbers: ['7722-84-1'], nameHint: 'Hydrogen peroxide' },
    chemicalB: { casNumbers: ['67-64-1'], nameHint: 'Acetone' },
    concentrationScope: 'any',
    conflictDescription: 'Hydrogen peroxide and acetone can react to form shock- and friction-sensitive peroxides (TATP, DADP). Co-storage is not permitted.',
    source: {
      title: 'The Risk of Mixing Dilute Hydrogen Peroxide and Acetone Solutions',
      organization: 'American Chemical Society - Journal of Chemical Health and Safety',
      url: 'https://pubs.acs.org/doi/10.1016/j.jchas.2011.07.010',
      section: 'Abstract and Results',
      documentDate: '2012-03-01',
    },
  },
];

// Returns all rules applicable to a pair of CAS numbers (symmetric check).
export function findApplicableRules(casA, casB) {
  return rules.filter(rule => {
    const aA = rule.chemicalA.casNumbers.includes(casA);
    const bB = rule.chemicalB.casNumbers.includes(casB);
    const aB = rule.chemicalB.casNumbers.includes(casA);
    const bA = rule.chemicalA.casNumbers.includes(casB);
    return (aA && bB) || (aB && bA);
  });
}
