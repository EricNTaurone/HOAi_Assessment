import {CostUnit, OperationType, Token, tokens} from "@/lib/db/schemas/token/schema";
import {eq} from "drizzle-orm";
import {db} from "@/lib/db/queries";

export async function getTokensByInvoiceId(invoiceId: string): Promise<Token[]> {
    try {
        return await db
            .select()
            .from(tokens)
            .where(eq(tokens.invoiceId, invoiceId))
            .orderBy(tokens.createdAt);
    } catch (error) {
        console.error('Failed to get tokens by invoice ID from database', error);
        throw error;
    }
}

// Upsert token
export async function upsertToken(token: {
    id: string;
    invoiceId: string;
    operationType?: OperationType;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    cost?: string;
    costUnit?: CostUnit;
    modelUsed?: string;
    cachedTokens?: number;
}) {
    try {
        return await db
            .insert(tokens)
            .values({
                ...token,
                operationType: token.operationType || OperationType.EXTRACTION,
                costUnit: token.costUnit || CostUnit.USD,
                cachedTokens: token.cachedTokens || 0,
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
                    cost: token.cost,
                    costUnit: token.costUnit || CostUnit.USD,
                    modelUsed: token.modelUsed,
                    cachedTokens: token.cachedTokens || 0,
                },
            });
    } catch (error) {
        console.error('Failed to upsert token in database', error);
        throw error;
    }
}