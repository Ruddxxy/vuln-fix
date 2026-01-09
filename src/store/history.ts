import { create } from "zustand";
import { persist, type StorageValue } from "zustand/middleware";
import type { TaskStore } from "./task";
import { researchStore } from "@/utils/storage";
import { customAlphabet } from "nanoid";
import { clone, pick } from "radash";

type HistoryStore = {
  history: ResearchHistory[];
  sessions: ResearchSession[];
};

type HistoryFunction = {
  save: (taskStore: TaskStore) => string;
  load: (id: string) => TaskStore | void;
  update: (id: string, taskStore: TaskStore) => boolean;
  remove: (id: string) => boolean;
  // Session management functions
  saveSession: (
    taskStore: TaskStore,
    status: SessionStatus,
    phase: SessionPhase
  ) => string;
  resumeSession: (id: string) => ResearchSession | null;
  branchSession: (id: string) => string;
  getInProgressSessions: () => ResearchSession[];
  updateSessionStatus: (
    id: string,
    status: SessionStatus,
    phase: SessionPhase
  ) => void;
};

const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 12);

export const useHistoryStore = create(
  persist<HistoryStore & HistoryFunction>(
    (set, get) => ({
      history: [],
      sessions: [],
      save: (taskStore) => {
        // Only tasks with a title and final report are saved to the history
        if (taskStore.title && taskStore.finalReport) {
          const id = nanoid();
          const newHistory: ResearchHistory = {
            ...clone(taskStore),
            id,
            createdAt: Date.now(),
          };
          set((state) => ({ history: [newHistory, ...state.history] }));
          return id;
        }
        return "";
      },
      load: (id) => {
        const current = get().history.find((item) => item.id === id);
        if (current) return clone(current);
      },
      update: (id, taskStore) => {
        const newHistory = get().history.map((item) => {
          if (item.id === id) {
            return {
              ...clone(taskStore),
              updatedAt: Date.now(),
            } as ResearchHistory;
          } else {
            return item;
          }
        });
        set(() => ({ history: [...newHistory] }));
        return true;
      },
      remove: (id) => {
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        }));
        return true;
      },
      // Session management functions
      saveSession: (taskStore, status, phase) => {
        const id = nanoid();
        const newSession: ResearchSession = {
          ...clone(taskStore),
          id,
          createdAt: Date.now(),
          status,
          currentPhase: phase,
          timeline: taskStore.timeline,
          biasScore: taskStore.biasScore,
          triangulatedClaims: taskStore.triangulatedClaims,
        };

        // Check if this session already exists (update existing session by task id)
        const existingIndex = get().sessions.findIndex(
          (s) => s.id === taskStore.id && taskStore.id !== ""
        );

        if (existingIndex >= 0) {
          // Update existing session
          const updatedSessions = [...get().sessions];
          updatedSessions[existingIndex] = {
            ...newSession,
            id: taskStore.id, // Keep the original session ID
            createdAt: get().sessions[existingIndex].createdAt,
            updatedAt: Date.now(),
          };
          set(() => ({ sessions: updatedSessions }));
          return taskStore.id;
        }

        // Add new session
        set((state) => ({ sessions: [newSession, ...state.sessions] }));
        return id;
      },
      resumeSession: (id) => {
        const session = get().sessions.find((s) => s.id === id);
        if (session) {
          return clone(session);
        }
        return null;
      },
      branchSession: (id) => {
        const originalSession = get().sessions.find((s) => s.id === id);
        if (!originalSession) {
          return "";
        }

        const newId = nanoid();
        const branchedSession: ResearchSession = {
          ...clone(originalSession),
          id: newId,
          createdAt: Date.now(),
          updatedAt: undefined,
          status: "in_progress",
          parentSessionId: id,
          // Create a branched title to indicate this is a fork
          title: originalSession.title
            ? `${originalSession.title} (branched)`
            : "",
        };

        set((state) => ({ sessions: [branchedSession, ...state.sessions] }));
        return newId;
      },
      getInProgressSessions: () => {
        return get().sessions.filter(
          (s) => s.status === "in_progress" || s.status === "paused"
        );
      },
      updateSessionStatus: (id, status, phase) => {
        const updatedSessions = get().sessions.map((session) => {
          if (session.id === id) {
            return {
              ...session,
              status,
              currentPhase: phase,
              updatedAt: Date.now(),
            };
          }
          return session;
        });
        set(() => ({ sessions: updatedSessions }));
      },
    }),
    {
      name: "historyStore",
      version: 2, // Bump version for migration
      storage: {
        getItem: async (key: string) => {
          return await researchStore.getItem<
            StorageValue<HistoryStore & HistoryFunction>
          >(key);
        },
        setItem: async (
          key: string,
          store: StorageValue<HistoryStore & HistoryFunction>
        ) => {
          return await researchStore.setItem(key, {
            state: pick(store.state, ["history", "sessions"]),
            version: store.version,
          });
        },
        removeItem: async (key: string) => await researchStore.removeItem(key),
      },
      // Migration from version 1 to version 2
      migrate: (persistedState, version) => {
        if (version === 1) {
          // Add sessions array if missing
          const state = persistedState as HistoryStore & HistoryFunction;
          return {
            ...state,
            sessions: state.sessions || [],
          };
        }
        return persistedState as HistoryStore & HistoryFunction;
      },
    }
  )
);
