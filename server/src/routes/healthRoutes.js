import { Router } from 'express';
import { getDb } from '../config/firebase.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const db = getDb();
    // Read-only Firestore probe: list collection with limit 1
    // This confirms the connection without writing any data
    await db.collection('reagents').limit(1).get();
    res.json({
      success: true,
      data: {
        status: 'ok',
        firebase: 'connected',
        mode: 'local-development',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    // Report clearly that Firestore failed — never mask as ok
    res.status(503).json({
      success: false,
      error: {
        code: 'FIRESTORE_UNAVAILABLE',
        message: 'Firestore connection failed: ' + err.message,
      },
    });
  }
});

export default router;
