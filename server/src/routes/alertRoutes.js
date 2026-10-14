import { Router } from 'express';
import { getDb } from '../config/firebase.js';
import { evaluateAllAlerts, getAlert, getAlertSummary, listAlerts } from '../services/alertService.js';

const router = Router();

// GET /api/alerts — list alerts with optional ?status= and ?type= filters
router.get('/', async (req, res, next) => {
  try {
    const { status, type, limit } = req.query;
    const data = await listAlerts({ status, type, limit: limit ? parseInt(limit) : 50 });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /api/alerts/summary — aggregated counts for dashboard
router.get('/summary', async (req, res, next) => {
  try {
    const data = await getAlertSummary();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// POST /api/alerts/evaluate — on-demand evaluation (localhost dev only)
// Evaluates all reagents and creates/closes alerts accordingly.
router.post('/evaluate', async (req, res, next) => {
  try {
    const data = await evaluateAllAlerts();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /api/alerts/:id — single alert
router.get('/:id', async (req, res, next) => {
  try {
    const alert = await getAlert(req.params.id);
    if (!alert) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Alert not found.' } });
    res.json({ success: true, data: alert });
  } catch (err) { next(err); }
});


// GET /api/alerts/preview — read-only preview of current safety conditions
// Does NOT mutate Firestore — returns derived warnings only
router.get('/preview', async (req, res, next) => {
  try {
    const db = getDb();
    const reagentSnap = await db.collection('reagents').where('archived', '==', false).get();
    const reagents = reagentSnap.docs.map(d => ({ reagentId: d.id, ...d.data() }));
    
    const preview = {
      missingSds: [],
      unverifiedSds: [],
      total: 0
    };

    for (const r of reagents) {
      if (r.sdsStatus === 'MISSING') {
        preview.missingSds.push({
          reagentId: r.reagentId,
          reagentName: r.chemicalName,
          casNumber: r.casNumber,
          type: 'MISSING_SDS',
          severity: 'DATA_QUALITY',
          description: 'No Safety Data Sheet has been recorded for this reagent.'
        });
      } else if (r.sdsStatus === 'UNVERIFIED') {
        preview.unverifiedSds.push({
          reagentId: r.reagentId,
          reagentName: r.chemicalName,
          casNumber: r.casNumber,
          type: 'UNVERIFIED_SDS',
          severity: 'DATA_QUALITY',
          description: 'SDS reference recorded but not formally verified by an Administrator.'
        });
      }
    }

    preview.total = preview.missingSds.length + preview.unverifiedSds.length;
    res.json({ success: true, data: preview });
  } catch (err) { next(err); }
});

export default router;
