// mobile/src/api/submissions.ts
import { apiClient } from './client';
import { Submission, SubmissionCreatePayload, SubmissionReviewPayload } from '../types/submissions';

// Handles a plain array or DRF's paginated { results: [...] } shape
function normalizeList<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results;
}

export async function createSubmission(payload: SubmissionCreatePayload): Promise<Submission> {
  const { data } = await apiClient.post<Submission>('/submissions/submissions/', payload);
  return data;
}

// Students get their group's submissions, teachers get submissions for their quests
export async function getSubmissions(): Promise<Submission[]> {
  const { data } = await apiClient.get('/submissions/submissions/');
  return normalizeList<Submission>(data);
}

export async function getSubmission(id: number): Promise<Submission> {
  const { data } = await apiClient.get<Submission>(`/submissions/submissions/${id}/`);
  return data;
}

export async function reviewSubmission(id: number, payload: SubmissionReviewPayload): Promise<Submission> {
  const { data } = await apiClient.patch<Submission>(`/submissions/submissions/${id}/review/`, payload);
  return data;
}