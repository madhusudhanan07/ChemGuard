import { Router } from 'express';
import { getDashboardSummary } from '../services/dashboardService.js';

const router = Router();

router.get('/summary', async (req, res, next) => {
  try {
    const data = await getDashboardSummary();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
