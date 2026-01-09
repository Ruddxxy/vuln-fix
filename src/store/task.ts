import { create } from "zustand";
import { persist } from "zustand/middleware";
import { pick } from "radash";

export interface TaskStore {
  id: string;
  question: string;
  questions: string;
  finalReport: string;
  query: string;
  title: string;
  suggestion: string;
  tasks: SearchTask[];
  sources: Source[];
  feedback: string;
  articleType: "news" | "feature" | "investigative" | "explainer";
  timeline: TimelineEvent[];
  biasScore: number | null; // 0-100, null if not analyzed
  triangulatedClaims: TriangulatedClaim[];
}

type TaskFunction = {
  update: (tasks: SearchTask[]) => void;
  setId: (id: string) => void;
  setTitle: (title: string) => void;
  setSuggestion: (suggestion: string) => void;
  setQuery: (query: string) => void;
  updateTask: (query: string, task: Partial<SearchTask>) => void;
  removeTask: (query: string) => boolean;
  setQuestion: (question: string) => void;
  updateQuestions: (questions: string) => void;
  updateFinalReport: (report: string) => void;
  setSources: (sources: Source[]) => void;
  setFeedback: (feedback: string) => void;
  setArticleType: (articleType: "news" | "feature" | "investigative" | "explainer") => void;
  setTimeline: (timeline: TimelineEvent[]) => void;
  setBiasScore: (score: number | null) => void;
  setTriangulatedClaims: (claims: TriangulatedClaim[]) => void;
  clear: () => void;
  reset: () => void;
  backup: () => TaskStore;
  restore: (taskStore: TaskStore) => void;
};

const defaultValues: TaskStore = {
  id: "",
  question: "",
  questions: "",
  finalReport: "",
  query: "",
  title: "",
  suggestion: "",
  tasks: [],
  sources: [],
  feedback: "",
  articleType: "news",
  timeline: [],
  biasScore: null,
  triangulatedClaims: [],
};

export const useTaskStore = create(
  persist<TaskStore & TaskFunction>(
    (set, get) => ({
      ...defaultValues,
      update: (tasks) => set(() => ({ tasks: [...tasks] })),
      setId: (id) => set(() => ({ id })),
      setTitle: (title) => set(() => ({ title })),
      setSuggestion: (suggestion) => set(() => ({ suggestion })),
      setQuery: (query) => set(() => ({ query })),
      updateTask: (query, task) => {
        console.log(`Updating task ${query} with:`, task);
        if (task.sources) {
          console.log(`Task ${query} updating with ${task.sources.length} sources`);
        }
        
        const newTasks = get().tasks.map((item) => {
          return item.query === query ? { ...item, ...task } : item;
        });
        
        set(() => {
          console.log(`Setting tasks to ${newTasks.length} tasks`);
          return { tasks: [...newTasks] };
        });
        
        // Log the task after update to verify sources are set correctly
        const updatedTask = get().tasks.find(t => t.query === query);
        if (updatedTask) {
          console.log(`Task ${query} after update:`, {
            query: updatedTask.query,
            sourcesCount: updatedTask.sources?.length || 0,
            state: updatedTask.state
          });
        }
      },
      removeTask: (query) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.query !== query),
        }));
        return true;
      },
      setQuestion: (question) => set(() => ({ question })),
      updateQuestions: (questions) => set(() => ({ questions })),
      updateFinalReport: (report) => set(() => ({ finalReport: report })),
      setSources: (sources) => {
        console.log(`Setting global sources array with ${sources.length} sources`);
        set(() => ({ sources }));
        
        // Log the sources after update
        console.log("Global sources after update:", get().sources.length);
      },
      setFeedback: (feedback) => set(() => ({ feedback })),
      setArticleType: (articleType) => set(() => ({ articleType })),
      setTimeline: (timeline) => set(() => ({ timeline })),
      setBiasScore: (biasScore) => set(() => ({ biasScore })),
      setTriangulatedClaims: (triangulatedClaims) => set(() => ({ triangulatedClaims })),
      clear: () => set(() => ({ tasks: [] })),
      reset: () => set(() => ({ ...defaultValues })),
      backup: () => {
        return {
          ...pick(get(), Object.keys(defaultValues) as (keyof TaskStore)[]),
        } as TaskStore;
      },
      restore: (taskStore) => set(() => ({ ...taskStore })),
    }),
    { name: "research" }
  )
);
