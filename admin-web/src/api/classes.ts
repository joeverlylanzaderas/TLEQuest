// admin-web/src/api/classes.ts
import { apiClient } from './client';
import type { ClassSummary, ClassEnrollment, ClassGroup, ClassUpdatePayload } from '../types/classes';

function list<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results;
}

export async function getClasses(): Promise<ClassSummary[]> {
  const { data } = await apiClient.get('/classrooms/classes/');
  return list<ClassSummary>(data);
}

export async function getClassEnrollments(classId: number): Promise<ClassEnrollment[]> {
  const { data } = await apiClient.get(`/classrooms/classes/${classId}/enrollments/`);
  return list<ClassEnrollment>(data);
}

export async function getClassGroups(classId: number): Promise<ClassGroup[]> {
  const { data } = await apiClient.get(`/classrooms/classes/${classId}/groups/`);
  return list<ClassGroup>(data);
}

export async function updateClass(classId: number, payload: ClassUpdatePayload): Promise<ClassSummary> {
  const { data } = await apiClient.patch<ClassSummary>(`/classrooms/classes/${classId}/`, payload);
  return data;
}