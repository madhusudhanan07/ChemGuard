import { Router } from 'express';
import { createLocation, deleteLocation, listLocations, updateLocation } from '../services/storageService.js';

const router = Router();

router.get('/locations', async (req, res, next) => {
  try {
    const { type, parentId } = req.query;
    const data = await listLocations({ type, parentId: parentId === 'null' ? null : parentId });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/locations', async (req, res, next) => {
  try {
    const loc = await createLocation(req.body);
    res.status(201).json({ success: true, data: loc });
  } catch (err) { next(err); }
});

router.put('/locations/:id', async (req, res, next) => {
  try {
    const loc = await updateLocation(req.params.id, req.body);
    res.json({ success: true, data: loc });
  } catch (err) { next(err); }
});

router.delete('/locations/:id', async (req, res, next) => {
  try {
    await deleteLocation(req.params.id);
    res.json({ success: true, data: { ok: true } });
  } catch (err) { next(err); }
});

// Storage ASSIGNMENT creation is explicitly blocked until the compatibility engine is implemented.
router.post('/assignments', (req, res) => {
  res.status(503).json({ success: false, error: { code: 'ENGINE_NOT_READY', message: 'Storage assignment creation requires the verified chemical compatibility engine, which is not yet implemented. Assignments are blocked to prevent unsafe co-storage.' } });
});

export default router;
