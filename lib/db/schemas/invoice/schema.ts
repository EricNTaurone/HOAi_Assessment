import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { InferSelectModel } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import { chat } from "../../schema";

export const invoices = sqliteTable("Invoices", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => randomUUID()),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  userId: text("userId").notNull(),
  chatId: text("chatId")
    .notNull()
    .references(() => chat.id),
  customerName: text("customerName").notNull(),
  vendorName: text("vendorName").notNull(),
  invoiceNumber: text("invoiceNumber").notNull(),
  invoiceDate: text("invoiceDate").notNull(),
  invoiceDueDate: text("invoiceDueDate").notNull(),
  invoiceAmount: text("invoiceAmount").notNull(),
});

export const lineItems = sqliteTable("LineItems", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => randomUUID()),
  invoiceId: text("invoiceId")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  itemName: text("itemName").notNull(),
  itemQuantity: text("itemQuantity").notNull(),
  itemPrice: text("itemPrice").notNull(),
  itemTotal: text("itemTotal").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Define relationships
export const invoicesRelations = relations(invoices, ({ many }) => ({
  lineItems: many(lineItems),
}));

export const lineItemsRelations = relations(lineItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [lineItems.invoiceId],
    references: [invoices.id],
  }),
}));

export type Invoice = InferSelectModel<typeof invoices>;
export type LineItemRecord = InferSelectModel<typeof lineItems>;
