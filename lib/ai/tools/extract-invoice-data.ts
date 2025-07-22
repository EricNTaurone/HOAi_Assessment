import { InvoiceAgent } from "@/lib/ai/invoice-agent/invoice-agent";
import { CostUnit, OperationType } from "@/lib/db/schema";
import { getInvoicesByUserId } from "@/lib/db/schemas/invoice/queries";
import { upsertToken } from "@/lib/db/schemas/token/queries";
import { LineItem } from "@/lib/types/invoice.dto";
import { generateUUID } from "@/lib/utils";

const invoiceAgent = new InvoiceAgent();

interface ExtractInvoiceDataInput {
  images: string[];
  userId: string;
  fileName: string;
  invoiceId: string;
}

interface ExtractInvoiceDataOutput {
  success: boolean;
  extraction: {
    customerName: string;
    vendorName: string;
    invoiceNumber: string;
    invoiceDate: string;
    invoiceDueDate: string;
    invoiceAmount: string;
    lineItems?: LineItem[];
  } | null;
  duplicateCheck: {
    isDuplicate: boolean;
    reasoning: string;
  };
  fileName: string;
  error?: string;
}

export async function extractInvoiceData({
  images,
  userId,
  fileName,
  invoiceId,
}: ExtractInvoiceDataInput): Promise<ExtractInvoiceDataOutput> {
  try {
    // Extract invoice data
    const extraction = await invoiceAgent.extractInvoiceData(
      images,
      userId,
      invoiceId
    );

    // Get existing invoices for duplicate check
    const existingInvoices = await getInvoicesByUserId({ userId });

    // Check for duplicates
    const duplicateCheck = await invoiceAgent.checkForDuplicates(
      extraction.vendorName,
      extraction.invoiceNumber,
      extraction.invoiceAmount,
      existingInvoices,
      userId,
      invoiceId
    );

    return {
      success: true,
      extraction: {
        customerName: extraction.customerName,
        vendorName: extraction.vendorName,
        invoiceNumber: extraction.invoiceNumber,
        invoiceDate: extraction.invoiceDate,
        invoiceDueDate: extraction.invoiceDueDate,
        invoiceAmount: extraction.invoiceAmount,
        lineItems: extraction.lineItems,
      },
      duplicateCheck: {
        isDuplicate: duplicateCheck.isDuplicate,
        reasoning: duplicateCheck.reasoning,
      },
      fileName: fileName,
    };
  } catch (error) {
    console.error("Error extracting invoice data:", error);
    return {
      success: false,
      error: "An error occurred while extracting invoice data.",
      extraction: null,
      duplicateCheck: {
        isDuplicate: false,
        reasoning: "Extraction failed - could not check for duplicates",
      },
      fileName: fileName,
    };
  }
}
