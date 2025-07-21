import { InvoiceAgent } from '@/lib/ai/invoice-agent/invoice-agent';
import { getInvoicesByUserId } from '@/lib/db/schemas/invoice/queries';
import { LineItem } from '@/lib/types/invoice.dto';

const invoiceAgent = new InvoiceAgent();

interface ExtractInvoiceDataInput {
  images: string[];
  userId: string;
  fileName: string;
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

export async function extractInvoiceData({ images, userId, fileName }: ExtractInvoiceDataInput): Promise<ExtractInvoiceDataOutput> {
  try {
    console.log(`Extracting data from invoice: ${fileName}`);
    console.log(`User ID: ${userId}`);
    
    // Extract invoice data
    const extraction = await invoiceAgent.extractInvoiceData(images);
    console.log('Extraction result:', extraction);
    
    // Get existing invoices for duplicate check
    const existingInvoices = await getInvoicesByUserId({ userId });
    
    // Check for duplicates
    const duplicateCheck = await invoiceAgent.checkForDuplicates(
      extraction.vendorName,
      extraction.invoiceNumber,
      extraction.invoiceAmount,
      existingInvoices
    );
    
    console.log('Duplicate check result:', duplicateCheck);
    
    return {
      success: true,
      extraction: {
        customerName: extraction.customerName,
        vendorName: extraction.vendorName,
        invoiceNumber: extraction.invoiceNumber,
        invoiceDate: extraction.invoiceDate,
        invoiceDueDate: extraction.invoiceDueDate,
        invoiceAmount: extraction.invoiceAmount,
        lineItems: extraction.lineItems
      },
      duplicateCheck: {
        isDuplicate: duplicateCheck.isDuplicate,
        reasoning: duplicateCheck.reasoning
      },
      fileName: fileName
    };
  } catch (error) {
    console.error('Error extracting invoice data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during extraction',
      extraction: null,
      duplicateCheck: {
        isDuplicate: false,
        reasoning: 'Extraction failed - could not check for duplicates'
      },
      fileName: fileName
    };
  }
}
