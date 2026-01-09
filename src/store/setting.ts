import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_THINKING_MODEL, DEFAULT_SEARCH_MODEL } from "@/constants/models";

export interface SettingStore {
  apiKey: string;
  apiProxy: string;
  accessPassword: string;
  thinkingModel: string;
  networkingModel: string;
  searchModel: string;
  researchDepth: number;
  language: string;
}

interface SettingFunction {
  update: (values: Partial<SettingStore>) => void;
}

export const defaultValues = {
  apiKey: "",
  apiProxy: "https://generativelanguage.googleapis.com",
  accessPassword: "",
  thinkingModel: DEFAULT_THINKING_MODEL,
  networkingModel: DEFAULT_THINKING_MODEL,
  searchModel: DEFAULT_SEARCH_MODEL,
  researchDepth: 2,
  language: "",
};

// Note: We no longer proactively migrate models. The rate limiter will
// detect unavailable models via actual API errors and suggest fallbacks.
// This preserves user choice and doesn't assume models are deprecated.

export const useSettingStore = create(
  persist<SettingStore & SettingFunction>(
    (set) => ({
      ...defaultValues,
      update: (values) => set(values),
    }),
    {
      name: "setting",
      version: 1,
    }
  )
);
