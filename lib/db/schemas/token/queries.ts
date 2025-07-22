import {
  CostUnit,
  OperationType,
  Token,
  tokens,
} from "@/lib/db/schemas/token/schema";
import { eq, desc, gte, and } from "drizzle-orm";
import { db } from "@/lib/db/queries";
import { TokenDto } from "@/lib/types/token.dto";
import { ModelPricer } from "@/lib/cost/model-price";
import { SubMonthsOptions } from "date-fns";
import { invoices } from "../invoice/schema";

export async function getTokensByInvoiceId(
  invoiceId: string
): Promise<Token[]> {
  try {
    return await db
      .select()
      .from(tokens)
      .where(eq(tokens.invoiceId, invoiceId))
      .orderBy(tokens.createdAt);
  } catch (error) {
    console.error("Failed to get tokens by invoice ID from database", error);
    throw error;
  }
}

export async function getTokensByUserId(userId: string): Promise<Token[]> {
  try {
    return await db
      .select()
      .from(tokens)
      .where(eq(tokens.userId, userId))
      .orderBy(tokens.createdAt);
  } catch (error) {
    console.error("Failed to get tokens by user ID from database", error);
    throw error;
  }
}

// Upsert token
export async function upsertToken(token: TokenDto) {
  try {
    return await db
      .insert(tokens)
      .values({
        ...token,
        operationType: token.operationType || OperationType.EXTRACTION,
        costUnit: token.costUnit || CostUnit.USD,
        cost: ModelPricer.calculateCost(
          token.modelUsed || "",
          token.inputTokens || 0,
          token.outputTokens || 0
        ),
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: tokens.id,
        set: {
          invoiceId: token.invoiceId,
          operationType: token.operationType || OperationType.EXTRACTION,
          inputTokens: token.inputTokens,
          outputTokens: token.outputTokens,
          totalTokens: token.totalTokens,
          cost:
            token.cost ||
            ModelPricer.calculateCost(
              token.modelUsed || "",
              token.inputTokens || 0,
              token.outputTokens || 0
            ),
          costUnit: token.costUnit || CostUnit.USD,
          modelUsed: token.modelUsed,
        },
      });
  } catch (error) {
    console.error("Failed to upsert token in database", error);
    throw error;
  }
}

export async function leftJoinQuerytokensAndInvoices(userId: string, timeAgo: Date) {
  return db
      .select({
        id: tokens.id,
        createdAt: tokens.createdAt,
        invoiceId: tokens.invoiceId,
        operationType: tokens.operationType,
        inputTokens: tokens.inputTokens,
        outputTokens: tokens.outputTokens,
        totalTokens: tokens.totalTokens,
        cost: tokens.cost,
        costUnit: tokens.costUnit,
        modelUsed: tokens.modelUsed,
        // Include invoice details (will be null if no matching invoice)
        invoiceNumber: invoices.invoiceNumber,
        vendorName: invoices.vendorName,
        customerName: invoices.customerName,
        invoiceAmount: invoices.invoiceAmount,
      })
      .from(tokens)
      .leftJoin(
        invoices,
        and(eq(tokens.invoiceId, invoices.id), eq(invoices.userId, userId))
      )
      .where(
        and(
          eq(tokens.userId, userId),
          gte(tokens.createdAt, timeAgo)
        )
      )
      .orderBy(desc(tokens.createdAt));
}
