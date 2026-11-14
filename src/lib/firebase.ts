import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { DayCompletionMap, Habit } from '../types/habit';
import type {
  CalendarSyncState,
  PlannerCategory,
  PlannerSource,
  PlannerTask,
  TaskPriority,
  TimeBlock,
} from '../types/planner';

const app = initializeApp(firebaseConfig);
const firestoreDatabaseId = (
  firebaseConfig as { firestoreDatabaseId?: string }
).firestoreDatabaseId;
export const db = firestoreDatabaseId
  ? getFirestore(app, firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.addScope('https://www.googleapis.com/auth/calendar.events');

export function createCalendarConsentProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/calendar.events');
  provider.setCustomParameters({ prompt: 'consent' });
  return provider;
}

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

function sanitizeId(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 128);
  return cleaned || 'item-1';
}

function sanitizeDateKey(dateKey: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey : '2026-01-01';
}

export async function ensureUserProfileInFirestore(params: {
  uid: string;
  email: string;
  displayName?: string | null;
}): Promise<void> {
  const uid = sanitizeId(params.uid);
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);

  try {
    const snap = await getDoc(ref);
    const safeDisplayName = (params.displayName || 'Zest Member').slice(0, 120);
    const safeEmail = (params.email || `${uid}@zest.local`).slice(0, 254);

    if (!snap.exists()) {
      await setDoc(ref, {
        uid,
        email: safeEmail,
        displayName: safeDisplayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(
        ref,
        {
          displayName: safeDisplayName,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export interface FirestoreJournalItem {
  id: string;
  dateKey: string;
  transcript: string;
  source: 'voice' | 'text';
  createdAt: string;
}

export async function loadHabitStateFromFirestore(uid: string): Promise<{
  habits: Habit[];
  completions: DayCompletionMap;
  journals: FirestoreJournalItem[];
}> {
  const cleanUid = sanitizeId(uid);
  const habitsPath = `users/${cleanUid}/habits`;
  const completionsPath = `users/${cleanUid}/completions`;
  const journalsPath = `users/${cleanUid}/journalEntries`;

  let habitDocs;
  try {
    const q = query(
      collection(db, habitsPath),
      where('ownerId', '==', cleanUid),
    );
    habitDocs = await getDocs(q);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, habitsPath);
  }

  let completionDocs;
  try {
    const q = query(
      collection(db, completionsPath),
      where('ownerId', '==', cleanUid),
    );
    completionDocs = await getDocs(q);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, completionsPath);
  }

  let journalDocs;
  try {
    const q = query(
      collection(db, journalsPath),
      where('ownerId', '==', cleanUid),
      orderBy('createdAt', 'desc'),
    );
    journalDocs = await getDocs(q);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, journalsPath);
  }

  const habits: Habit[] = habitDocs.docs.map((d) => {
    const data = d.data();
    return {
      id: String(data.id),
      title: String(data.title),
      category: data.category,
      timeOfDay: data.timeOfDay,
      durationMinutes: Number(data.durationMinutes),
      cadence: data.cadence,
      xpReward: Number(data.xpReward),
      icon: data.icon,
      archived: Boolean(data.archived),
      createdAt: String(data.createdAt),
    };
  });

  const completions: DayCompletionMap = {};
  for (const d of completionDocs.docs) {
    const data = d.data();
    if (Array.isArray(data.habitIds)) {
      completions[String(data.dateKey)] = data.habitIds.map(String);
    }
  }

  const journals: FirestoreJournalItem[] = journalDocs.docs.map((d) => {
    const data = d.data();
    const ts = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
    return {
      id: d.id,
      dateKey: String(data.dateKey),
      transcript: String(data.transcript),
      source: data.source === 'text' ? 'text' : 'voice',
      createdAt: ts.toISOString(),
    };
  });

  return { habits, completions, journals };
}

export async function syncHabitStateToFirestore(
  uid: string,
  habits: Habit[],
  completions: DayCompletionMap,
): Promise<void> {
  const cleanUid = sanitizeId(uid);
  const batch = writeBatch(db);
  const habitsPath = `users/${cleanUid}/habits`;

  for (const h of habits.slice(0, 60)) {
    const habitId = sanitizeId(h.id);
    const ref = doc(db, habitsPath, habitId);
    const title = h.title.trim().slice(0, 60);
    if (title.length < 2) continue;

    batch.set(ref, {
      ownerId: cleanUid,
      id: habitId,
      title,
      category: h.category,
      timeOfDay: h.timeOfDay,
      durationMinutes: Math.max(1, Math.min(240, Math.round(h.durationMinutes))),
      cadence: h.cadence,
      xpReward: Math.max(5, Math.min(500, Math.round(h.xpReward))),
      icon: h.icon.slice(0, 32),
      archived: Boolean(h.archived),
      createdAt: sanitizeDateKey(h.createdAt),
      updatedAt: serverTimestamp(),
    });
  }

  const completionEntries = Object.entries(completions).slice(-60);
  for (const [rawDateKey, ids] of completionEntries) {
    const dateKey = sanitizeDateKey(rawDateKey);
    const ref = doc(db, `users/${cleanUid}/completions`, dateKey);
    const boundedIds = Array.from(new Set(ids))
      .map(sanitizeId)
      .slice(0, 50);
    batch.set(ref, {
      ownerId: cleanUid,
      dateKey,
      habitIds: boundedIds,
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, habitsPath);
  }
}

export async function deleteHabitFromFirestore(
  uid: string,
  habitId: string,
): Promise<void> {
  const cleanUid = sanitizeId(uid);
  const cleanHabitId = sanitizeId(habitId);
  const path = `users/${cleanUid}/habits/${cleanHabitId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveJournalEntryToFirestore(params: {
  uid: string;
  dateKey: string;
  transcript: string;
  source?: 'voice' | 'text';
}): Promise<FirestoreJournalItem> {
  const cleanUid = sanitizeId(params.uid);
  const entryId = sanitizeId(`j-${Date.now().toString(36)}`);
  const path = `users/${cleanUid}/journalEntries/${entryId}`;
  const cleanTranscript = params.transcript.trim().slice(0, 4000);
  const dateKey = sanitizeDateKey(params.dateKey);
  const source = params.source === 'text' ? 'text' : 'voice';

  try {
    await setDoc(doc(db, path), {
      ownerId: cleanUid,
      dateKey,
      transcript: cleanTranscript,
      source,
      createdAt: serverTimestamp(),
    });
    return {
      id: entryId,
      dateKey,
      transcript: cleanTranscript,
      source,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function loadPlannerStateFromFirestore(uid: string): Promise<{
  tasks: PlannerTask[];
  timeBlocks: TimeBlock[];
  syncState: CalendarSyncState | null;
}> {
  const cleanUid = sanitizeId(uid);
  const tasksPath = `users/${cleanUid}/tasks`;
  const blocksPath = `users/${cleanUid}/timeBlocks`;
  const syncPath = `users/${cleanUid}/syncState`;

  let taskDocs;
  try {
    taskDocs = await getDocs(
      query(collection(db, tasksPath), where('ownerId', '==', cleanUid)),
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, tasksPath);
  }

  let blockDocs;
  try {
    blockDocs = await getDocs(
      query(collection(db, blocksPath), where('ownerId', '==', cleanUid)),
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, blocksPath);
  }

  let syncDocs;
  try {
    syncDocs = await getDocs(
      query(collection(db, syncPath), where('ownerId', '==', cleanUid)),
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, syncPath);
  }

  const tasks: PlannerTask[] = taskDocs.docs.map((d) => {
    const data = d.data();
    return {
      id: String(data.id),
      title: String(data.title),
      dateKey: String(data.dateKey),
      startMinutes: typeof data.startMinutes === 'number' ? data.startMinutes : null,
      endMinutes: typeof data.endMinutes === 'number' ? data.endMinutes : null,
      durationMinutes: Number(data.durationMinutes || 30),
      priority: data.priority as TaskPriority,
      category: data.category as PlannerCategory,
      notes: String(data.notes ?? ''),
      completed: Boolean(data.completed),
      isEvent: Boolean(data.isEvent),
      source: (data.source === 'google' ? 'google' : 'zest') as PlannerSource,
      googleEventId: typeof data.googleEventId === 'string' ? data.googleEventId : null,
      createdAt: String(data.createdAt),
    };
  });

  const timeBlocks: TimeBlock[] = blockDocs.docs.map((d) => {
    const data = d.data();
    return {
      id: String(data.id),
      dateKey: String(data.dateKey),
      title: String(data.title),
      category: data.category as PlannerCategory,
      startMinutes: Number(data.startMinutes),
      endMinutes: Number(data.endMinutes),
      habitId: typeof data.habitId === 'string' ? data.habitId : null,
      taskId: typeof data.taskId === 'string' ? data.taskId : null,
      source: (data.source === 'google' ? 'google' : 'zest') as PlannerSource,
      googleEventId: typeof data.googleEventId === 'string' ? data.googleEventId : null,
    };
  });

  const syncDoc = syncDocs.docs[0]?.data();
  const syncState: CalendarSyncState | null = syncDoc
    ? {
        connected: Boolean(syncDoc.connected),
        lastSyncedAt: typeof syncDoc.lastSyncedAt === 'string' ? syncDoc.lastSyncedAt : null,
        syncedCount: Number(syncDoc.syncedCount || 0),
        calendarEmail: typeof syncDoc.calendarEmail === 'string' ? syncDoc.calendarEmail : null,
      }
    : null;

  return { tasks, timeBlocks, syncState };
}

export async function syncPlannerStateToFirestore(
  uid: string,
  tasks: PlannerTask[],
  timeBlocks: TimeBlock[],
  syncState?: CalendarSyncState | null,
): Promise<void> {
  const cleanUid = sanitizeId(uid);
  const batch = writeBatch(db);
  const tasksPath = `users/${cleanUid}/tasks`;
  const blocksPath = `users/${cleanUid}/timeBlocks`;

  for (const t of tasks.slice(0, 120)) {
    const taskId = sanitizeId(t.id);
    const title = t.title.trim().slice(0, 120);
    if (title.length < 2) continue;

    const startMin =
      typeof t.startMinutes === 'number'
        ? Math.max(0, Math.min(1440, Math.round(t.startMinutes)))
        : null;
    const endMin =
      typeof t.endMinutes === 'number'
        ? Math.max(0, Math.min(1440, Math.round(t.endMinutes)))
        : null;

    batch.set(doc(db, tasksPath, taskId), {
      ownerId: cleanUid,
      id: taskId,
      title,
      dateKey: sanitizeDateKey(t.dateKey),
      startMinutes: startMin,
      endMinutes: endMin,
      durationMinutes: Math.max(15, Math.min(480, Math.round(t.durationMinutes || 30))),
      priority: t.priority,
      category: t.category,
      notes: (t.notes || '').slice(0, 1000),
      completed: Boolean(t.completed),
      isEvent: Boolean(t.isEvent),
      source: t.source === 'google' ? 'google' : 'zest',
      googleEventId: t.googleEventId ? String(t.googleEventId).slice(0, 256) : null,
      createdAt: sanitizeDateKey(t.createdAt),
      updatedAt: serverTimestamp(),
    });
  }

  for (const b of timeBlocks.slice(0, 160)) {
    const blockId = sanitizeId(b.id);
    const title = b.title.trim().slice(0, 120);
    if (title.length < 2) continue;
    const startMinutes = Math.max(0, Math.min(1425, Math.round(b.startMinutes)));
    const endMinutes = Math.max(
      startMinutes + 15,
      Math.min(1440, Math.round(b.endMinutes)),
    );

    batch.set(doc(db, blocksPath, blockId), {
      ownerId: cleanUid,
      id: blockId,
      dateKey: sanitizeDateKey(b.dateKey),
      title,
      category: b.category,
      startMinutes,
      endMinutes,
      habitId: b.habitId ? sanitizeId(b.habitId) : null,
      taskId: b.taskId ? sanitizeId(b.taskId) : null,
      source: b.source === 'google' ? 'google' : 'zest',
      googleEventId: b.googleEventId ? String(b.googleEventId).slice(0, 256) : null,
      updatedAt: serverTimestamp(),
    });
  }

  if (syncState) {
    batch.set(doc(db, `users/${cleanUid}/syncState`, 'google'), {
      ownerId: cleanUid,
      connected: Boolean(syncState.connected),
      lastSyncedAt: syncState.lastSyncedAt ? String(syncState.lastSyncedAt).slice(0, 64) : null,
      syncedCount: Math.max(0, Math.min(500, Math.round(syncState.syncedCount || 0))),
      calendarEmail: syncState.calendarEmail ? String(syncState.calendarEmail).slice(0, 254) : null,
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, tasksPath);
  }
}

export async function deletePlannerTaskFromFirestore(
  uid: string,
  taskId: string,
): Promise<void> {
  const cleanUid = sanitizeId(uid);
  const cleanId = sanitizeId(taskId);
  const path = `users/${cleanUid}/tasks/${cleanId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function deleteTimeBlockFromFirestore(
  uid: string,
  blockId: string,
): Promise<void> {
  const cleanUid = sanitizeId(uid);
  const cleanId = sanitizeId(blockId);
  const path = `users/${cleanUid}/timeBlocks/${cleanId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

