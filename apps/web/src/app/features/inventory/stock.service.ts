import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { ApiSuccess, StockAdjustmentInput, StockLevel, StockMovement, StockTransferInput } from '@erp/shared';
import { map, type Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/app.constants';
import { type Page, type QueryParams, toHttpParams, toPage } from '../../core/http/list-params';

const ENDPOINT = `${API_BASE_URL}/stock`;

@Injectable({ providedIn: 'root' })
export class StockService {
  private readonly http = inject(HttpClient);

  getStockLevels(query: QueryParams): Observable<Page<StockLevel>> {
    return this.http.get<ApiSuccess<StockLevel[]>>(`${ENDPOINT}/levels`, { params: toHttpParams(query) }).pipe(map(toPage));
  }

  getStockMovements(query: QueryParams): Observable<Page<StockMovement>> {
    return this.http.get<ApiSuccess<StockMovement[]>>(`${ENDPOINT}/movements`, { params: toHttpParams(query) }).pipe(map(toPage));
  }

  createStockAdjustment(body: StockAdjustmentInput): Observable<void> {
    return this.http.post<void>(`${ENDPOINT}/adjustments`, body);
  }

  createStockTransfer(body: StockTransferInput): Observable<void> {
    return this.http.post<void>(`${ENDPOINT}/transfers`, body);
  }
}
