/**
 * Demo data: one company with realistic data in every table (12 months of activity).
 *
 *   npm run seed -w @erp/api
 *
 * Re-running removes the previous demo company first (only that tenant's data).
 * Every document goes through the real services, so stock, balances, numbers and
 * statuses follow the same business rules as the app.
 */
import bcrypt from 'bcryptjs';
import mongoose, { Types } from 'mongoose';
import { type DefaultRole, toMinor } from '@erp/shared';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { env } from '../config/env.js';
import { runWithContext } from '../core/context/request-context.js';
import { register } from '../modules/auth/auth.service.js';
import { createCustomer } from '../modules/customers/customer.service.js';
import { InvoiceModel } from '../modules/invoices/invoice.model.js';
import { cancelInvoice, createInvoice, issueInvoice } from '../modules/invoices/invoice.service.js';
import { NotificationModel } from '../modules/notifications/notification.model.js';
import { PaymentModel } from '../modules/payments/payment.model.js';
import { createPayment } from '../modules/payments/payment.service.js';
import { createProduct } from '../modules/products/product.service.js';
import { PurchaseOrderModel } from '../modules/purchase-orders/purchase-order.model.js';
import {
  cancelPurchaseOrder,
  createPurchaseOrder,
  receivePurchaseOrder,
  sendPurchaseOrder,
} from '../modules/purchase-orders/purchase-order.service.js';
import { QuotationModel } from '../modules/quotations/quotation.model.js';
import { changeQuotationStatus, convertQuotation, createQuotation } from '../modules/quotations/quotation.service.js';
import { RoleModel } from '../modules/roles/role.model.js';
import { StockMovementModel } from '../modules/stock/stock-movement.model.js';
import { adjustStock, transferStock } from '../modules/stock/stock.service.js';
import { createSupplier } from '../modules/suppliers/supplier.service.js';
import { TenantModel } from '../modules/tenants/tenant.model.js';
import { UserModel } from '../modules/users/user.model.js';
import { createWarehouse } from '../modules/warehouses/warehouse.service.js';

export const DEMO_PASSWORD = 'Demo12345';
export const DEMO_OWNER_EMAIL = 'owner@demo.smart-erp.dev';
const DEMO_USERS: { role: DefaultRole; name: string; email: string }[] = [
  { role: 'Admin', name: 'محمد عادل', email: 'admin@demo.smart-erp.dev' },
  { role: 'Sales', name: 'سارة محمود', email: 'sales@demo.smart-erp.dev' },
  { role: 'Inventory', name: 'كريم حسن', email: 'inventory@demo.smart-erp.dev' },
  { role: 'Accountant', name: 'منى إبراهيم', email: 'accountant@demo.smart-erp.dev' },
];

// ---------------------------------------------------------------- helpers
/** Deterministic random numbers so every run produces the same data. */
let seedState = 20261025;
function rand(): number {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(list: readonly T[]): T => list[int(0, list.length - 1)]!;
const chance = (p: number) => rand() < p;
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

function log(message: string): void {
  console.log(`  • ${message}`);
}

// ---------------------------------------------------------------- reference data
const CITIES = ['القاهرة', 'الجيزة', 'الإسكندرية', 'المنصورة', 'طنطا', 'الزقازيق', 'أسيوط', 'بورسعيد', 'السويس', 'دمياط', 'المنيا', 'الإسماعيلية'];
const STREETS = ['شارع التحرير', 'شارع الجمهورية', 'شارع 26 يوليو', 'شارع الهرم', 'شارع فيصل', 'شارع النصر', 'طريق الجيش', 'شارع عباس العقاد', 'شارع مكرم عبيد', 'شارع البحر'];
const CUSTOMER_NAMES = [
  'شركة النيل للتجارة', 'مؤسسة الدلتا للتوريدات', 'مكتبة المعرفة', 'شركة الأهرام للمقاولات', 'مدارس المستقبل الخاصة', 'مستشفى الشفاء',
  'شركة القاهرة للأدوات المكتبية', 'مكتب الحسيني للمحاماة', 'شركة الفجر للإلكترونيات', 'مؤسسة الرواد التعليمية', 'شركة البركة للاستيراد',
  'مركز النور الطبي', 'شركة الصفوة للاستشارات', 'جامعة الحياة الخاصة', 'شركة المتحدة للنقل', 'فندق الواحة', 'شركة سما للبرمجيات',
  'مطبعة الإخلاص', 'شركة الأمل للمقاولات', 'مكتب الجوهري للمحاسبة', 'شركة رؤية للتسويق', 'أكاديمية التميز', 'شركة الخليج للتجارة',
  'مؤسسة الياسمين', 'شركة ريادة للأنظمة', 'معامل البرج', 'شركة الحرية للتوزيع', 'مكتبة دار السلام', 'شركة النخبة للأثاث',
  'Cairo Tech Solutions', 'Nile Digital', 'Delta Logistics', 'Pyramids Hotels', 'Alex Trading Co.', 'Sphinx Consulting',
  'Horizon Schools', 'Smart Office Egypt', 'Green Valley Pharma', 'Blue Sea Travel', 'Golden Gate Contracting',
  'شركة اليسر للتجارة', 'مستوصف الرحمة', 'شركة الإتقان للمقاولات', 'نادي الشمس', 'شركة أركان العقارية', 'مكتبة الشروق',
  'شركة الوفاء للتغذية', 'مؤسسة الضياء', 'شركة الريان للتجارة', 'مدارس النخبة', 'شركة الطيبة للأدوية', 'مكتب الصباغ الهندسي',
  'شركة الغد للتكنولوجيا', 'مركز الإبداع للتدريب', 'شركة الأصالة', 'شركة المدائن للتجارة', 'مؤسسة الندى', 'شركة السلام للتوريدات',
];
const SUPPLIER_NAMES = [
  'الشركة المصرية للورق', 'مصنع الدلتا للأدوات المكتبية', 'شركة الحبر الذهبي', 'الشركة العربية للإلكترونيات', 'مصنع الأثاث الحديث',
  'شركة النصر للتوريدات', 'مؤسسة القمة للاستيراد', 'Global Office Supply', 'HP Egypt Distributor', 'Canon Middle East',
  'شركة الشرق للبلاستيك', 'مطابع الأهرام التجارية', 'شركة الرواد للحاسبات', 'مصنع الفرسان للكرتون', 'شركة المتحدة للتغليف',
  'Raya Distribution', 'B.Tech Business', 'شركة الحديثة للطابعات', 'مؤسسة الجزيرة التجارية', 'شركة المستقبل للمعدات',
  'مصنع النيل للأقلام', 'شركة ألفا للأحبار', 'Delta Paper Mills', 'شركة سيناء للتوريدات', 'مؤسسة الأمانة',
];

interface ProductSeed {
  name: string;
  category: string;
  unit: string;
  price: number; // EGP
  cost: number; // EGP
  type?: 'stock' | 'service';
}
const PRODUCTS: ProductSeed[] = [
  { name: 'ورق تصوير A4 80 جم', category: 'ورق', unit: 'رزمة', price: 165, cost: 120 },
  { name: 'ورق تصوير A3', category: 'ورق', unit: 'رزمة', price: 320, cost: 240 },
  { name: 'ورق ملون A4', category: 'ورق', unit: 'رزمة', price: 210, cost: 150 },
  { name: 'كرتونة ورق A4 (5 رزم)', category: 'ورق', unit: 'كرتونة', price: 790, cost: 580 },
  { name: 'ورق فوتو لامع', category: 'ورق', unit: 'علبة', price: 280, cost: 190 },
  { name: 'دفتر سلك A5', category: 'ورق', unit: 'قطعة', price: 45, cost: 28 },
  { name: 'دفتر محاضرات 100 ورقة', category: 'ورق', unit: 'قطعة', price: 35, cost: 22 },
  { name: 'بلوك نوت لاصق', category: 'ورق', unit: 'علبة', price: 60, cost: 38 },
  { name: 'حبر HP 305 أسود', category: 'أحبار', unit: 'قطعة', price: 850, cost: 640 },
  { name: 'حبر HP 305 ألوان', category: 'أحبار', unit: 'قطعة', price: 980, cost: 730 },
  { name: 'تونر HP 85A', category: 'أحبار', unit: 'قطعة', price: 1650, cost: 1250 },
  { name: 'تونر Canon 725', category: 'أحبار', unit: 'قطعة', price: 1450, cost: 1090 },
  { name: 'حبر Epson 664 (4 ألوان)', category: 'أحبار', unit: 'طقم', price: 720, cost: 520 },
  { name: 'تونر Samsung 111S', category: 'أحبار', unit: 'قطعة', price: 1350, cost: 980 },
  { name: 'قلم جاف أزرق (علبة 50)', category: 'أدوات مكتبية', unit: 'علبة', price: 150, cost: 95 },
  { name: 'قلم رصاص HB (12)', category: 'أدوات مكتبية', unit: 'علبة', price: 55, cost: 32 },
  { name: 'قلم هايلايتر (6 ألوان)', category: 'أدوات مكتبية', unit: 'طقم', price: 85, cost: 52 },
  { name: 'دباسة مكتبية كبيرة', category: 'أدوات مكتبية', unit: 'قطعة', price: 120, cost: 75 },
  { name: 'دبوس دباسة 24/6', category: 'أدوات مكتبية', unit: 'علبة', price: 18, cost: 9 },
  { name: 'خرامة ورق', category: 'أدوات مكتبية', unit: 'قطعة', price: 95, cost: 58 },
  { name: 'ملف بلاستيك شفاف', category: 'أدوات مكتبية', unit: 'قطعة', price: 12, cost: 6 },
  { name: 'ملف بوكس 8 سم', category: 'أدوات مكتبية', unit: 'قطعة', price: 65, cost: 40 },
  { name: 'مقص مكتبي', category: 'أدوات مكتبية', unit: 'قطعة', price: 45, cost: 26 },
  { name: 'شريط لاصق شفاف', category: 'أدوات مكتبية', unit: 'قطعة', price: 15, cost: 8 },
  { name: 'آلة حاسبة Casio', category: 'أدوات مكتبية', unit: 'قطعة', price: 420, cost: 300 },
  { name: 'سبورة بيضاء 120×90', category: 'أدوات مكتبية', unit: 'قطعة', price: 1250, cost: 880 },
  { name: 'أقلام سبورة (4 ألوان)', category: 'أدوات مكتبية', unit: 'طقم', price: 70, cost: 42 },
  { name: 'طابعة HP LaserJet M111w', category: 'إلكترونيات', unit: 'قطعة', price: 6800, cost: 5600 },
  { name: 'طابعة Canon PIXMA G3410', category: 'إلكترونيات', unit: 'قطعة', price: 7900, cost: 6500 },
  { name: 'ماوس لاسلكي Logitech M220', category: 'إلكترونيات', unit: 'قطعة', price: 450, cost: 310 },
  { name: 'كيبورد Logitech K120', category: 'إلكترونيات', unit: 'قطعة', price: 390, cost: 270 },
  { name: 'فلاشة 64GB SanDisk', category: 'إلكترونيات', unit: 'قطعة', price: 260, cost: 180 },
  { name: 'هارد خارجي 1TB', category: 'إلكترونيات', unit: 'قطعة', price: 2400, cost: 1900 },
  { name: 'شاشة Dell 24 بوصة', category: 'إلكترونيات', unit: 'قطعة', price: 6200, cost: 5100 },
  { name: 'راوتر TP-Link', category: 'إلكترونيات', unit: 'قطعة', price: 1350, cost: 1020 },
  { name: 'سماعة رأس بميكروفون', category: 'إلكترونيات', unit: 'قطعة', price: 550, cost: 380 },
  { name: 'كابل HDMI 3 متر', category: 'إلكترونيات', unit: 'قطعة', price: 140, cost: 80 },
  { name: 'UPS 1000VA', category: 'إلكترونيات', unit: 'قطعة', price: 3200, cost: 2550 },
  { name: 'مكتب موظف 140 سم', category: 'أثاث', unit: 'قطعة', price: 4800, cost: 3600 },
  { name: 'كرسي مكتب طبي', category: 'أثاث', unit: 'قطعة', price: 3900, cost: 2900 },
  { name: 'دولاب ملفات معدن', category: 'أثاث', unit: 'قطعة', price: 5600, cost: 4300 },
  { name: 'ترابيزة اجتماعات 8 أفراد', category: 'أثاث', unit: 'قطعة', price: 14500, cost: 11200 },
  { name: 'رف كتب خشب', category: 'أثاث', unit: 'قطعة', price: 2100, cost: 1500 },
  { name: 'كرسي انتظار', category: 'أثاث', unit: 'قطعة', price: 1100, cost: 780 },
  { name: 'منظفات مكتبية (طقم)', category: 'مستلزمات', unit: 'طقم', price: 240, cost: 160 },
  { name: 'مناديل ورقية (كرتونة)', category: 'مستلزمات', unit: 'كرتونة', price: 380, cost: 270 },
  { name: 'أكواب ورقية (1000)', category: 'مستلزمات', unit: 'كرتونة', price: 450, cost: 320 },
  { name: 'مياه معدنية (12 زجاجة)', category: 'مستلزمات', unit: 'كرتونة', price: 95, cost: 70 },
  { name: 'صيانة طابعات (زيارة)', category: 'خدمات', unit: 'زيارة', price: 600, cost: 0, type: 'service' },
  { name: 'تركيب شبكات (نقطة)', category: 'خدمات', unit: 'نقطة', price: 350, cost: 0, type: 'service' },
  { name: 'توصيل داخل القاهرة', category: 'خدمات', unit: 'مشوار', price: 75, cost: 0, type: 'service' },
  { name: 'تركيب أثاث مكتبي', category: 'خدمات', unit: 'ساعة', price: 250, cost: 0, type: 'service' },
  { name: 'عقد صيانة شهري', category: 'خدمات', unit: 'شهر', price: 2500, cost: 0, type: 'service' },
];

// ---------------------------------------------------------------- reset
async function removeDemoCompany(): Promise<void> {
  const owner = await UserModel.findOne({ email: DEMO_OWNER_EMAIL }).setOptions({ skipTenant: true }).select('tenantId').lean();
  if (!owner) return;
  const tenantId = owner.tenantId;
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({ tenantId })));
  await TenantModel.deleteOne({ _id: tenantId });
  log('Removed the previous demo company');
}

/** Moves an issued/created document to a date in the past (timestamps off, so createdAt sticks). */
async function backdate(model: mongoose.Model<any>, id: Types.ObjectId | string, date: Date, extra: Record<string, unknown> = {}) {
  // Raw driver update: createdAt is immutable for Mongoose.
  await model.collection.updateOne({ _id: new Types.ObjectId(id) }, { $set: { createdAt: date, updatedAt: date, ...extra } });
}

/**
 * Documents were created "today" and moved back in time, so their numbers would all carry this year.
 * Renumber them by date (INV-2025-0001 …) and move each yearly counter to the last number used.
 */
async function renumberByYear(model: mongoose.Model<any>, tenantId: string, prefix: string, kind: string, dateField: string) {
  const tid = new Types.ObjectId(tenantId);
  const docs = await model.collection
    .find({ tenantId: tid, number: { $type: 'string' } })
    .sort({ [dateField]: 1, _id: 1 })
    .project({ number: 1, [dateField]: 1 })
    .toArray();
  const seqByYear = new Map<number, number>();
  // Temporary numbers first so the unique index never sees two equal numbers.
  await model.collection.updateMany({ tenantId: tid, number: { $type: 'string' } }, [{ $set: { number: { $concat: ['tmp-', '$number'] } } }]);
  for (const doc of docs) {
    const year = (doc[dateField] as Date).getFullYear();
    const seq = (seqByYear.get(year) ?? 0) + 1;
    seqByYear.set(year, seq);
    const number = `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
    await model.collection.updateOne({ _id: doc._id }, { $set: { number } });
  }
  const counters = mongoose.connection.collection('counters');
  await counters.deleteMany({ tenantId: tid, key: new RegExp(`^${kind}:`) });
  for (const [year, seq] of seqByYear) await counters.insertOne({ tenantId: tid, key: `${kind}:${year}`, seq });
}

// ---------------------------------------------------------------- main
async function seed(): Promise<void> {
  console.log(`Seeding demo data into ${env.MONGO_URI.replace(/\/\/[^@]*@/, '//***@')}`);
  await connectDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  await removeDemoCompany();

  // Company, default roles, owner and main warehouse (same path as the register page).
  const { session } = await register(
    { companyName: 'شركة النيل للأدوات المكتبية', name: 'دعاء العمدة', email: DEMO_OWNER_EMAIL, password: DEMO_PASSWORD, language: 'ar' },
    { userAgent: 'seed' },
  );
  const tenantId = session.user.tenant.id;
  const ownerId = session.user.id;
  await TenantModel.updateOne({ _id: tenantId }, { $set: { vatNumber: '312-456-789' } });
  log('Company + owner');

  // One user per default role.
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const roles = await RoleModel.find({ tenantId }).setOptions({ skipTenant: true }).lean();
  for (const u of DEMO_USERS) {
    const role = roles.find((r) => r.name === u.role)!;
    await UserModel.create({ tenantId, name: u.name, email: u.email, passwordHash, roleId: role._id, language: 'ar' });
  }
  log(`${DEMO_USERS.length} users (Admin, Sales, Inventory, Accountant)`);

  await runWithContext({ tenantId, userId: ownerId }, async () => {
    // Warehouses
    const main = (await (await import('../modules/warehouses/warehouse.model.js')).WarehouseModel.findOne({ isDefault: true }).lean())!;
    const alex = await createWarehouse({ name: 'مستودع الإسكندرية', code: 'ALX', address: 'المنطقة الصناعية، برج العرب' });
    const branch = await createWarehouse({ name: 'فرع مدينة نصر', code: 'NSR', address: 'شارع مكرم عبيد، مدينة نصر' });
    const warehouses = [main._id.toString(), alex._id.toString(), branch._id.toString()];
    log('3 warehouses');

    // Customers
    const customers: { id: string; name: string; active: boolean }[] = [];
    for (const [i, name] of CUSTOMER_NAMES.entries()) {
      const latin = /^[A-Za-z]/.test(name);
      const c = await createCustomer({
        name,
        email: `contact${i + 1}@${latin ? name.toLowerCase().replace(/[^a-z]+/g, '') : 'client' + (i + 1)}.com`,
        phone: `01${pick(['0', '1', '2', '5'])}${String(int(10000000, 99999999))}`,
        vatNumber: chance(0.6) ? `${int(100, 999)}-${int(100, 999)}-${int(100, 999)}` : undefined,
        address: `${int(1, 120)} ${pick(STREETS)}، ${pick(CITIES)}`,
        creditLimit: chance(0.7) ? toMinor(pick([20000, 50000, 75000, 100000, 150000, 250000])) : 0,
        notes: chance(0.2) ? 'عميل مميز — خصم خاص على الكميات' : undefined,
        isActive: i % 15 !== 14,
      });
      customers.push({ id: c._id.toString(), name, active: c.isActive });
    }
    const activeCustomers = customers.filter((c) => c.active);
    log(`${customers.length} customers`);

    // Suppliers
    const suppliers: string[] = [];
    for (const [i, name] of SUPPLIER_NAMES.entries()) {
      const s = await createSupplier({
        name,
        email: `sales${i + 1}@supplier${i + 1}.com`,
        phone: `02${String(int(20000000, 39999999))}`,
        vatNumber: `${int(100, 999)}-${int(100, 999)}-${int(100, 999)}`,
        address: `${pick(STREETS)}، ${pick(CITIES)}`,
        notes: undefined,
      });
      suppliers.push(s._id.toString());
    }
    log(`${suppliers.length} suppliers`);

    // Products
    const products: { id: string; seed: ProductSeed }[] = [];
    for (const [i, p] of PRODUCTS.entries()) {
      const type = p.type ?? 'stock';
      const created = await createProduct({
        type,
        sku: `${p.category === 'خدمات' ? 'SRV' : 'PRD'}-${String(i + 1).padStart(3, '0')}`,
        barcode: type === 'stock' ? `622${String(int(1000000000, 9999999999))}` : undefined,
        name: p.name,
        category: p.category,
        unit: p.unit,
        salePrice: toMinor(p.price),
        avgCost: toMinor(p.cost),
        vatApplicable: p.category !== 'خدمات' || chance(0.5),
        reorderLevel: type === 'stock' ? pick([5, 10, 15, 20, 30]) : null,
      });
      products.push({ id: created._id.toString(), seed: p });
    }
    const stockProducts = products.filter((p) => (p.seed.type ?? 'stock') === 'stock');
    log(`${products.length} products (${stockProducts.length} stock, ${products.length - stockProducts.length} services)`);

    // Opening stock (adjustments) in the main warehouse.
    for (const p of stockProducts) {
      await adjustStock({ productId: p.id, warehouseId: warehouses[0]!, quantity: int(30, 120), reason: 'رصيد افتتاحي' });
    }
    await StockMovementModel.updateMany({ refType: 'adjustment' }, { $set: { createdAt: daysAgo(365) } }, { timestamps: false });
    log('Opening stock');

    // Purchase orders over the year (most received → stock + average cost + supplier balance).
    let poCount = 0;
    for (let month = 11; month >= 0; month--) {
      for (let k = 0; k < 4; k++) {
        const date = daysAgo(month * 30 + int(1, 27));
        const lines = Array.from({ length: int(2, 5) }, () => {
          const p = pick(stockProducts);
          return { productId: p.id, description: '', quantity: int(20, 80), unitPrice: toMinor(p.seed.cost * (0.95 + rand() * 0.1)) };
        });
        const unique = [...new Map(lines.map((l) => [l.productId, l])).values()];
        const po = await createPurchaseOrder({
          supplierId: pick(suppliers),
          warehouseId: chance(0.75) ? warehouses[0]! : pick(warehouses),
          orderDate: date,
          expectedDate: new Date(date.getTime() + int(3, 14) * DAY),
          lines: unique,
          notes: chance(0.2) ? 'يرجى التوريد صباحاً' : undefined,
        });
        poCount++;
        const roll = rand();
        if (month === 0 && roll < 0.35) {
          // recent drafts / sent orders still open
          if (roll < 0.15) await sendPurchaseOrder(po._id.toString());
        } else if (roll < 0.05) {
          await cancelPurchaseOrder(po._id.toString());
        } else {
          await sendPurchaseOrder(po._id.toString());
          const partial = month <= 1 && chance(0.4);
          await receivePurchaseOrder(po._id.toString(), {
            lines: unique.map((l, index) => ({ index, quantity: partial ? Math.ceil(l.quantity / 2) : l.quantity })),
          });
        }
        await backdate(PurchaseOrderModel, po._id, date);
        await StockMovementModel.updateMany({ refId: po._id }, { $set: { createdAt: new Date(date.getTime() + int(2, 10) * DAY) } }, { timestamps: false });
      }
    }
    log(`${poCount} purchase orders`);

    // Transfers between warehouses.
    for (let i = 0; i < 12; i++) {
      const p = pick(stockProducts);
      await transferStock({ productId: p.id, fromWarehouseId: warehouses[0]!, toWarehouseId: pick(warehouses.slice(1)), quantity: int(3, 10), reason: 'تزويد الفرع' }).catch(() => undefined);
    }
    log('Stock transfers');

    // Sales invoices across 12 months (issued in date order so numbers follow time).
    const plan = Array.from({ length: 260 }, () => {
      const age = Math.floor(Math.pow(rand(), 0.8) * 360);
      return { age, date: daysAgo(age) };
    }).sort((a, b) => b.age - a.age);

    let issued = 0;
    let paid = 0;
    let drafts = 0;
    let cancelled = 0;
    for (const item of plan) {
      const customer = pick(activeCustomers);
      const lineCount = int(1, 4);
      const lines = Array.from({ length: lineCount }, () => {
        const p = pick(products);
        const qty = p.seed.type === 'service' ? int(1, 3) : int(1, p.seed.price > 3000 ? 3 : 15);
        const gross = qty * p.seed.price;
        return {
          productId: p.id,
          description: '',
          quantity: qty,
          unitPrice: toMinor(p.seed.price),
          discount: chance(0.2) ? toMinor(Math.round(gross * pick([0.05, 0.1]))) : 0,
        };
      });
      const unique = [...new Map(lines.map((l) => [l.productId, l])).values()];
      if (chance(0.15)) unique.push({ productId: undefined as unknown as string, description: 'مصاريف توصيل', quantity: 1, unitPrice: toMinor(75), discount: 0 });

      const dueDate = new Date(item.date.getTime() + pick([7, 14, 30, 45]) * DAY);
      const invoice = await createInvoice({
        customerId: customer.id,
        warehouseId: chance(0.85) ? warehouses[0] : pick(warehouses),
        dueDate,
        lines: unique.map((l) => (l.productId ? l : { description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, discount: 0, vatApplicable: false })),
        notes: chance(0.1) ? 'التسليم في مقر العميل' : undefined,
      });
      const id = invoice._id.toString();

      if (item.age < 10 && chance(0.4)) {
        drafts++;
        await backdate(InvoiceModel, id, item.date);
        continue;
      }
      try {
        await issueInvoice(id);
      } catch {
        drafts++; // not enough stock in that warehouse: stays a draft
        await backdate(InvoiceModel, id, item.date);
        continue;
      }
      issued++;
      await backdate(InvoiceModel, id, item.date, { issueDate: item.date });
      await StockMovementModel.updateMany({ refId: invoice._id }, { $set: { createdAt: item.date } }, { timestamps: false });

      const total = (await InvoiceModel.findById(id).select('total').lean())!.total;
      const overdueAllowed = dueDate.getTime() < Date.now();
      const roll = rand();
      if (roll < 0.04) {
        await cancelInvoice(id, { reason: pick(['طلب العميل إلغاء الطلب', 'خطأ في الأصناف', 'تم استبدالها بفاتورة أخرى']) });
        cancelled++;
      } else if (roll < (overdueAllowed ? 0.78 : 0.45)) {
        const p = await createPayment({ invoiceId: id, amount: total, method: pick(['cash', 'bank_transfer', 'bank_transfer', 'card'] as const), date: new Date(item.date.getTime() + int(0, 20) * DAY), reference: chance(0.5) ? `TRX-${int(100000, 999999)}` : undefined, notes: undefined });
        await backdate(PaymentModel, p._id, new Date(item.date.getTime() + int(0, 20) * DAY));
        paid++;
      } else if (roll < 0.9) {
        const part = Math.round(total * pick([0.3, 0.5, 0.6]));
        const p = await createPayment({ invoiceId: id, amount: part, method: pick(['cash', 'bank_transfer'] as const), date: new Date(item.date.getTime() + int(0, 10) * DAY), reference: undefined, notes: undefined });
        await backdate(PaymentModel, p._id, new Date(item.date.getTime() + int(0, 10) * DAY));
      }
    }
    log(`${plan.length} invoices (${issued} issued, ${paid} fully paid, ${cancelled} cancelled, ${drafts} drafts)`);

    // Quotations: every status.
    let quotes = 0;
    for (let i = 0; i < 70; i++) {
      const age = int(0, 180);
      const created = daysAgo(age);
      const lines = Array.from({ length: int(1, 4) }, () => {
        const p = pick(products);
        return { productId: p.id, description: '', quantity: int(1, 20), unitPrice: toMinor(p.seed.price) };
      });
      const q = await createQuotation({
        customerId: pick(activeCustomers).id,
        validUntil: new Date(created.getTime() + pick([7, 15, 30]) * DAY),
        lines: [...new Map(lines.map((l) => [l.productId, l])).values()],
        notes: undefined,
      });
      const id = q._id.toString();
      const roll = rand();
      if (roll > 0.15) await changeQuotationStatus(id, 'send');
      if (roll > 0.4 && roll < 0.75) {
        // Only quotations still valid can be accepted (same rule as the app).
        const accepted = await changeQuotationStatus(id, 'accept').then(() => true, () => false);
        if (accepted && chance(0.5)) await convertQuotation(id, { dueDate: daysAgo(-14) });
      } else if (roll >= 0.75 && roll < 0.88) {
        await changeQuotationStatus(id, 'reject');
      }
      await backdate(QuotationModel, id, created);
      quotes++;
    }
    log(`${quotes} quotations`);
  });

  // Numbers that match each document's year.
  await renumberByYear(InvoiceModel, tenantId, 'INV', 'invoice', 'issueDate');
  const numbered = await InvoiceModel.collection.find({ tenantId: new Types.ObjectId(tenantId), number: { $type: 'string' } }).project({ number: 1 }).toArray();
  for (const inv of numbered) await PaymentModel.collection.updateMany({ invoiceId: inv._id }, { $set: { invoiceNumber: inv['number'] } });
  await renumberByYear(PaymentModel, tenantId, 'PAY', 'payment', 'date');
  await renumberByYear(QuotationModel, tenantId, 'QUO', 'quotation', 'createdAt');
  await renumberByYear(PurchaseOrderModel, tenantId, 'PO', 'purchaseOrder', 'orderDate');
  log('Numbers follow document dates');

  // Demo notifications are produced by the low-stock check during seeding; add a welcome per user.
  const users = await UserModel.find({ tenantId }).setOptions({ skipTenant: true }).select('_id').lean();
  await NotificationModel.insertMany(
    users.map((u) => ({ tenantId, userId: u._id, type: 'system', messageKey: 'notifications.welcome', link: '/app/dashboard' })),
  );

  console.log('\nDone ✔  Demo logins (password for all: %s)', DEMO_PASSWORD);
  console.table([{ role: 'Owner', email: DEMO_OWNER_EMAIL }, ...DEMO_USERS.map((u) => ({ role: u.role, email: u.email }))]);
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
