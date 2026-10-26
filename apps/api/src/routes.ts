import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes.js';
import { customerRouter } from './modules/customers/customer.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { invoiceRouter } from './modules/invoices/invoice.routes.js';
import { notificationRouter } from './modules/notifications/notification.routes.js';
import { paymentRouter } from './modules/payments/payment.routes.js';
import { productRouter } from './modules/products/product.routes.js';
import { purchaseOrderRouter } from './modules/purchase-orders/purchase-order.routes.js';
import { quotationRouter } from './modules/quotations/quotation.routes.js';
import { stockRouter } from './modules/stock/stock.routes.js';
import { supplierRouter } from './modules/suppliers/supplier.routes.js';
import { userRouter } from './modules/users/user.routes.js';
import { warehouseRouter } from './modules/warehouses/warehouse.routes.js';

/** All v1 feature routers are mounted here. */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/users', userRouter);

// Sales
apiRouter.use('/customers', customerRouter);
apiRouter.use('/quotations', quotationRouter);
apiRouter.use('/invoices', invoiceRouter);
apiRouter.use('/payments', paymentRouter);

// Inventory
apiRouter.use('/products', productRouter);
apiRouter.use('/warehouses', warehouseRouter);
apiRouter.use('/stock', stockRouter);

// Purchasing
apiRouter.use('/suppliers', supplierRouter);
apiRouter.use('/purchase-orders', purchaseOrderRouter);
