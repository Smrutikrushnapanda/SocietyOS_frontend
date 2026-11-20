export type PollType = 'SINGLE' | 'MULTIPLE';

export type BackendPollStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

export interface BackendPollOption {
  id: string;
  poll_id: string;
  organization_id: string;
  option_text: string;
  display_order: number;
}

export interface BackendPollOptionResult {
  id: string;
  option_text: string;
  display_order: number;
  vote_count: number;
}

export interface BackendPoll {
  id: string;
  organization_id: string;
  title: string;
  description?: string;
  status: BackendPollStatus;
  poll_type?: PollType;
  starts_at: string;
  ends_at: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  options?: BackendPollOptionResult[] | BackendPollOption[];
  has_voted?: boolean;
}

export interface CreatePollOptionInput {
  option_text: string;
  display_order?: number;
}

export interface CreatePollInput {
  title: string;
  description?: string;
  poll_type?: PollType;
  starts_at: string;
  ends_at: string;
  options?: CreatePollOptionInput[];
}

export interface VotePollInput {
  poll_id: string;
  option_id?: string;
  option_ids?: string[];
}

export interface EditPollInput {
  title?: string;
  description?: string;
  poll_type?: PollType;
  starts_at?: string;
  ends_at?: string;
  options?: (CreatePollOptionInput & { id?: string })[];
}
