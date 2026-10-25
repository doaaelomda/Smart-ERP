import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { providePrimeNG } from 'primeng/config';
import { DataTable } from './data-table';
import type { DataTableColumn, DataTableQuery } from './data-table.types';

interface Row {
  name: string;
  qty: number | null;
}

@Component({
  imports: [DataTable],
  template: `<app-data-table
    [columns]="columns"
    [data]="data()"
    [total]="2"
    [loading]="loading()"
    [query]="query()"
    (queryChange)="changes.push($event)"
  />`,
})
class Host {
  columns: DataTableColumn<Row>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'qty', header: 'Qty' },
  ];
  data = signal<Row[]>([
    { name: 'Pen', qty: 3 },
    { name: 'Book', qty: null },
  ]);
  loading = signal(false);
  query = signal<DataTableQuery>({ page: 1, limit: 20 });
  changes: DataTableQuery[] = [];
}

describe('DataTable', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideTranslateService(), providePrimeNG({ theme: 'none' })] });
  });

  it('renders rows and a dash for empty values', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[1].textContent).toContain('—');
  });

  it('shows the empty state', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.data.set([]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('common.noData');
  });

  it('emits sort as API sort string and resets page', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.query.set({ page: 3, limit: 20 });
    await fixture.whenStable();
    const header: HTMLElement = fixture.nativeElement.querySelector('th[aria-sort]');
    header.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.changes.at(-1)).toEqual({ page: 1, limit: 20, sort: 'name' });
    fixture.componentInstance.query.set({ page: 1, limit: 20, sort: 'name' });
    await fixture.whenStable();
    header.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.changes.at(-1)).toEqual({ page: 1, limit: 20, sort: '-name' });
  });
});
