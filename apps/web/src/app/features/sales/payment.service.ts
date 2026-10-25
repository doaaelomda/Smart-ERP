import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ApiSuccess, Payment, PaymentInput } from '@erp/shared';
import { map, type Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/app.constants';
import { type Page, type QueryParams, toHttpParams, toPage } from '../../core/http/list-params';

const ENDPOINT = `${API_BASE_URL}/payments`;

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);

  getPayments(query: QueryParams): Observable<Page<Payment>> {
    return this.http.get<ApiSuccess<Payment[]>>(ENDPOINT, { params: toHttpParams(query) }).pipe(map(toPage));
  }

  createPayment(body: PaymentInput): Observable<Payment> {
    return this.http.post<ApiSuccess<Payment>>(ENDPOINT, body).pipe(map((res) => res.data));
  }
}
