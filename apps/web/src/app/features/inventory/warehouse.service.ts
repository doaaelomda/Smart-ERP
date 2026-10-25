import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ApiSuccess, Warehouse, WarehouseInput } from '@erp/shared';
import { map, type Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/app.constants';
import { type Page, type QueryParams, toHttpParams, toPage } from '../../core/http/list-params';

const ENDPOINT = `${API_BASE_URL}/warehouses`;

@Injectable({ providedIn: 'root' })
export class WarehouseService {
  private readonly http = inject(HttpClient);

  getWarehouses(query: QueryParams): Observable<Page<Warehouse>> {
    return this.http.get<ApiSuccess<Warehouse[]>>(ENDPOINT, { params: toHttpParams(query) }).pipe(map(toPage));
  }

  getWarehouseById(id: string): Observable<Warehouse> {
    return this.http.get<ApiSuccess<Warehouse>>(`${ENDPOINT}/${id}`).pipe(map((res) => res.data));
  }

  createWarehouse(body: WarehouseInput): Observable<Warehouse> {
    return this.http.post<ApiSuccess<Warehouse>>(ENDPOINT, body).pipe(map((res) => res.data));
  }

  updateWarehouse(id: string, body: Partial<WarehouseInput>): Observable<Warehouse> {
    return this.http.patch<ApiSuccess<Warehouse>>(`${ENDPOINT}/${id}`, body).pipe(map((res) => res.data));
  }

  deleteWarehouse(id: string): Observable<void> {
    return this.http.delete<void>(`${ENDPOINT}/${id}`);
  }
}
