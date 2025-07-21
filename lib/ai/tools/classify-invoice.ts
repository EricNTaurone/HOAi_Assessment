import { InvoiceAgent } from '@/lib/ai/invoice-agent/invoice-agent';

const invoiceAgent = new InvoiceAgent();

interface ClassifyInvoiceInput {
  images: string[];
  fileName: string;
}

interface ClassifyInvoiceOutput {
  success: boolean;
  isInvoice: boolean;
  reasoning: string;
  fileName: string;
  pageCount: number;
  error?: string;
}

export async function classifyInvoice({ images, fileName }: ClassifyInvoiceInput): Promise<ClassifyInvoiceOutput> {
  try {
    console.log(`Classifying document: ${fileName}`);
    console.log(`Number of pages: ${images.length}`);
    
    const classification = await invoiceAgent.classifyDocument(images);
    
    console.log('Classification result:', classification);
    
    return {
      success: true,
      isInvoice: classification.isInvoice,
      reasoning: classification.reasoning,
      fileName: fileName,
      pageCount: images.length
    };
  } catch (error) {
    console.error('Error classifying document:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during classification',
      isInvoice: false,
      reasoning: 'Classification failed due to an error',
      fileName: fileName,
      pageCount: images.length
    };
  }
}
