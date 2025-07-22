import { generateObject } from "ai";
import { myProvider } from "@/lib/ai/models";
import {
  DocumentClassificationSchema,
  InvoiceSchema,
  DuplicateIdentificationSchema,
  DocumentClassificationResult,
  InvoiceSchemaResult,
  DuplicateIdentificationResult,
} from "./schema";
import {
  invoiceClassificationPrompt,
  invoiceExtractionPrompt,
  duplicateIdentificationPrompt,
} from "./prompts";
import { InvoiceDto } from "@/lib/types/invoice.dto";
import {
  getPromptCache,
  upsertPromptCache,
} from "@/lib/db/schemas/prompt-cache/queries";
import { generateUUID } from "@/lib/utils";
import { CostUnit, OperationType } from "@/lib/db/schema";
import { upsertToken } from "@/lib/db/schemas/token/queries";

export class InvoiceAgent {
  private model = myProvider.languageModel("chat-model-large");
  private static CLASSIFY_HASH_PREFIX = "Classify::";
  private static EXTRACT_HASH_PREFIX = "Extract::";
  private static DUPLICATE_HASH_PREFIX = "Duplicate::";

  async classifyDocument(
    images: string[],
    userId: string,
    invoiceId: string
  ): Promise<DocumentClassificationResult> {
    // For multiple images, we'll process the first page primarily
    const primaryImage = images[0];

    try {
      const cachedResponse = await getPromptCache(
        InvoiceAgent.CLASSIFY_HASH_PREFIX + JSON.stringify(images)
      );
      if (cachedResponse) {
        console.log("Using cached response for classification");
        return JSON.parse(
          cachedResponse.cachedResponse
        ) as DocumentClassificationResult;
      }
    } catch (error) {
      console.error("Error fetching cached response:", error);
    }

    const { object, usage } = await generateObject({
      model: this.model,
      schema: DocumentClassificationSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                images.length > 1
                  ? `${invoiceClassificationPrompt}\n\nNote: This is a multi-page document. I'm showing you the first page, but please consider that invoices can span multiple pages.`
                  : invoiceClassificationPrompt,
            },
            {
              type: "image",
              image: `data:image/png;base64,${primaryImage}`,
            },
          ],
        },
      ],
    });

    const output: DocumentClassificationResult = {
      isInvoice: object.isInvoice,
      confidence: object.confidence,
      reasoning: object.reasoning,
      tokenUsage: usage,
    };

    upsertPromptCache({
      id: generateUUID(),
      prompt: InvoiceAgent.CLASSIFY_HASH_PREFIX + JSON.stringify(images),
      cachedResponse: JSON.stringify(output),
    });

    try {
      await upsertToken({
        id: generateUUID(),
        userId: userId,
        invoiceId: invoiceId,
        operationType: OperationType.CLASSIFICATION,
        inputTokens: output.tokenUsage.promptTokens,
        outputTokens: output.tokenUsage.completionTokens,
        totalTokens: output.tokenUsage.totalTokens,
        modelUsed: this.modelUsed,
        createdAt: new Date(),
        costUnit: CostUnit.USD,
      });
    } catch (error) {
      console.error("Error saving token usage:", error);
    }

    return output;
  }

  async extractInvoiceData(
    images: string[],
    userId: string,
    invoiceId: string
  ): Promise<InvoiceSchemaResult> {
    try {
      const cachedResponse = await getPromptCache(
        InvoiceAgent.EXTRACT_HASH_PREFIX + JSON.stringify(images)
      );
      if (cachedResponse) {
        console.log("Using cached response for classification");
        return JSON.parse(cachedResponse.cachedResponse) as InvoiceSchemaResult;
      }
    } catch (error) {
      console.error("Error fetching cached response:", error);
    }

    const content = [
      {
        type: "text" as const,
        text:
          images.length > 1
            ? `${invoiceExtractionPrompt}\n\nNote: This is a multi-page document. Please analyze all pages to extract complete invoice information.`
            : invoiceExtractionPrompt,
      },
      ...images.map((image) => ({
        type: "image" as const,
        image: `data:image/png;base64,${image}`,
      })),
    ];

    const { object, usage } = await generateObject({
      model: this.model,
      schema: InvoiceSchema,
      messages: [
        {
          role: "user",
          content: content,
        },
      ],
    });

    const output: InvoiceSchemaResult = {
      ...object,
      tokenUsage: usage,
    };

    upsertPromptCache({
      id: generateUUID(),
      prompt: InvoiceAgent.EXTRACT_HASH_PREFIX + JSON.stringify(images),
      cachedResponse: JSON.stringify(output),
    });

    try {
      await upsertToken({
        id: generateUUID(),
        userId: userId,
        invoiceId: invoiceId,
        operationType: OperationType.EXTRACTION,
        inputTokens: output.tokenUsage.promptTokens,
        outputTokens: output.tokenUsage.completionTokens,
        totalTokens: output.tokenUsage.totalTokens,
        modelUsed: this.modelUsed,
        createdAt: new Date(),
        costUnit: CostUnit.USD,
      });
    } catch (error) {
      console.error("Error saving token usage:", error);
    }

    return output;
  }

  async checkForDuplicates(
    vendorName: string,
    invoiceNumber: string,
    amount: string,
    existingInvoices: InvoiceDto[],
    userId: string,
    invoiceId: string
  ): Promise<DuplicateIdentificationResult> {
    try {
      const cachedResponse = await getPromptCache(
        InvoiceAgent.DUPLICATE_HASH_PREFIX +
          JSON.stringify({
            vendorName,
            invoiceNumber,
            amount,
            existingInvoices,
          })
      );
      if (cachedResponse) {
        console.log("Using cached response for duplicate identification");
        return JSON.parse(
          cachedResponse.cachedResponse
        ) as DuplicateIdentificationResult;
      }
    } catch (error) {
      console.error("Error fetching cached response:", error);
    }

    const { object, usage } = await generateObject({
      model: this.model,
      schema: DuplicateIdentificationSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: duplicateIdentificationPrompt,
            },
            {
              type: "text",
              text: `
                            **New Invoice**
                            - Vendor: ${vendorName}
                            - Invoice Number: ${invoiceNumber}
                            - Amount: ${amount}
                            
                            **Existing Invoices**
                            ${existingInvoices
                              .map(
                                (invoice) =>
                                  `- Vendor: ${invoice.vendorName} - Invoice Number: ${invoice.invoiceNumber} - Amount: ${invoice.invoiceAmount}`
                              )
                              .join("\n")}
                            `,
            },
          ],
        },
      ],
    });

    const output: DuplicateIdentificationResult = {
      ...object,
      tokenUsage: usage,
    };

    upsertPromptCache({
      id: generateUUID(),
      prompt:
        InvoiceAgent.DUPLICATE_HASH_PREFIX +
        JSON.stringify({ vendorName, invoiceNumber, amount, existingInvoices }),
      cachedResponse: JSON.stringify(output),
    });

    try {
      await upsertToken({
        id: generateUUID(),
        userId: userId,
        invoiceId: invoiceId,
        operationType: OperationType.DUPLICATE_CHECK,
        inputTokens: output.tokenUsage.promptTokens,
        outputTokens: output.tokenUsage.completionTokens,
        totalTokens: output.tokenUsage.totalTokens,
        modelUsed: this.modelUsed,
        createdAt: new Date(),
        costUnit: CostUnit.USD,
      });
    } catch (error) {
      console.error("Error saving token usage:", error);
    }

    return output;
  }

  get modelUsed(): string {
    return this.model.modelId;
  }
}
