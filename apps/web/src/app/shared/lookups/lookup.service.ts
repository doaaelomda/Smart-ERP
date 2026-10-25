import { inject, Injectable } from '@angular/core';
import type { Customer, Product, ProductType, Supplier, Warehouse } from '@erp/shared';
import { map, type Observable } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { CustomerService } from '../../features/customers/customer.service';
import { ProductService } from '../../features/inventory/product.service';
import { WarehouseService } from '../../features/inventory/warehouse.service';
import { SupplierService } from '../../features/purchasing/supplier.service';
import type { AutocompleteOption } from '../components/remote-autocomplete/remote-autocomplete';

const LIMIT = 20;

/** Search functions for pickers (customers, suppliers, products, warehouses). */
@Injectable({ providedIn: 'root' })
export class LookupService {
  private readonly customers = inject(CustomerService);
  private readonly suppliers = inject(SupplierService);
  private readonly products = inject(ProductService);
  private readonly warehouses = inject(WarehouseService);
  private readonly language = inject(LanguageService);

  readonly searchCustomers = (term: string): Observable<AutocompleteOption<Customer>[]> =>
    this.customers
      .getCustomers({ search: term, limit: LIMIT, sort: 'name', isActive: true })
      .pipe(map(({ items }) => items.map((c) => ({ id: c._id, label: c.name, sublabel: c.phone ?? c.email, data: c }))));

  readonly searchSuppliers = (term: string): Observable<AutocompleteOption<Supplier>[]> =>
    this.suppliers
      .getSuppliers({ search: term, limit: LIMIT, sort: 'name', isActive: true })
      .pipe(map(({ items }) => items.map((s) => ({ id: s._id, label: s.name, sublabel: s.phone ?? s.email, data: s }))));

  /** `type` limits to stock products (purchase orders, stock screens). */
  searchProducts(type?: ProductType) {
    return (term: string): Observable<AutocompleteOption<Product>[]> =>
      this.products.getProducts({ search: term, limit: LIMIT, sort: 'name', isActive: true, type }).pipe(
        map(({ items }) =>
          items.map((p) => ({
            id: p._id,
            label: p.name,
            sublabel: p.type === 'stock' ? `${p.sku} · ${this.formatQty(p.quantity ?? 0)} ${p.unit}` : p.sku,
            data: p,
          })),
        ),
      );
  }

  /** Active warehouses, default first. */
  getActiveWarehouses(): Observable<Warehouse[]> {
    return this.warehouses
      .getWarehouses({ isActive: true, limit: 100, sort: 'name' })
      .pipe(map(({ items }) => [...items].sort((a, b) => Number(b.isDefault) - Number(a.isDefault))));
  }

  private formatQty(qty: number): string {
    return new Intl.NumberFormat(this.language.locale(), { maximumFractionDigits: 3 }).format(qty);
  }
}
