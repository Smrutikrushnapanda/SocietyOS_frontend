import { residentPreview } from '../lib/api/resident-feeds.api';
import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';
import {
  BackendPoll,
  BackendPollOptionResult,
  CreatePollInput,
  VotePollInput,
} from '../types/poll';
import {
  getPolls as apiGetPolls,
  getPollById as apiGetPollById,
  getPollResults as apiGetPollResults,
  voteInPoll as apiVoteInPoll,
  createPoll as apiCreatePoll,
  startPoll as apiStartPoll,
  endPoll as apiEndPoll,
} from '../lib/api/polls.api';
import { getUserFriendlyErrorMessage } from '../lib/api/errors';

interface PollState {
  polls: BackendPoll[];
  pollResults: Record<string, BackendPollOptionResult[]>;
  isLoading: boolean;
  error: string | null;
  votedPollIds: string[];
  hasLoaded: boolean;

  // Actions
  loadPolls: () => Promise<void>;
  loadPollResults: (pollId: string) => Promise<BackendPollOptionResult[]>;
  vote: (input: VotePollInput) => Promise<void>;
  createPoll: (input: CreatePollInput) => Promise<BackendPoll>;
  startPoll: (pollId: string) => Promise<void>;
  endPoll: (pollId: string) => Promise<void>;
  clearPolls: () => void;
  reset: () => void;
}

export const usePollStore = create<PollState>((set, get) => ({
  polls: [],
  pollResults: {},
  isLoading: false,
  error: null,
  votedPollIds: [],
  hasLoaded: false,

  clearPolls: () => set({ polls: [], pollResults: {}, error: null, isLoading: false, votedPollIds: [], hasLoaded: false }),

  loadPolls: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = useAuthStore.getState().roles.includes('RESIDENT') ? await residentPreview<BackendPoll>('/polls/page', { status: 'PUBLISHED' }) : await apiGetPolls();
      set({ polls: data, isLoading: false, error: null, hasLoaded: true });
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: getUserFriendlyErrorMessage(err, 'Failed to load polls'),
        hasLoaded: true,
      });
    }
  },

  loadPollResults: async (pollId: string) => {
    try {
      const results = await apiGetPollResults(pollId);
      set((state) => ({
        pollResults: {
          ...state.pollResults,
          [pollId]: results,
        },
      }));
      return results;
    } catch (err: unknown) {
      set({
        error: getUserFriendlyErrorMessage(err, 'Failed to load poll results'),
      });
      return [];
    }
  },

  vote: async (input: VotePollInput) => {
    set({ error: null });
    try {
      await apiVoteInPoll(input);
      set((state) => ({
        votedPollIds: [...state.votedPollIds, input.poll_id],
      }));
      // Refresh results for that poll
      await get().loadPollResults(input.poll_id);
    } catch (err: unknown) {
      const errMsg = getUserFriendlyErrorMessage(err, 'Failed to cast vote');
      set({ error: errMsg });
      throw err;
    }
  },

  createPoll: async (input: CreatePollInput) => {
    set({ isLoading: true, error: null });
    try {
      const created = await apiCreatePoll(input);
      set((state) => ({
        polls: [created, ...state.polls],
        isLoading: false,
        error: null,
      }));
      return created;
    } catch (err: unknown) {
      const errMsg = getUserFriendlyErrorMessage(err, 'Failed to create poll');
      set({ isLoading: false, error: errMsg });
      throw err;
    }
  },

  startPoll: async (pollId: string) => {
    try {
      await apiStartPoll(pollId);
      await get().loadPolls();
    } catch (err: unknown) {
      const errMsg = getUserFriendlyErrorMessage(err, 'Failed to start poll');
      set({ error: errMsg });
      throw err;
    }
  },

  endPoll: async (pollId: string) => {
    try {
      await apiEndPoll(pollId);
      await get().loadPolls();
    } catch (err: unknown) {
      const errMsg = getUserFriendlyErrorMessage(err, 'Failed to end poll');
      set({ error: errMsg });
      throw err;
    }
  },

  reset: () =>
    set({
      polls: [],
      pollResults: {},
      isLoading: false,
      error: null,
      votedPollIds: [],
      hasLoaded: false,
    }),
}));

if (typeof window !== 'undefined') {
  useAuthStore.subscribe((state, prevState) => {
    if (state.organizationId !== prevState.organizationId) {
      usePollStore.getState().reset();
    }
  });
}
