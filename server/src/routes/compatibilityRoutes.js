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
export default router;
