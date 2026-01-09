export interface Source {
  sourceType: "primary" | "secondary" | "official" | "analysis" | "commentary";
  id: string;
  url: string;
  title?: string;
  credibilityScore?: number;
  publicationDate?: string;
  biasAssessment?: string;
  authorName?: string;
  publisherName?: string;
}

export interface SearchTask {
  state: "unprocessed" | "processing" | "completed";
  query: string;
  researchGoal?: string;
  learning: string;
  sources?: Source[];
  id?: string;
  url?: string;
  title?: string;
  credibilityScore?: number;
  biasAssessment?: string;
}

export interface ResearchHistory {
  id: string;
  createdAt: number;
  updatedAt?: number;
  title: string;
  question: string;
  questions: string;
  finalReport: string;
  query: string;
  suggestion: string;
  tasks: SearchTask[];
  sources: Source[];
  feedback: string;
  articleType?: "news" | "feature" | "investigative" | "explainer";
}

export type SessionStatus = "in_progress" | "completed" | "paused";
export type SessionPhase = "questions" | "research" | "writing" | "complete";

export interface ResearchSession extends ResearchHistory {
  status: SessionStatus;
  currentPhase: SessionPhase;
  parentSessionId?: string; // for branched research sessions
  timeline?: TimelineEvent[];
  biasScore?: number | null;
  triangulatedClaims?: TriangulatedClaim[];
}

export interface PartialJson {
  value: JSONValue | undefined;
  state:
  | "undefined-input"
  | "successful-parse"
  | "repaired-parse"
  | "failed-parse";
}

export interface TimelineEvent {
  date: string;
  event: string;
  sources: string[]; // source IDs
}

export interface TriangulatedClaim {
  claim: string;
  supportingSources: string[]; // source IDs
  conflictingSources: string[]; // source IDs
  confidenceScore: number; // 0-100
  status: 'confirmed' | 'disputed' | 'single-source' | 'unverified';
}
