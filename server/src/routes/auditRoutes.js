import { Router } from 'express';
import { listEvents } from '../services/auditService.js';

const router = Router();

// GET /api/audit — list audit events with optional ?eventType= filter
router.get('/', async (req, res, next) => {
  try {
    const { eventType, limit } = req.query;
    const data = await listEvents({ eventType, limit: limit ? parseInt(limit) : 50 });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

export default router;