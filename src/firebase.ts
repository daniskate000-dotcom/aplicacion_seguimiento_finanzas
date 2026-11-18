import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { BudgetMovement, ExpenseRecord, IncomeRecord } from './types/budget';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

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
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export interface UserProfileDoc {
  ownerId: string;
  displayName: string;
  monthlyBudget: number;
  onboardingCompleted: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

function clampString(value: string, maxLen: number, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLen);
}

function clampAmount(value: number): number {
  const rounded = Math.round(value);
  if (!Number.isFinite(rounded) || rounded <= 0) return 1;
  return Math.min(rounded, 1000000000);
}

export function sanitizeFirestoreId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  return cleaned || `mov-${Date.now()}`;
}

export async function createUserBudgetProfile(
  uid: string,
  displayName: string,
  monthlyBudget: number,
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await setDoc(doc(db, 'users', uid), {
      ownerId: uid,
      displayName: clampString(displayName, 60, 'Usuario'),
      monthlyBudget: clampAmount(monthlyBudget),
      onboardingCompleted: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateUserBudget(
  uid: string,
  monthlyBudget: number,
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      monthlyBudget: clampAmount(monthlyBudget),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateUserDisplayName(
  uid: string,
  displayName: string,
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      displayName: clampString(displayName, 60, 'Usuario'),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveUserMovement(
  uid: string,
  movement: BudgetMovement,
): Promise<void> {
  const safeId = sanitizeFirestoreId(movement.id);
  const path = `users/${uid}/movements/${safeId}`;
  const clampedDay = Math.min(31, Math.max(1, Math.round(movement.day || 1)));
  const noteTrimmed = movement.note?.trim();

  const basePayload = {
    ownerId: uid,
    type: movement.type,
    day: clampedDay,
    dateLabel: clampString(movement.dateLabel, 40, '17 nov 2026'),
    timeLabel: clampString(movement.timeLabel, 30, 'Ahora'),
    concept: clampString(movement.concept, 160, 'Movimiento'),
    amount: clampAmount(movement.amount),
    createdAt: serverTimestamp(),
    ...(noteTrimmed ? { note: noteTrimmed.slice(0, 500) } : {}),
  };

  try {
    if (movement.type === 'expense') {
      const exp = movement as ExpenseRecord;
      await setDoc(doc(db, 'users', uid, 'movements', safeId), {
        ...basePayload,
        category: exp.category,
      });
    } else {
      const inc = movement as IncomeRecord;
      await setDoc(doc(db, 'users', uid, 'movements', safeId), {
        ...basePayload,
        incomeCategory: inc.incomeCategory,
        paymentMethod: inc.paymentMethod,
        fullDateText: clampString(inc.fullDateText, 60, movement.dateLabel),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
