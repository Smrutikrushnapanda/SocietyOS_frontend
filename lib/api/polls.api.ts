/**
 * SocietyOS Polls API Client
 *
 * Resident & Admin:
 * - GET /polls (permission: poll:read) - Returns organization polls
 * - GET /polls/:id (permission: poll:read) - Returns single poll
 * - GET /polls/:id/results (permission: poll:read) - Returns aggregate option vote counts
 * - POST /polls/:id/vote (permission: poll:vote) - Cast resident vote (backend resolves Resident.id)
 *
 * Admin:
 * - POST /polls (permission: poll:manage) - Create new poll
 * - PUT /polls/:id/start (permission: poll:manage) - Start poll (DRAFT -> PUBLISHED)
 * - PUT /polls/:id/end (permission: poll:manage) - End poll (PUBLISHED -> CLOSED)
 *
 * Strictly scoped by X-Organization-Id header and authenticated session.
 */

import apiClient from './client';
import { useAuthStore } from '../../store/useAuthStore';
import {
  BackendPoll,
  BackendPollOptionResult,
  CreatePollInput,
  VotePollInput,
  EditPollInput,
} from '../../types/poll';

function getActiveOrganizationId(): string | null {
  const state = useAuthStore.getState();
  return state.organizationId || null;
}

/**
 * Get organization polls
 * GET /api/v1/polls
 */
export async function getPolls(): Promise<BackendPoll[]> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    throw new Error('Organization context is required to fetch polls');
  }

  const response = await apiClient.get<BackendPoll[]>('/polls', {
    headers: {
      'X-Organization-Id': orgId,
    },
  });
  return response.data;
}

/**
 * Get single poll detail
 * GET /api/v1/polls/:id
 */
export async function getPollById(id: string): Promise<BackendPoll | null> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    throw new Error('Organization context is required to fetch poll');
  }

  const response = await apiClient.get<BackendPoll | null>(`/polls/${id}`, {
    headers: {
      'X-Organization-Id': orgId,
    },
  });
  return response.data;
}

/**
 * Get poll aggregate results (sanitized, aggregate counts only)
 * GET /api/v1/polls/:id/results
 */
export async function getPollResults(
  id: string,
): Promise<BackendPollOptionResult[]> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    throw new Error('Organization context is required to fetch poll results');
  }

  const response = await apiClient.get<BackendPollOptionResult[]>(
    `/polls/${id}/results`,
    {
      headers: {
        'X-Organization-Id': orgId,
      },
    },
  );
  return response.data;
}

/**
 * Cast a resident vote
 * POST /api/v1/polls/:id/vote
 * Backend resolves Resident.id server-side from user session.
 */
export async function voteInPoll(input: VotePollInput): Promise<any> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    throw new Error('Organization context is required to vote');
  }

  const response = await apiClient.post<any>(
    `/polls/${input.poll_id}/vote`,
    input,
    {
      headers: {
        'X-Organization-Id': orgId,
      },
    },
  );
  return response.data;
}

/**
 * Admin: Create poll
 * POST /api/v1/polls
 */
export async function createPoll(input: CreatePollInput): Promise<BackendPoll> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    throw new Error('Organization context is required to create a poll');
  }

  const response = await apiClient.post<BackendPoll>('/polls', input, {
    headers: {
      'X-Organization-Id': orgId,
    },
  });
  return response.data;
}

export async function editPoll(id: string, input: EditPollInput): Promise<BackendPoll> {
  const orgId = getActiveOrganizationId();
  if (!orgId) throw new Error('Organization context is required to edit a poll');
  const response = await apiClient.patch<BackendPoll>(`/polls/${id}`, input, { headers: { 'X-Organization-Id': orgId } });
  return response.data;
}

/**
 * Admin: Start poll (transition DRAFT -> PUBLISHED)
 * PUT /api/v1/polls/:id/start
 */
export async function startPoll(id: string): Promise<BackendPoll | null> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    throw new Error('Organization context is required to start poll');
  }

  const response = await apiClient.put<BackendPoll | null>(
    `/polls/${id}/start`,
    {},
    {
      headers: {
        'X-Organization-Id': orgId,
      },
    },
  );
  return response.data;
}

/**
 * Admin: End poll (transition PUBLISHED -> CLOSED)
 * PUT /api/v1/polls/:id/end
 */
export async function endPoll(id: string): Promise<BackendPoll | null> {
  const orgId = getActiveOrganizationId();
  if (!orgId) {
    throw new Error('Organization context is required to end poll');
  }

  const response = await apiClient.put<BackendPoll | null>(
    `/polls/${id}/end`,
    {},
    {
      headers: {
        'X-Organization-Id': orgId,
      },
    },
  );
  return response.data;
}
