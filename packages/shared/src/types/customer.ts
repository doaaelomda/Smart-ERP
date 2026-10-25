/** Customer as returned by the API. Money fields are integers in minor units. */
export interface Customer {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  vatNumber?: string;
  address?: string;
  /** Minor units; 0 = no limit. */
  creditLimit: number;
  /** Outstanding receivable in minor units (maintained by invoices/payments). */
  balance: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Create / update body. `creditLimit` is in minor units. */
export interface CustomerInput {
  name: string;
  email?: string;
  phone?: string;
  vatNumber?: string;
  address?: string;
  creditLimit?: number;
  notes?: string;
  isActive?: boolean;
}
