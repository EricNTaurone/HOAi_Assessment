import {z} from 'zod'
import {createTypedSchema} from "@/lib/utils";
import {LanguageModelUsage} from "ai";

// Invoice extraction
export interface Invoice {
    customerName: string,
    vendorName: string,
    invoiceDate: string,
    invoiceNumber: string,
    invoiceAmount: string,
    invoiceDueDate: string,
    lineItems?: LineItem[]
}

export interface LineItem {
    itemName: string,
    itemQuantity: string,
    itemPrice: string,
    itemTotal: string,
}

export const InvoiceSchema = createTypedSchema<Invoice>()(
    z.object({
        customerName: z.string(),
        vendorName: z.string(),
        invoiceDate: z.string(),
        invoiceNumber: z.string(),
        invoiceAmount: z.string(),
        invoiceDueDate: z.string(),
        lineItems: z.array(z.object({
            itemName: z.string(),
            itemQuantity: z.string(),
            itemPrice: z.string(),
            itemTotal: z.string(),
        }))
    })
);

export interface InvoiceSchemaResult extends Invoice {
    tokenUsage: LanguageModelUsage;
}

// Document classification
export interface DocumentClassification {
    isInvoice: boolean;
    confidence: number;
    reasoning: string;
}

export const DocumentClassificationSchema = createTypedSchema<DocumentClassification>()(
    z.object({
        isInvoice: z.boolean(),
        confidence: z.number(),
        reasoning: z.string()
    })
);

export interface DocumentClassificationResult extends DocumentClassification {
    tokenUsage: LanguageModelUsage;
}


// Duplicate identification
export interface DuplicateIdentification {
    isDuplicate: boolean;
    confidence: number;
    reasoning: string;
}

export const DuplicateIdentificationSchema = createTypedSchema<DuplicateIdentification>()(
    z.object({
        isDuplicate: z.boolean(),
        confidence: z.number(),
        reasoning: z.string()
    })
);

export interface DuplicateIdentificationResult extends DuplicateIdentification {
    tokenUsage: LanguageModelUsage;
}