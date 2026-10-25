import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ApiSuccess, Product, ProductInput } from '@erp/shared';
import { map, type Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/app.constants';
import { type Page, type QueryParams, toHttpParams, toPage } from '../../core/http/list-params';

const ENDPOINT = `${API_BASE_URL}/products`;

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);

  getProducts(query: QueryParams): Observable<Page<Product>> {
    return this.http.get<ApiSuccess<Product[]>>(ENDPOINT, { params: toHttpParams(query) }).pipe(map(toPage));
  }

  getProductById(id: string): Observable<Product> {
    return this.http.get<ApiSuccess<Product>>(`${ENDPOINT}/${id}`).pipe(map((res) => res.data));
  }

  createProduct(body: ProductInput): Observable<Product> {
    return this.http.post<ApiSuccess<Product>>(ENDPOINT, body).pipe(map((res) => res.data));
  }

  updateProduct(id: string, body: Partial<ProductInput>): Observable<Product> {
    return this.http.patch<ApiSuccess<Product>>(`${ENDPOINT}/${id}`, body).pipe(map((res) => res.data));
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${ENDPOINT}/${id}`);
  }
}
