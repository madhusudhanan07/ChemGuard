import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { existsSync, readFileSync } from 'fs';

let _db = null;

export function initFirebase() {
  if (getApps().length > 0) { _db = getFirestore(); return; }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!credPath || !projectId) {
    console.error('[ChemGuard] FATAL: Missing required environment variables.');
    if (!projectId)  console.error('  FIREBASE_PROJECT_ID is not set.');
    if (!credPath)   console.error('  GOOGLE_APPLICATION_CREDENTIALS is not set.');
    console.error('[ChemGuard] Edit server/.env and fill in both values, then restart.');
    process.exit(1);
  }

  // Confirm the file exists before trying to read it
  if (!existsSync(credPath)) {
    console.error('[ChemGuard] FATAL: Service-account file not found at:');
    console.error('  ' + credPath);
    console.error('[ChemGuard] Steps to fix:');
    console.error('  1. Revoke the old key in Firebase Console > Project Settings > Service Accounts');
    console.error('  2. Click Generate new private key and save the JSON to:');
    console.error('     server/credentials/chemguard-service-account.json');
    console.error('  3. Confirm GOOGLE_APPLICATION_CREDENTIALS in server/.env points to that path');
    process.exit(1);
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));
  } catch (err) {
    console.error('[ChemGuard] FATAL: Cannot parse service-account JSON at:', credPath);
    console.error('[ChemGuard] Ensure the file is valid JSON downloaded from Firebase Console.');
    console.error('[ChemGuard] Parse error:', err.message);
    process.exit(1);
  }

  // Sanity-check that the JSON looks like a service account (no private key content logged)
  if (!serviceAccount.type || serviceAccount.type !== 'service_account') {
    console.error('[ChemGuard] FATAL: The JSON at GOOGLE_APPLICATION_CREDENTIALS does not appear to be a Firebase service account.');
    console.error('[ChemGuard] Download it from Firebase Console > Project Settings > Service Accounts > Generate new private key.');
    process.exit(1);
  }

  try {
    initializeApp({ credential: cert(serviceAccount), projectId });
    _db = getFirestore();
    console.log('[ChemGuard] Firebase Admin SDK initialized.');
    console.log('[ChemGuard] Project:', projectId);
    console.log('[ChemGuard] Service account:', serviceAccount.client_email);
  } catch (err) {
    console.error('[ChemGuard] FATAL: Firebase initialization failed:', err.message);
    process.exit(1);
  }
}

export function getDb() {
  if (!_db) throw new Error('Firebase not initialized. Call initFirebase() first.');
  return _db;
}
