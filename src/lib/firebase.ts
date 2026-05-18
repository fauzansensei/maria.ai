import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app: any = null;
let auth: any = null;
let db: any = null;

try {
  if (firebaseConfig.projectId) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    // CRITICAL: Must use firestoreDatabaseId from config
    const dbId = (firebaseConfig as any).firestoreDatabaseId;
    if (dbId) {
      db = getFirestore(app, dbId);
      console.log(`Maria AI: Firebase UI initialized with database: ${dbId}`);
    } else {
      db = getFirestore(app);
      console.log("Maria AI: Firebase UI initialized with default database");
    }
  } else {
    console.warn("Maria AI: Firebase project ID missing in config. Firestore will be unavailable.");
  }
} catch (error) {
  console.error("Maria AI: Firebase initialization failed.", error);
}

export async function testFirestoreConnection() {
  if (!db) {
    console.warn("Maria AI: Skipping connection test - Firestore not initialized.");
    return;
  }
  
  // Wait a bit for initialization to settle
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    console.log("Maria AI: Testing Firestore connection...");
    // Testing connection with a non-existent doc is fine, we just want to see if the server responds
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Maria AI: Firestore connection verified.");
  } catch (error: any) {
    if (error.message?.includes('the client is offline')) {
      console.error("Maria AI: Could not reach Firestore backend. The client is offline.");
    } else if (error.code === 'permission-denied') {
      console.log("Maria AI: Firestore reachable (permission denied as expected for unauthenticated test).");
    } else {
      console.log("Maria AI: Firestore connection test info:", error.message);
    }
  }
}

export { auth, db };
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function sanitizeForFirestore(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  
  const sanitized: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      sanitized[key] = sanitizeForFirestore(obj[key]);
    }
  }
  return sanitized;
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let isSignInProgress = false;

export const loginWithGoogle = async () => {
  if (!auth) throw new Error("Firebase Auth not initialized");
  if (!googleProvider) throw new Error("Google Provider not initialized");
  
  if (isSignInProgress) {
    console.warn("Maria AI: Sign-in already in progress.");
    return null;
  }

  isSignInProgress = true;
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      console.log("Maria AI: Login popup closed by user. No action taken.");
      return null;
    }
    if (error.code === 'auth/cancelled-popup-request') {
      console.log("Maria AI: Multiple sign-in requests detected. Existing request cancelled.");
      return null;
    }
    console.error("Maria AI: Error signing in with Google", error);
    throw error;
  } finally {
    isSignInProgress = false;
  }
};

export const logout = async () => {
  if (!auth) throw new Error("Firebase Auth not initialized");
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};
