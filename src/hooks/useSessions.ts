// Hooks for Session CRUD operations
// Handles session lifecycle and relationships with logged sets

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDB, STORE_NAMES } from "../lib/db";
import type {
  SessionDTO,
  CreateSessionCmd,
  UpdateSessionCmd,
  DeleteSessionCmd,
  SetSessionStatusCmd,
  SessionsQueryParams,
} from "../types";

const QUERY_KEY = "sessions";

/**
 * Fetches all sessions with optional filtering
 */
export function useSessions(params: SessionsQueryParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const db = await getDB();
      const tx = db.transaction(STORE_NAMES.sessions, "readonly");
      const store = tx.objectStore(STORE_NAMES.sessions);

      let sessions: SessionDTO[];

      // Filter by status and date using compound index if both provided
      if (params.status && params.dateRange?.from && params.dateRange?.to) {
        const index = store.index("status_date");
        const range = IDBKeyRange.bound(
          [params.status, params.dateRange.from],
          [params.status, params.dateRange.to]
        );
        sessions = await index.getAll(range);
      } else if (params.status) {
        const index = store.index("status");
        sessions = await index.getAll(params.status);
      } else if (params.dateRange?.from || params.dateRange?.to) {
        const index = store.index("date");
        const range = params.dateRange.from && params.dateRange.to
          ? IDBKeyRange.bound(params.dateRange.from, params.dateRange.to)
          : params.dateRange.from
          ? IDBKeyRange.lowerBound(params.dateRange.from)
          : IDBKeyRange.upperBound(params.dateRange.to!);
        sessions = await index.getAll(range);
      } else {
        sessions = await store.getAll();
      }

      // Filter by sourcePlanId
      if (params.sourcePlanId) {
        sessions = sessions.filter(
          (s) => s.sourcePlanId === params.sourcePlanId
        );
      }

      // Sort
      if (params.sort === "date") {
        sessions.sort((a, b) => b.date - a.date);
      } else if (params.sort === "createdAt") {
        sessions.sort((a, b) => b.createdAt - a.createdAt);
      }

      // Pagination
      if (params.pagination) {
        const { page = 0, pageSize = 50 } = params.pagination;
        const start = page * pageSize;
        sessions = sessions.slice(start, start + pageSize);
      }

      return sessions;
    },
  });
}

/**
 * Fetches a single session by ID
 */
export function useSession(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      const db = await getDB();
      return db.get(STORE_NAMES.sessions, id);
    },
    enabled: !!id,
  });
}

/**
 * Creates a new session
 */
export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session: CreateSessionCmd) => {
      const db = await getDB();
      await db.add(STORE_NAMES.sessions, session);
      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

/**
 * Updates an existing session
 */
export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cmd: UpdateSessionCmd) => {
      const db = await getDB();
      const existing = await db.get(STORE_NAMES.sessions, cmd.id);
      if (!existing) {
        throw new Error(`Session ${cmd.id} not found`);
      }

      const updated: SessionDTO = {
        ...existing,
        ...cmd,
        updatedAt: Date.now(),
      };

      await db.put(STORE_NAMES.sessions, updated);
      return updated;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, data.id] });
    },
  });
}

/**
 * Sets session status (active/completed)
 */
export function useSetSessionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cmd: SetSessionStatusCmd) => {
      const db = await getDB();
      const existing = await db.get(STORE_NAMES.sessions, cmd.sessionId);
      if (!existing) {
        throw new Error(`Session ${cmd.sessionId} not found`);
      }

      const updated: SessionDTO = {
        ...existing,
        status: cmd.status,
        updatedAt: Date.now(),
      };

      await db.put(STORE_NAMES.sessions, updated);
      return updated;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, data.id] });
    },
  });
}

/**
 * Deletes a session and all associated logged sets
 */
export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cmd: DeleteSessionCmd) => {
      const db = await getDB();
      
      // Delete all logged sets for this session
      const tx = db.transaction([STORE_NAMES.sessions, STORE_NAMES.loggedSets], "readwrite");
      const loggedSetsStore = tx.objectStore(STORE_NAMES.loggedSets);
      const sessionStore = tx.objectStore(STORE_NAMES.sessions);
      
      // Get all sets for this session
      const index = loggedSetsStore.index("sessionId");
      const sets = await index.getAll(cmd.id);
      
      // Delete all sets
      await Promise.all(sets.map((set) => loggedSetsStore.delete(set.id)));
      
      // Delete the session
      await sessionStore.delete(cmd.id);
      
      await tx.done;
      
      return { sessionId: cmd.id, deletedSets: sets.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["loggedSets"] });
    },
  });
}
