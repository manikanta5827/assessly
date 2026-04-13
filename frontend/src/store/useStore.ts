import { create } from 'zustand';
import { User } from '@supabase/supabase-js';

interface AssessmentResult {
  assessmentId: string;
  score: number;
  summary: {
    goods: string[];
    bads: string[];
  };
  interviewQuestions: string[];
  testDetection: {
    exists: boolean;
    command: string;
    language: string;
    libraries?: string[];
  };
  testExecuted?: boolean;
  testResults?: {
    success: boolean;
    stdout: string;
    stderr: string;
  } | null;
}

interface AssesslyState {
  user: User | null;
  assessmentDoc: string;
  repoUrl: string;
  result: AssessmentResult | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setAssessmentDoc: (doc: string) => void;
  setRepoUrl: (url: string) => void;
  setResult: (result: AssessmentResult | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useAssesslyStore = create<AssesslyState>((set) => ({
  user: null,
  assessmentDoc: '',
  repoUrl: '',
  result: null,
  isLoading: false,
  error: null,
  setAssessmentDoc: (assessmentDoc) => set({ assessmentDoc }),
  setRepoUrl: (repoUrl) => set({ repoUrl }),
  setResult: (result) => set({ result }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set({ assessmentDoc: '', repoUrl: '', result: null, error: null }),
}));
