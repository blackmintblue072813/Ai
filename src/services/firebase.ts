import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Folder, LogEntry } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth & Firestore (Using explicitly configured firestoreDatabaseId)
export const auth = getAuth(app);
export const db: Firestore = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Error handler helper conforming to FirestoreErrorInfo standard
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection: client appears offline, using cached or local mode.');
    }
  }
}

// Check for redirect result on app boot (for mobile / redirect flow)
export async function checkRedirectAuth(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const userRef = doc(db, 'users', result.user.uid);
      await setDoc(
        userRef,
        {
          uid: result.user.uid,
          email: result.user.email || '',
          displayName: result.user.displayName || '',
          photoURL: result.user.photoURL || '',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      return result.user;
    }
  } catch (error) {
    console.warn('Redirect auth check warning:', error);
  }
  return null;
}

// Auth helpers: tries popup first, gracefully falls back to redirect for mobile web/in-app browsers
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      const userRef = doc(db, 'users', result.user.uid);
      await setDoc(
        userRef,
        {
          uid: result.user.uid,
          email: result.user.email || '',
          displayName: result.user.displayName || '',
          photoURL: result.user.photoURL || '',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
    return result.user;
  } catch (error: any) {
    const errorCode = error?.code || '';
    // If popup was blocked, closed, or not supported (e.g. mobile Safari / Chrome WebView), fallback to redirect
    if (
      errorCode === 'auth/popup-blocked' ||
      errorCode === 'auth/popup-closed-by-user' ||
      errorCode === 'auth/cancelled-popup-request' ||
      errorCode === 'auth/operation-not-supported-in-this-environment'
    ) {
      console.log('Popup prevented, falling back to signInWithRedirect...');
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    console.error('Sign-in failed:', error);
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

// Cloud sync operations for Folders & Logs
export async function syncFoldersToCloud(userId: string, folders: Folder[]) {
  const path = `users/${userId}/folders`;
  try {
    for (const folder of folders) {
      const folderDoc = doc(db, 'users', userId, 'folders', folder.id);
      await setDoc(
        folderDoc,
        {
          id: folder.id,
          name: folder.name,
          userId,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveLogToCloud(userId: string, log: LogEntry) {
  const path = `users/${userId}/logs/${log.id}`;
  try {
    const logDoc = doc(db, 'users', userId, 'logs', log.id);
    await setDoc(logDoc, {
      ...log,
      userId,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteLogFromCloud(userId: string, logId: string) {
  const path = `users/${userId}/logs/${logId}`;
  try {
    const logDoc = doc(db, 'users', userId, 'logs', logId);
    await deleteDoc(logDoc);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function deleteFolderFromCloud(userId: string, folderId: string) {
  const path = `users/${userId}/folders/${folderId}`;
  try {
    const folderDoc = doc(db, 'users', userId, 'folders', folderId);
    await deleteDoc(folderDoc);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Listeners
export function subscribeToUserFolders(
  userId: string,
  onUpdate: (folders: Folder[]) => void,
  onError?: (err: any) => void
) {
  const coll = collection(db, 'users', userId, 'folders');
  return onSnapshot(
    coll,
    (snapshot) => {
      const list: Folder[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: data.id || docSnap.id,
          name: data.name,
        });
      });
      onUpdate(list);
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.LIST, `users/${userId}/folders`);
    }
  );
}

export function subscribeToUserLogs(
  userId: string,
  onUpdate: (logs: LogEntry[]) => void,
  onError?: (err: any) => void
) {
  const coll = collection(db, 'users', userId, 'logs');
  return onSnapshot(
    coll,
    (snapshot) => {
      const list: LogEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: data.id || docSnap.id,
          folderId: data.folderId,
          title: data.title,
          content: data.content,
          isFavorite: !!data.isFavorite,
          fontSize: data.fontSize || 'base',
          highlights: data.highlights || [],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      });
      onUpdate(list);
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.LIST, `users/${userId}/logs`);
    }
  );
}
