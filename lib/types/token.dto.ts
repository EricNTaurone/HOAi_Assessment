import { CostUnit, OperationType } from "../db/schema";

export interface TokenDto {
  id: string;
  createdAt: Date;
  userId: string;
  invoiceId: string;
  operationType: OperationType;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  cost?: number;
  costUnit: CostUnit;
  modelUsed: string | null;
}

export interface TokenUsageDto {
  id: string;
  createdAt: Date;
  invoiceId: string;
  operationType: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  cost: string | null;
  costUnit: string | null;
  modelUsed: string | null;
  cachedTokens: number | null;
  // Invoice fields
  invoiceNumber: string;
  vendorName: string;
  customerName: string;
  invoiceAmount: string;
}

export interface TokenMetrics {
  totalInvoices: number;
  averageTokensPerInvoice: number;
  averageCostPerInvoice: number;
  totalTokensUsed: number;
  totalCostIncurred: number;
}

export interface WeeklyTokenData {
  week: string;
  totalTokens: number;
  totalCost: number;
  invoiceCount: number;
  avgTokens?: number;
  avgCost?: number;
}
