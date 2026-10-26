import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ApiSuccess, CreateUserInput, ManagedUser, RoleOption, UpdateUserInput } from '@erp/shared';
import { map, type Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/app.constants';
import { type Page, type QueryParams, toHttpParams, toPage } from '../../core/http/list-params';

const ENDPOINT = `${API_BASE_URL}/users`;

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  getUsers(query: QueryParams): Observable<Page<ManagedUser>> {
    return this.http.get<ApiSuccess<ManagedUser[]>>(ENDPOINT, { params: toHttpParams(query) }).pipe(map(toPage));
  }

  getRoles(): Observable<RoleOption[]> {
    return this.http.get<ApiSuccess<RoleOption[]>>(`${ENDPOINT}/roles`).pipe(map((res) => res.data));
  }

  createUser(body: CreateUserInput): Observable<ManagedUser> {
    return this.http.post<ApiSuccess<ManagedUser>>(ENDPOINT, body).pipe(map((res) => res.data));
  }

  updateUser(id: string, body: UpdateUserInput): Observable<ManagedUser> {
    return this.http.patch<ApiSuccess<ManagedUser>>(`${ENDPOINT}/${id}`, body).pipe(map((res) => res.data));
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${ENDPOINT}/${id}`);
  }
}
