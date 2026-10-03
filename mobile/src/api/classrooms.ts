import { apiClient } from './client';
import { ClassSummary, ClassEnrollment, Group, ClassCreatePayload, ClassUpdatePayload } from '../types/classrooms';
import { GroupCreatePayload, GroupUpdatePayload, GroupMemberCreatePayload, GroupMember } from '../types/classrooms'; 

export async function getMyClasses(): Promise<ClassSummary[]> {
  const { data } = await apiClient.get<ClassSummary[]>('/classrooms/classes/');
  return data;
}

export async function createClass(payload: ClassCreatePayload): Promise<ClassSummary> {
  const { data } = await apiClient.post<ClassSummary>('/classrooms/classes/', payload);
  return data;
}

export async function updateClass(classId: number, payload: ClassUpdatePayload): Promise<ClassSummary> {
  const { data } = await apiClient.patch<ClassSummary>(`/classrooms/classes/${classId}/`, payload);
  return data;
}

export async function getClassEnrollments(classId: number): Promise<ClassEnrollment[]> {
  const { data } = await apiClient.get<ClassEnrollment[]>(`/classrooms/classes/${classId}/enrollments/`);
  return data;
}

export async function getClassGroups(classId: number): Promise<Group[]> {
  const { data } = await apiClient.get<Group[]>(`/classrooms/classes/${classId}/groups/`);
  return data;
}

export async function getClassDetail(classId: number): Promise<ClassSummary> {
  const { data } = await apiClient.get<ClassSummary>(`/classrooms/classes/${classId}/`);
  return data;
}

export async function createGroup(classId: number, payload: GroupCreatePayload): Promise<Group> {
  const { data } = await apiClient.post<Group>(`/classrooms/classes/${classId}/groups/`, payload);
  return data;
}

export async function updateGroup(groupId: number, payload: GroupUpdatePayload): Promise<Group> {
  const { data } = await apiClient.patch<Group>(`/classrooms/groups/${groupId}/`, payload);
  return data;
}

export async function deleteGroup(groupId: number): Promise<void> {
  await apiClient.delete(`/classrooms/groups/${groupId}/`);
}

export async function addGroupMember(groupId: number, payload: GroupMemberCreatePayload): Promise<GroupMember> {
  const { data } = await apiClient.post<GroupMember>(`/classrooms/groups/${groupId}/members/`, payload);
  return data;
}

export async function removeGroupMember(memberId: number): Promise<void> {
  await apiClient.delete(`/classrooms/groups/members/${memberId}/`);
}

export async function joinClass(inviteCode: string): Promise<ClassEnrollment> {
  const { data } = await apiClient.post('/classrooms/classes/join/', { invite_code: inviteCode });
  return data;
}