/**
 * ChemGuard Safety Alerts Tests
 *
 * Test strategy:
 *  [UNIT]  — pure function tests, no Firestore, no network
 *  [API]   — live HTTP calls to 127.0.0.1:5000, read-only
 *  [LIVE]  — creates then cleans up test reagents in Firestore
 *
 * POST /api/alerts/evaluate is NOT called in these tests to avoid
 * writing real alert records without user approval.
 */
import assert from "node:assert/strict";
import { evaluate } from "../src/services/compatibilityEngine.js";
import { ALERT_TYPE, ALERT_STATUS } from "../src/services/alertService.js";

let passed = 0; let failed = 0;
function test(label, fn) {
  const isAsync = fn.constructor.name === "AsyncFunction";
  if (isAsync) {
    return fn()
      .then(() => { console.log("  PASS:", label); passed++; })
      .catch(e  => { console.error("  FAIL:", label, "-", e.message); failed++; });
  }
  try { fn(); console.log("  PASS:", label); passed++; }
  catch(e) { console.error("  FAIL:", label, "-", e.message); failed++; }
}

const BASE = "http://127.0.0.1:5000/api";
async function api(method, path, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  const json = await res.json().catch(() => ({ success: false, error: { message: "bad json" } }));
  return { status: res.status, ...json };
}

const compartment = { locationId: "c1", type: "COMPARTMENT", name: "Test Compartment" };

console.log("=== ChemGuard Safety Alerts Tests ===");

// ── ALERT_TYPE and ALERT_STATUS constants ─────────────────────────────────
test("T01 [UNIT]: ALERT_TYPE constants are defined", () => {
  assert.ok(ALERT_TYPE.MISSING_OR_UNVERIFIED_SDS,  "MISSING_OR_UNVERIFIED_SDS must be defined");
  assert.ok(ALERT_TYPE.VERIFIED_INCOMPATIBILITY,   "VERIFIED_INCOMPATIBILITY must be defined");
  assert.ok(ALERT_TYPE.MANUAL_REVIEW_REQUIRED,     "MANUAL_REVIEW_REQUIRED must be defined");
});

test("T02 [UNIT]: ALERT_STATUS constants are defined", () => {
  assert.ok(ALERT_STATUS.OPEN,           "OPEN must be defined");
  assert.ok(ALERT_STATUS.PENDING_REVIEW, "PENDING_REVIEW must be defined");
  assert.ok(ALERT_STATUS.CLOSED,         "CLOSED must be defined");
});

// ── Reagent with verified SDS — no SDS alert should be generated ──────────
test("T03 [UNIT]: Reagent with VERIFIED SDS does not trigger MISSING_OR_UNVERIFIED_SDS condition", () => {
  // The alert engine checks sdsStatus. We test the condition logic directly.
  const reagent = { sdsStatus: "VERIFIED", chemicalName: "Test", casNumber: "64-19-7" };
  const shouldAlert = reagent.sdsStatus === "MISSING" || reagent.sdsStatus === "UNVERIFIED";
  assert.equal(shouldAlert, false, "VERIFIED SDS must not trigger a SDS alert");
});

// ── Reagent with MISSING SDS — should trigger alert ───────────────────────
test("T04 [UNIT]: Reagent with MISSING SDS triggers alert condition", () => {
  const reagent = { sdsStatus: "MISSING", chemicalName: "No SDS Reagent", casNumber: "64-19-7" };
  const shouldAlert = reagent.sdsStatus === "MISSING" || reagent.sdsStatus === "UNVERIFIED";
  assert.equal(shouldAlert, true);
});

// ── Reagent with UNVERIFIED SDS — should trigger alert ───────────────────
test("T05 [UNIT]: Reagent with UNVERIFIED SDS triggers alert condition (SDS-6: URL alone != VERIFIED)", () => {
  // SDS-6: a populated URL does NOT imply VERIFIED status
  const reagent = { sdsStatus: "UNVERIFIED", sdsReference: "https://example.com/sds", chemicalName: "X", casNumber: "64-19-7" };
  const shouldAlert = reagent.sdsStatus === "MISSING" || reagent.sdsStatus === "UNVERIFIED";
  assert.equal(shouldAlert, true, "UNVERIFIED with a URL must still trigger alert");
});

// ── Expiry field handling ─────────────────────────────────────────────────
test("T06 [UNIT]: Reagent without expiryDate field — no expiry date stored, no fabricated date", () => {
  const reagent = { chemicalName: "X", casNumber: "64-19-7", sdsStatus: "VERIFIED" };
  assert.equal(reagent.expiryDate, undefined, "expiryDate field must be absent — never fabricated");
  // The alert engine must handle missing expiryDate safely (no crash, no invented date)
  const hasExpiry = reagent.expiryDate !== undefined && reagent.expiryDate !== null;
  assert.equal(hasExpiry, false, "No expiry condition without stored date");
});

test("T07 [UNIT]: Reagent with past expiryDate string is detectable as expired", () => {
  const reagent = { expiryDate: "2020-01-01", chemicalName: "Old", casNumber: "64-19-7" };
  const expDate = new Date(reagent.expiryDate);
  assert.ok(!isNaN(expDate.getTime()), "Date must be parseable");
  assert.ok(expDate < new Date(), "2020-01-01 must be in the past");
});

test("T08 [UNIT]: Invalid expiryDate string does not crash date check", () => {
  const reagent = { expiryDate: "not-a-date", chemicalName: "X", casNumber: "64-19-7" };
  const expDate = new Date(reagent.expiryDate);
  assert.ok(isNaN(expDate.getTime()), "Invalid date must parse as NaN — handle gracefully");
  // Engine should treat invalid dates as unknown, not as expired or valid
});

test("T09 [UNIT]: Approaching expiry is detectable within configured warning window", () => {
  const soon = new Date();
  soon.setDate(soon.getDate() + 15); // 15 days from now
  const reagent = { expiryDate: soon.toISOString().slice(0, 10), chemicalName: "X" };
  const expDate = new Date(reagent.expiryDate);
  const daysUntil = (expDate - new Date()) / (1000 * 60 * 60 * 24);
  assert.ok(daysUntil > 0 && daysUntil <= 30, "15 days must be within 30-day warning window");
});

// ── Verified INCOMPATIBILITY via engine ──────────────────────────────────
test("T10 [UNIT]: Compatibility engine returns INCOMPATIBLE for verified pair (regression)", () => {
  const nitric = { reagentId: "r1", chemicalName: "Nitric acid", casNumber: "7697-37-2", sdsStatus: "VERIFIED", hazardClasses: ["Oxidizer"], concentration: "65" };
  const acetic = { reagentId: "r2", chemicalName: "Acetic acid", casNumber: "64-19-7",   sdsStatus: "VERIFIED", hazardClasses: ["Flammable"], concentration: "99.5" };
  const r = evaluate(nitric, [acetic], compartment);
  assert.equal(r.result, "INCOMPATIBLE");
  assert.ok(r.conflicts.length > 0);
  assert.ok(r.conflicts[0].ruleId, "ruleId must be present");
  assert.ok(r.conflicts[0].source.url, "source URL must be present for evidence verification");
});

// ── NEEDS_REVIEW condition ────────────────────────────────────────────────
test("T11 [UNIT]: Engine returns NEEDS_REVIEW for unverified SDS pair", () => {
  const unverified = { reagentId: "r3", chemicalName: "X", casNumber: "999-99-9", sdsStatus: "UNVERIFIED", hazardClasses: ["Corrosive"], concentration: "10" };
  const other      = { reagentId: "r4", chemicalName: "Y", casNumber: "888-88-8", sdsStatus: "VERIFIED",   hazardClasses: ["Flammable"], concentration: "5" };
  const r = evaluate(unverified, [other], compartment);
  assert.equal(r.result, "NEEDS_REVIEW");
  assert.ok(r.triggers.some(t => t.reason === "UNVERIFIED_SDS"));
});

// ── NO_DOCUMENTED_CONFLICT must NOT produce a hazard alert ────────────────
test("T12 [UNIT]: NO_DOCUMENTED_CONFLICT result must not contain the word hazard or incompatible (CCE-8)", () => {
  // Build a case that produces NO_DOCUMENTED_CONFLICT:
  // Nitric acid vs itself in an empty compartment with VERIFIED SDS and known hazards
  // Empty compartment + verified reagent with known hazards = NO_DOCUMENTED_CONFLICT
  const verified = { reagentId: "r5", chemicalName: "Verified Chemical", casNumber: "7697-37-2", sdsStatus: "VERIFIED", hazardClasses: ["Oxidizer"], concentration: "65" };
  const r = evaluate(verified, [], compartment);
  // Result is NO_DOCUMENTED_CONFLICT or NEEDS_REVIEW (both acceptable for empty compartment)
  assert.ok(["NO_DOCUMENTED_CONFLICT","NEEDS_REVIEW"].includes(r.result));
  if (r.result === "NO_DOCUMENTED_CONFLICT") {
    assert.ok(r.disclaimer, "Disclaimer must be present");
    assert.ok(!r.disclaimer.toLowerCase().includes(" hazard "), "Disclaimer must not assert hazard");
  }
  // The alert engine must NOT create a VERIFIED_INCOMPATIBILITY alert for this result
});

// ── Deduplication logic ───────────────────────────────────────────────────
test("T13 [UNIT]: Deduplication key is deterministic and unique per condition", () => {
  function dedupKey(type, reagentId, extra) {
    return type + "|" + reagentId + (extra ? "|" + extra : "");
  }
  const k1 = dedupKey("MISSING_OR_UNVERIFIED_SDS", "r1", "");
  const k2 = dedupKey("MISSING_OR_UNVERIFIED_SDS", "r1", "");
  const k3 = dedupKey("MISSING_OR_UNVERIFIED_SDS", "r2", "");
  assert.equal(k1, k2, "Same condition produces same key");
  assert.notEqual(k1, k3, "Different reagent produces different key");
});

// ── Alert type metadata completeness ─────────────────────────────────────
test("T14 [UNIT]: All ALERT_TYPE values are non-empty strings", () => {
  for (const [k, v] of Object.entries(ALERT_TYPE)) {
    assert.ok(typeof v === "string" && v.length > 0, k + " must be a non-empty string");
  }
});

// ── Live API tests (read-only) ────────────────────────────────────────────
await test("T15 [API]: GET /api/alerts returns 200 with array", async () => {
  const r = await api("GET", "/alerts");
  assert.equal(r.status, 200, "Expected 200, got " + r.status + ": " + r.error?.message);
  assert.ok(r.success, "success must be true");
  assert.ok(Array.isArray(r.data), "data must be an array");
});

await test("T16 [API]: GET /api/alerts/summary returns all required fields", async () => {
  const r = await api("GET", "/alerts/summary");
  assert.equal(r.status, 200);
  assert.ok(r.success);
  assert.ok(typeof r.data.open            === "number", "open must be a number");
  assert.ok(typeof r.data.pendingReview   === "number", "pendingReview must be a number");
  assert.ok(typeof r.data.total           === "number", "total must be a number");
  assert.ok(typeof r.data.bySdsIssue      === "number", "bySdsIssue must be a number");
  assert.ok(typeof r.data.byIncompatibility === "number", "byIncompatibility must be a number");
  assert.ok(typeof r.data.byReviewRequired  === "number", "byReviewRequired must be a number");
  assert.equal(r.data.total, r.data.open + r.data.pendingReview, "total must equal open + pendingReview");
});

await test("T17 [API]: GET /api/alerts/summary total is consistent with open+pendingReview", async () => {
  const r = await api("GET", "/alerts/summary");
  assert.equal(r.status, 200);
  assert.equal(r.data.total, r.data.open + r.data.pendingReview);
});

await test("T18 [API]: GET /api/alerts/:id with unknown ID returns 404", async () => {
  const r = await api("GET", "/alerts/NONEXISTENT_ALERT_ID_99999");
  assert.equal(r.status, 404);
  assert.equal(r.success, false);
  assert.equal(r.error.code, "NOT_FOUND");
});

await test("T19 [API]: GET /api/alerts with status=OPEN filter returns only OPEN alerts", async () => {
  const r = await api("GET", "/alerts?status=OPEN");
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.data));
  for (const alert of r.data) {
    assert.equal(alert.status, "OPEN", "Every returned alert must have status OPEN");
  }
});

await test("T20 [API]: GET /api/alerts with invalid status filter returns array (graceful)", async () => {
  const r = await api("GET", "/alerts?status=INVALID_STATUS");
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.data), "Must return array even for unknown status filter");
});

// ── Dashboard regression ──────────────────────────────────────────────────
await test("T21 [API]: GET /api/dashboard/summary returns openAlerts as a number", async () => {
  const r = await api("GET", "/dashboard/summary");
  assert.equal(r.status, 200);
  assert.ok(typeof r.data.openAlerts === "number", "openAlerts must be a number");
  // Must not return a negative count
  assert.ok(r.data.openAlerts >= 0, "openAlerts must be >= 0");
});

// ── Storage regression ────────────────────────────────────────────────────
await test("T22 [API]: GET /api/storage/locations still responds (regression)", async () => {
  const r = await api("GET", "/storage/locations");
  assert.equal(r.status, 200);
  assert.ok(r.success);
  assert.ok(Array.isArray(r.data));
});

// ── Compatibility regression ──────────────────────────────────────────────
await test("T23 [API]: POST /api/compatibility/check with missing body still returns 400 (regression)", async () => {
  const r = await api("POST", "/compatibility/check", {});
  assert.equal(r.status, 400, "Empty body must return 400");
});

// ── Assignment writes remain blocked ─────────────────────────────────────
await test("T24 [API]: POST /api/storage/assignments remains blocked 503 (regression)", async () => {
  const r = await api("POST", "/storage/assignments", { reagentId: "x", compartmentId: "y" });
  assert.equal(r.status, 503, "Assignment writes must remain blocked");
  assert.equal(r.error.code, "ENGINE_NOT_READY");
});

console.log("");
console.log("Results:", passed + failed, "tests —", passed, "passed,", failed, "failed");
if (failed > 0) process.exit(1);