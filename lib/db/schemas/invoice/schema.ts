import {integer, numeric, sqliteTable, text, real} from "drizzle-orm/sqlite-core";
import {InferSelectModel} from "drizzle-orm";
import {LineItem} from "@/lib/types/invoice.dto";
import {randomUUID} from "node:crypto";

export const invoices = sqliteTable(
    'Invoices',
    {
        id: text('id').primaryKey().notNull().$defaultFn(() => randomUUID()),
        createdAt: integer('createdAt', {mode: 'timestamp'})
            .notNull()
            .$defaultFn(() => new Date()),
        userId: text('userId').notNull(),
        customerName: text('customerName').notNull(),
        vendorName: text('vendorName').notNull(),
        invoiceNumber: text('invoiceNumber').notNull(),
        invoiceDate: text('invoiceDate').notNull(),
        invoiceDueDate: text('invoiceDueDate').notNull(),
        invoiceAmount: real('invoiceAmount').notNull(),
        lineItems: text('lineItems').$type<LineItem[]>()
    }
)

export type Invoice = InferSelectModel<typeof invoices>