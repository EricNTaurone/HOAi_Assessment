import { insertInvoice } from '@/lib/db/schemas/invoice/queries';
import { InvoiceDto, LineItem } from '@/lib/types/invoice.dto';

interface SaveInvoiceInput {
  id: string;
  userId: string;
  customerName: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceDueDate: string;
  chatId: string;
  invoiceAmount: string;
  lineItems?: LineItem[];
}

interface SaveInvoiceOutput {
  success: boolean;
  savedInvoice?: {
    id: string;
    vendorName: string;
    invoiceNumber: string;
    invoiceAmount: string;
    invoiceDate: string;
    invoiceDueDate: string;
    createdAt: number;
  };
  message: string;
  error?: string;
}

export async function saveInvoice({
  id,
  userId, 
  customerName, 
  vendorName, 
  invoiceNumber, 
  invoiceDate, 
  invoiceDueDate, 
  invoiceAmount,
  chatId,
  lineItems 
}: SaveInvoiceInput): Promise<SaveInvoiceOutput> {
  try {
    console.log(`Saving invoice: ${invoiceNumber} from ${vendorName}`);
    
    const invoiceToSave: InvoiceDto = {
      id,
      userId,
      customerName,
      vendorName,
      chatId,
      invoiceNumber,
      invoiceDate,
      invoiceDueDate,
      invoiceAmount,
      lineItems
    };
    
    const savedInvoice = await insertInvoice(invoiceToSave);
    
    console.log('Invoice saved successfully:', savedInvoice.id);
    
    return {
      success: true,
      savedInvoice: {
        id: savedInvoice.id!,
        vendorName: savedInvoice.vendorName,
        invoiceNumber: savedInvoice.invoiceNumber,
        invoiceAmount: savedInvoice.invoiceAmount,
        invoiceDate: savedInvoice.invoiceDate,
        invoiceDueDate: savedInvoice.invoiceDueDate,
        createdAt: savedInvoice.createdAt!
      },
      message: `Invoice from ${vendorName} (Invoice #${invoiceNumber}, Amount: $${invoiceAmount}) has been successfully saved to the system.`
    };
  } catch (error) {
    console.error('Error saving invoice:', error);
    return {
      success: false,
      error: 'An error occurred while saving the invoice.',
      message: `Failed to save invoice from ${vendorName} (Invoice #${invoiceNumber}). Please try again.`
    };
  }
}
