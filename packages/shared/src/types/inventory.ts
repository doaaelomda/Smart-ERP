export const PRODUCT_TYPES = ['stock', 'service'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

/** Money fields in minor units. */
export interface Product {
  _id: string;
  type: ProductType;
  sku: string;
  barcode?: string;
  name: string;
  category?: string;
  unit: string;
  salePrice: number;
  /** Weighted average cost, updated by goods receipts. */
  avgCost: number;
  vatApplicable: boolean;
  reorderLevel?: number;
  isActive: boolean;
  /** Quantity across all warehouses (list responses). */
  quantity?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  type: ProductType;
  sku: string;
  barcode?: string;
  name: string;
  category?: string;
  unit?: string;
  salePrice: number;
  /** Opening cost; afterwards maintained by receipts. */
  avgCost?: number;
  vatApplicable?: boolean;
  reorderLevel?: number | null;
  isActive?: boolean;
}

export interface Warehouse {
  _id: string;
  name: string;
  code?: string;
  address?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseInput {
  name: string;
  code?: string;
  address?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface StockLevel {
  _id: string;
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  reorderLevel?: number;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  avgCost: number;
  /** quantity × avgCost (minor units). */
  value: number;
  isLow: boolean;
}

export const STOCK_MOVEMENT_TYPES = ['IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT'] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];
export const STOCK_REF_TYPES = ['invoice', 'invoiceCancel', 'goodsReceipt', 'adjustment', 'transfer'] as const;
export type StockRefType = (typeof STOCK_REF_TYPES)[number];

export interface StockMovement {
  _id: string;
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  type: StockMovementType;
  /** Signed: negative = out. */
  quantity: number;
  unitCost: number;
  refType: StockRefType;
  refId?: string;
  reason?: string;
  createdAt: string;
}

export interface StockAdjustmentInput {
  productId: string;
  warehouseId: string;
  /** Signed change, e.g. -2 for damaged items. */
  quantity: number;
  reason: string;
}

export interface StockTransferInput {
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  reason?: string;
}
