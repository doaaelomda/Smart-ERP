import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ApiSuccess, Invoice, InvoiceInput } from '@erp/shared';
import { map, type Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/app.constants';
import { type Page, type QueryParams, toHttpParams, toPage } from '../../core/http/list-params';

const ENDPOINT = `${API_BASE_URL}/invoices`;

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly http = inject(HttpClient);

  getInvoices(query: QueryParams): Observable<Page<Invoice>> {
    return this.http.get<ApiSuccess<Invoice[]>>(ENDPOINT, { params: toHttpParams(query) }).pipe(map(toPage));
  }

  getInvoiceById(id: string): Observable<Invoice> {
    return this.http.get<ApiSuccess<Invoice>>(`${ENDPOINT}/${id}`).pipe(map((res) => res.data));
  }

  createInvoice(body: InvoiceInput): Observable<Invoice> {
    return this.http.post<ApiSuccess<Invoice>>(ENDPOINT, body).pipe(map((res) => res.data));
  }

  updateInvoice(id: string, body: Partial<InvoiceInput>): Observable<Invoice> {
    return this.http.patch<ApiSuccess<Invoice>>(`${ENDPOINT}/${id}`, body).pipe(map((res) => res.data));
  }

  deleteInvoice(id: string): Observable<void> {
    return this.http.delete<void>(`${ENDPOINT}/${id}`);
  }

  issueInvoice(id: string): Observable<Invoice> {
    return this.http.post<ApiSuccess<Invoice>>(`${ENDPOINT}/${id}/issue`, {}).pipe(map((res) => res.data));
  }

  cancelInvoice(id: string, reason: string): Observable<Invoice> {
    return this.http.post<ApiSuccess<Invoice>>(`${ENDPOINT}/${id}/cancel`, { reason }).pipe(map((res) => res.data));
  }
}
