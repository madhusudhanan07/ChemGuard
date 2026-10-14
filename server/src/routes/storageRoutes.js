import { Router } from 'express';
import { createLocation, deleteLocation, getCompartmentOccupants, listLocations, updateLocation } from '../services/storageService.js';

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

// GET /api/storage/locations/:id/occupants
// Returns all active reagent assignments for a compartment.
// Read-only — does not write to Firestore.
router.get('/locations/:id/occupants', async (req, res, next) => {
  try {
    const data = await getCompartmentOccupants(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// POST /api/storage/assignments
// Physical storage assignment creation is BLOCKED.
// Requires: authentication, role enforcement, and full transactional safety validation.
router.post('/assignments', (req, res) => {
  res.status(503).json({ success: false, error: { code: 'ENGINE_NOT_READY', message: 'Storage assignment creation requires authentication, role enforcement, and the full verified assignment transaction. Assignments are blocked to prevent unsafe co-storage.' } });
});

export default router;
