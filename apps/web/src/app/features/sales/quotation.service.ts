import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ApiSuccess, Quotation, QuotationInput } from '@erp/shared';
import { map, type Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/app.constants';
import { type Page, type QueryParams, toHttpParams, toPage } from '../../core/http/list-params';

const ENDPOINT = `${API_BASE_URL}/quotations`;

@Injectable({ providedIn: 'root' })
export class QuotationService {
  private readonly http = inject(HttpClient);

  getQuotations(query: QueryParams): Observable<Page<Quotation>> {
    return this.http.get<ApiSuccess<Quotation[]>>(ENDPOINT, { params: toHttpParams(query) }).pipe(map(toPage));
  }

  getQuotationById(id: string): Observable<Quotation> {
    return this.http.get<ApiSuccess<Quotation>>(`${ENDPOINT}/${id}`).pipe(map((res) => res.data));
  }

  createQuotation(body: QuotationInput): Observable<Quotation> {
    return this.http.post<ApiSuccess<Quotation>>(ENDPOINT, body).pipe(map((res) => res.data));
  }

  updateQuotation(id: string, body: Partial<QuotationInput>): Observable<Quotation> {
    return this.http.patch<ApiSuccess<Quotation>>(`${ENDPOINT}/${id}`, body).pipe(map((res) => res.data));
  }

  deleteQuotation(id: string): Observable<void> {
    return this.http.delete<void>(`${ENDPOINT}/${id}`);
  }

  changeQuotationStatus(id: string, action: 'send' | 'accept' | 'reject'): Observable<Quotation> {
    return this.http.post<ApiSuccess<Quotation>>(`${ENDPOINT}/${id}/${action}`, {}).pipe(map((res) => res.data));
  }

  /** Returns the id of the new draft invoice. */
  convertQuotationToInvoice(id: string): Observable<string> {
    return this.http
      .post<ApiSuccess<{ invoiceId: string }>>(`${ENDPOINT}/${id}/convert`, {})
      .pipe(map((res) => res.data.invoiceId));
  }
}
