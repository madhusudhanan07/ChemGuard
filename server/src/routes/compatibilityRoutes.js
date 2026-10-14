import { Router } from 'express';
import { checkCompatibility } from '../services/compatibilityService.js';
const router = Router();
router.post('/check', async (req, res, next) => {
  try {
    const { reagentId, compartmentId } = req.body;
    if (!reagentId || !compartmentId) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'reagentId and compartmentId are required.' } });
    const result = await checkCompatibility(reagentId, compartmentId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// POST /api/compatibility/compare — pairwise reagent comparison (read-only)
router.post('/compare', async (req, res, next) => {
  try {
    const { reagentAId, reagentBId } = req.body;
    if (!reagentAId || !reagentBId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Both reagentAId and reagentBId are required.' } });
    }
    if (reagentAId === reagentBId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Cannot compare a reagent with itself.' } });
    }

    const db = getDb();
    const [docA, docB] = await Promise.all([
      db.collection('reagents').doc(reagentAId).get(),
      db.collection('reagents').doc(reagentBId).get()
    ]);

    if (!docA.exists) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reagent A not found.' } });
    if (!docB.exists) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reagent B not found.' } });

    const reagentA = { reagentId: docA.id, ...docA.data() };
    const reagentB = { reagentId: docB.id, ...docB.data() };

    const result = comparePairwise(reagentA, reagentB);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

export default router;
