import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ApiSuccess, Supplier, SupplierInput } from '@erp/shared';
import { map, type Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/app.constants';
import { type Page, type QueryParams, toHttpParams, toPage } from '../../core/http/list-params';

const ENDPOINT = `${API_BASE_URL}/suppliers`;

@Injectable({ providedIn: 'root' })
export class SupplierService {
  private readonly http = inject(HttpClient);

  getSuppliers(query: QueryParams): Observable<Page<Supplier>> {
    return this.http.get<ApiSuccess<Supplier[]>>(ENDPOINT, { params: toHttpParams(query) }).pipe(map(toPage));
  }

  getSupplierById(id: string): Observable<Supplier> {
    return this.http.get<ApiSuccess<Supplier>>(`${ENDPOINT}/${id}`).pipe(map((res) => res.data));
  }

  createSupplier(body: SupplierInput): Observable<Supplier> {
    return this.http.post<ApiSuccess<Supplier>>(ENDPOINT, body).pipe(map((res) => res.data));
  }

  updateSupplier(id: string, body: Partial<SupplierInput>): Observable<Supplier> {
    return this.http.patch<ApiSuccess<Supplier>>(`${ENDPOINT}/${id}`, body).pipe(map((res) => res.data));
  }

  deleteSupplier(id: string): Observable<void> {
    return this.http.delete<void>(`${ENDPOINT}/${id}`);
  }
}
