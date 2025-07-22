import {
  sqliteTable,
  text,
  integer,
  numeric,
  real,
} from "drizzle-orm/sqlite-core";
import { InferSelectModel } from "drizzle-orm";
import { invoices } from "../invoice/schema";

export enum OperationType {
  EXTRACTION = "EXTRACTION",
  CLASSIFICATION = "CLASSIFICATION",
  DUPLICATE_CHECK = "DUPLICATE_CHECK",
}

export enum CostUnit {
  USD = "USD",
}

export const tokens = sqliteTable("Tokens", {
  id: text("id").primaryKey().notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  invoiceId: text("invoiceId")
    .notNull(),
  userId: text("userId")
    .notNull(),
  operationType: text("operationType")
    .default(OperationType.EXTRACTION)
    .$type<OperationType>(),
  inputTokens: integer("inputTokens"),
  outputTokens: integer("outputTokens"),
  totalTokens: integer("totalTokens"),
  cost: real("cost"),
  costUnit: text("costUnit").default(CostUnit.USD).$type<CostUnit>(),
  modelUsed: text("modelUsed"),
});

export type Token = InferSelectModel<typeof tokens>;
