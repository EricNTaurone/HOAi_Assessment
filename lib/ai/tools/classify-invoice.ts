import { InvoiceAgent } from "@/lib/ai/invoice-agent/invoice-agent";
import { CostUnit, OperationType } from "@/lib/db/schema";
import { upsertToken } from "@/lib/db/schemas/token/queries";
import { generateUUID } from "@/lib/utils";
import { LanguageModelUsage } from "ai";

const invoiceAgent = new InvoiceAgent();

interface ClassifyInvoiceInput {
  images: string[];
  fileName: string;
  userId: string;
  invoiceId: string;
}

interface ClassifyInvoiceOutput {
  success: boolean;
  isInvoice: boolean;
  reasoning: string;
  fileName: string;
  pageCount: number;
  error?: string;
  tokenUsage?: LanguageModelUsage;
}

export async function classifyInvoice({
  images,
  fileName,
  userId,
  invoiceId,
}: ClassifyInvoiceInput): Promise<ClassifyInvoiceOutput> {
  try {
    const classification = await invoiceAgent.classifyDocument(images, userId, invoiceId);

    return {
      success: true,
      isInvoice: classification.isInvoice,
      reasoning: classification.reasoning,
      fileName: fileName,
      pageCount: images.length,
      tokenUsage: classification.tokenUsage,
    };
  } catch (error) {
    console.error("Error classifying document:", error);
    return {
      success: false,
      error: "An error occurred during classification",
      isInvoice: false,
      reasoning: "Classification failed due to an error",
      fileName: fileName,
      pageCount: images.length,
    };
  }
}
