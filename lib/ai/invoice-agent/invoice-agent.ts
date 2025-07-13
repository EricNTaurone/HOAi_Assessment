import {myProvider} from '../models';
import {
    DocumentClassificationSchema,
    DocumentClassificationResult,
    InvoiceSchemaResult, InvoiceSchema, DuplicateIdentificationResult, DuplicateIdentificationSchema
} from "@/lib/ai/invoice-agent/schema";
import {
    duplicateIdentificationPrompt,
    invoiceClassificationPrompt,
    invoiceExtractionPrompt
} from "@/lib/ai/invoice-agent/prompts";
import {generateObject} from "ai";
import {Invoice} from "@/lib/db/schemas/invoice/schema";
import {InvoiceDto} from "@/lib/types/invoice.dto";

export class InvoiceAgent {
    private model = myProvider.languageModel('chat-model-large');
    private fallbackModel = myProvider.languageModel('chat-model-small');

    async classifyDocument(imageBase64: string): Promise<DocumentClassificationResult> {
        const {object, usage} = await generateObject({
            model: this.model,
            schema: DocumentClassificationSchema,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: invoiceClassificationPrompt,
                        },
                        {
                            type: 'image',
                            image: imageBase64
                        }
                    ]

                }
            ]
        });

        return {
            isInvoice: object.isInvoice,
            confidence: object.confidence,
            reasoning: object.reasoning,
            tokenUsage: usage
        }
    }

    async extractInvoiceData(imageBase64: string): Promise<InvoiceSchemaResult> {
        const {object, usage} = await generateObject({
            model: this.model,
            schema: InvoiceSchema,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: invoiceExtractionPrompt
                        },
                        {
                            type: 'image',
                            image: imageBase64
                        }
                    ]
                }
            ]
        });

        return {
            ...object,
            tokenUsage: usage,
        }
    }

    async checkForDuplicates(
        vendorName: string,
        invoiceNumber: string,
        amount: number,
        existingInvoices: InvoiceDto[]
    ): Promise<DuplicateIdentificationResult> {
        const {object, usage} = await generateObject({
            model: this.model,
            schema: DuplicateIdentificationSchema,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: duplicateIdentificationPrompt
                        },
                        {
                            type: 'text',
                            text: `
                            **New Invoice**
                            - Vendor: ${vendorName}
                            - Invoice Number: ${invoiceNumber}
                            - Amount: ${amount}
                            
                            **Existing Invoices**
                            ${existingInvoices.map(invoice => `- Vendor: ${invoice.vendorName} - Invoice Number: ${invoice.invoiceNumber} - Amount: ${invoice.invoiceAmount}`).join('\n')}
                            `
                        }
                    ]
                }
            ]
        })

        return {
            ...object,
            tokenUsage: usage
        }
    }


}