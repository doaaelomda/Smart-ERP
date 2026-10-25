import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ApiSuccess, PurchaseOrder, PurchaseOrderInput, ReceivePurchaseOrderInput } from '@erp/shared';
import { map, type Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/app.constants';
import { type Page, type QueryParams, toHttpParams, toPage } from '../../core/http/list-params';

const ENDPOINT = `${API_BASE_URL}/purchase-orders`;

@Injectable({ providedIn: 'root' })
export class PurchaseOrderService {
  private readonly http = inject(HttpClient);

  getPurchaseOrders(query: QueryParams): Observable<Page<PurchaseOrder>> {
    return this.http.get<ApiSuccess<PurchaseOrder[]>>(ENDPOINT, { params: toHttpParams(query) }).pipe(map(toPage));
  }

  getPurchaseOrderById(id: string): Observable<PurchaseOrder> {
    return this.http.get<ApiSuccess<PurchaseOrder>>(`${ENDPOINT}/${id}`).pipe(map((res) => res.data));
  }

  createPurchaseOrder(body: PurchaseOrderInput): Observable<PurchaseOrder> {
    return this.http.post<ApiSuccess<PurchaseOrder>>(ENDPOINT, body).pipe(map((res) => res.data));
  }

  updatePurchaseOrder(id: string, body: Partial<PurchaseOrderInput>): Observable<PurchaseOrder> {
    return this.http.patch<ApiSuccess<PurchaseOrder>>(`${ENDPOINT}/${id}`, body).pipe(map((res) => res.data));
  }

  deletePurchaseOrder(id: string): Observable<void> {
    return this.http.delete<void>(`${ENDPOINT}/${id}`);
  }

  sendPurchaseOrder(id: string): Observable<PurchaseOrder> {
    return this.http.post<ApiSuccess<PurchaseOrder>>(`${ENDPOINT}/${id}/send`, {}).pipe(map((res) => res.data));
  }

  receivePurchaseOrder(id: string, body: ReceivePurchaseOrderInput): Observable<PurchaseOrder> {
    return this.http.post<ApiSuccess<PurchaseOrder>>(`${ENDPOINT}/${id}/receive`, body).pipe(map((res) => res.data));
  }

  cancelPurchaseOrder(id: string): Observable<PurchaseOrder> {
    return this.http.post<ApiSuccess<PurchaseOrder>>(`${ENDPOINT}/${id}/cancel`, {}).pipe(map((res) => res.data));
  }
}
