import { Router } from 'express';
import { archiveReagent, createReagent, getReagent, listReagents, restoreReagent, updateReagent } from '../services/reagentService.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { search = '', archived = 'false' } = req.query;
    const archivedOnly = archived === 'true';
    const data = await listReagents({ search, archivedOnly });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const reagent = await getReagent(req.params.id);
    if (!reagent) { return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reagent not found.' } }); }
    res.json({ success: true, data: reagent });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const reagent = await createReagent(req.body);
    res.status(201).json({ success: true, data: reagent });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const reagent = await updateReagent(req.params.id, req.body);
    res.json({ success: true, data: reagent });
  } catch (err) { next(err); }
});

router.post('/:id/archive', async (req, res, next) => {
  try {
    await archiveReagent(req.params.id);
    res.json({ success: true, data: { ok: true } });
  } catch (err) { next(err); }
});

router.post('/:id/restore', async (req, res, next) => {
  try {
    await restoreReagent(req.params.id);
    res.json({ success: true, data: { ok: true } });
  } catch (err) { next(err); }
});

export default router;
