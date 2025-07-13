import {sqliteTable, text, integer, numeric} from "drizzle-orm/sqlite-core";
import {InferSelectModel} from "drizzle-orm";
import {invoices} from "../invoice/schema";

export enum OperationType {
    EXTRACTION = 'EXTRACTION',
    VALIDATION = 'VALIDATION',
    DUPLICATE_CHECK = 'DUPLICATE_CHECK'
}

export enum CostUnit {
    USD = 'USD'
}


export const tokens = sqliteTable(
    'Tokens',
    {
        id: text('id').primaryKey().notNull(),
        createdAt: integer('createdAt', {mode: 'timestamp'})
            .notNull()
            .$defaultFn(() => new Date()),
        invoiceId: text('invoiceId').notNull()
            .references(() => invoices.id),
        operationType: text('operationType').notNull()
            .default(OperationType.EXTRACTION)
            .$type<OperationType>(),
        inputTokens: integer('inputTokens'),
        outputTokens: integer('outputTokens'),
        totalTokens: integer('totalTokens'),
        cost: numeric('cost'),
        costUnit: text('costUnit').default(CostUnit.USD).$type<CostUnit>(),
        modelUsed: text('modelUsed'),
        cachedTokens: integer('cachedTokens').default(0),
    }
)

export type Token = InferSelectModel<typeof tokens>