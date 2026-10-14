import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { initFirebase } from './config/firebase.js';
import { errorHandler } from './middleware/errorHandler.js';
import { originGuard } from './middleware/originGuard.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import reagentRoutes from './routes/reagentRoutes.js';
import storageRoutes from './routes/storageRoutes.js';
import compatibilityRoutes from './routes/compatibilityRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import auditRoutes from './routes/auditRoutes.js';

dotenv.config();

// Initialize Firebase before anything else
initFirebase();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://127.0.0.1:5173';

// ── Middleware ────────────────────────────────────────────────────────────
app.use(cors({
  origin: ALLOWED_ORIGIN.split(',').map(o => o.trim()),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));

app.use(express.json({ limit: '256kb' }));
app.use(originGuard);

// ── Routes ───────────────────────────────────────────────────────────────
app.use('/api/health',    healthRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reagents',  reagentRoutes);
app.use('/api/storage',   storageRoutes);
app.use('/api/compatibility', compatibilityRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/audit', auditRoutes);

// Catch-all for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found: ' + req.method + ' ' + req.path } });
});

app.use(errorHandler);

// ── Bind exclusively to loopback ────────────────────────────────────────
app.listen(PORT, '127.0.0.1', () => {
  console.log('[ChemGuard] Server running at http://127.0.0.1:' + PORT);
  console.log('[ChemGuard] Mode: LOCAL DEVELOPMENT — Authentication pending');
  console.log('[ChemGuard] Allowed origin:', ALLOWED_ORIGIN);
});
