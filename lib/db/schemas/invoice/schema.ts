import {integer, numeric, sqliteTable, text} from "drizzle-orm/sqlite-core";
import {InferSelectModel} from "drizzle-orm";

export const invoices = sqliteTable(
    'Invoices',
    {
        id: text('id').primaryKey().notNull(),
        createdAt: integer('createdAt', {mode: 'timestamp'})
            .notNull()
            .$defaultFn(() => new Date()),
        userId: text('userId').notNull(),
        customerName: text('customerName').notNull(),
        vendorName: text('vendorName').notNull(),
        invoiceNumber: text('invoiceNumber').notNull(),
        invoiceDate: text('invoiceDate').notNull(),
        invoiceDueDate: text('invoiceDueDate').notNull(),
        invoiceAmount: numeric('invoiceAmount').notNull(),
        lineItems: text('lineItems')
    }
)

export type Invoice = InferSelectModel<typeof invoices>