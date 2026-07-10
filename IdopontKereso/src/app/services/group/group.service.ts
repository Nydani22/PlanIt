import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Group } from '../../models/group.model';

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/groups'; 

  getGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(this.apiUrl);
  }

  getGroupById(id: string): Observable<Group> {
    return this.http.get<Group>(`${this.apiUrl}/${id}`);
  }

  createGroup(groupData: Partial<Group>): Observable<Group> {
    return this.http.post<Group>(`${this.apiUrl}/create`, groupData);
  }

  updateGroup(id: string, groupData: Partial<Group>): Observable<Group> {
    return this.http.put<Group>(`${this.apiUrl}/${id}`, groupData);
  }

  deleteGroup(id: string): Observable<Group> {
    return this.http.delete<Group>(`${this.apiUrl}/${id}`);
  }

  addMember(groupId: string, newMemberId: string, role: string = 'MEMBER'): Observable<Group> {
    return this.http.post<Group>(`${this.apiUrl}/${groupId}/members`, { newMemberId, role });
  }

  updateMemberRole(groupId: string, memberId: string, role: string): Observable<Group> {
    return this.http.patch<Group>(`${this.apiUrl}/${groupId}/members/${memberId}/role`, { role });
  }

  removeMember(groupId: string, memberId: string): Observable<Group> {
    return this.http.delete<Group>(`${this.apiUrl}/${groupId}/members/${memberId}`);
  }
}