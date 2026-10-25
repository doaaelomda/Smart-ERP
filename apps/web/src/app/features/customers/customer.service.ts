import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ApiSuccess, Customer, CustomerInput, PaginationMeta } from '@erp/shared';
import { map, type Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/app.constants';
import { type QueryParams, toHttpParams } from '../../core/http/list-params';

const CUSTOMERS_URL = `${API_BASE_URL}/customers`;

export interface CustomersPage {
  items: Customer[];
  meta: PaginationMeta;
}

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);

  getCustomers(query: QueryParams): Observable<CustomersPage> {
    return this.http
      .get<ApiSuccess<Customer[]>>(CUSTOMERS_URL, { params: toHttpParams(query) })
      .pipe(map((res) => ({ items: res.data, meta: res.meta! })));
  }

  getCustomerById(id: string): Observable<Customer> {
    return this.http.get<ApiSuccess<Customer>>(`${CUSTOMERS_URL}/${id}`).pipe(map((res) => res.data));
  }

  createCustomer(body: CustomerInput): Observable<Customer> {
    return this.http.post<ApiSuccess<Customer>>(CUSTOMERS_URL, body).pipe(map((res) => res.data));
  }

  updateCustomer(id: string, body: Partial<CustomerInput>): Observable<Customer> {
    return this.http.patch<ApiSuccess<Customer>>(`${CUSTOMERS_URL}/${id}`, body).pipe(map((res) => res.data));
  }

  deleteCustomer(id: string): Observable<void> {
    return this.http.delete<void>(`${CUSTOMERS_URL}/${id}`);
  }
}
