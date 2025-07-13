import {streamText, convertToCoreMessages, createDataStreamResponse} from "ai";
import {InvoiceAgent} from "@/lib/ai/invoice-agent/invoice-agent";
import {myProvider} from "@/lib/ai/models";
import {z} from "zod";
import {auth} from "@/app/(auth)/auth";
import {getInvoicesByUserId, insertInvoice} from "@/lib/db/schemas/invoice/queries";
import {InvoiceDto} from "@/lib/types/invoice.dto";

const invoiceAgent = new InvoiceAgent();

export async function POST(request: Request) {
    const {messages, file} = await request.json();

    const session = await auth();

    if (!session || !session.user) {
        return new Response('Unauthorized', {status: 401});
    }

    return createDataStreamResponse({
        execute: (dataStream) => {
            const result = streamText({
                model: myProvider.languageModel('chat-model-large'),
                messages: convertToCoreMessages(messages),
                tools: {
                    processInvoice: {
                        description: 'Process an uploaded invoice document',
                        parameters: z.object({
                            fileData: z.string().describe('Base64 encoded file data'),
                            fileName: z.string().describe('Name of uploaded file')
                        }),
                        execute: async ({fileData, fileName}) => {
                            try {
                                const classification = await invoiceAgent.classifyDocument(fileData);

                                if (!classification.isInvoice) {
                                    return {
                                        success: false,
                                        message: `The uploaded file is not an invoice. Analysis details are ${classification.reasoning}`,
                                        confidence: classification.confidence
                                    }
                                }

                                const extraction = await invoiceAgent.extractInvoiceData(fileData);
                                const existingInvoices = await getInvoicesByUserId({userId: session.user.id});

                                const duplicateCheck = await invoiceAgent.checkForDuplicates(
                                    extraction.vendorName,
                                    extraction.invoiceNumber,
                                    extraction.invoiceAmount,
                                    existingInvoices
                                );

                                if (duplicateCheck.isDuplicate) {
                                    return {
                                        success: false,
                                        message: `⚠️ Duplicate invoice detected. This invoice from ${extraction.vendorName} (Invoice #${extraction.invoiceNumber}, Amount: ${extraction.invoiceAmount}) appears to already exist in the system. ${duplicateCheck.reasoning}`,
                                        confidence: duplicateCheck.confidence
                                    };
                                }

                                const invoiceToSave: InvoiceDto = {
                                    userId: session.user.id,
                                    customerName: extraction.customerName,
                                    vendorName: extraction.vendorName,
                                    invoiceNumber: extraction.invoiceNumber,
                                    invoiceDate: extraction.invoiceDate,
                                    invoiceDueDate: extraction.invoiceDueDate,
                                    invoiceAmount: extraction.invoiceAmount,
                                    lineItems: extraction.lineItems
                                };

                                const savedInvoice = await insertInvoice(invoiceToSave);

                                return {
                                    success: true,
                                    message: `️✅ Invoice processed successfully! Extracted data from ${extraction.vendorName} for $${extraction.invoiceAmount}`,
                                    invoice: savedInvoice,
                                    tokenUsage: classification.tokenUsage.totalTokens + duplicateCheck.tokenUsage.totalTokens + extraction.tokenUsage.totalTokens
                                }
                            }
                            catch (error: any) {
                                console.error('Failed to process invoice:', error);
                                return {
                                    success: false,
                                    message: 'An error occurred while processing your request. Please try again or contact support.',
                                    error: error.message
                                };
                            }
                        }
                    }
                }
            })

            result.mergeIntoDataStream(dataStream, {sendReasoning: true})
        },
        onError: () => {
            return 'Oops, an error occured!';
        },
    });
}