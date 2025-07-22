import {
  streamText,
  convertToCoreMessages,
  createDataStreamResponse,
  type Message as AIMessage,
  Message,
} from "ai";
import { myProvider } from "@/lib/ai/models";
import { auth } from "@/app/(auth)/auth";
import {
  getChatById,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  deleteChatById,
} from "@/lib/db/queries";
import { createDbMessage, generateUUID, getMostRecentMessageOfType, isValidBase64Image } from "@/lib/utils";
import {
  classifyInvoice,
  extractInvoiceData,
  saveInvoice,
} from "@/lib/ai/tools";
import { generateTitleFromUserMessage } from "../../actions";
import { ProcessedDocument } from "@/lib/pdf-processing";

export const maxDuration = 60;

export async function POST(request: Request) {
  const {
    id,
    messages: inputMessages,
    messageType,
  }: {
    id: string;
    messages?: Array<AIMessage>;
    chatModel?: string;
    visibility?: string;
    messageType?: AIMessage["role"];
  } = await request.json();

  let processedDocument = null;
  if (inputMessages && inputMessages.length > 0) {
    const lastMessage = inputMessages[inputMessages.length - 1];

    if (lastMessage?.experimental_attachments) {
      const attachment = lastMessage.experimental_attachments.find(
        (att) => att.name === "processedDocument"
      );
      if (attachment && attachment.url) {
        const base64Data = attachment.url.replace(
          /^data:application\/json;base64,/,
          ""
        );
        const jsonString = atob(base64Data);
        processedDocument = JSON.parse(jsonString) as ProcessedDocument;
      }
    }
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (inputMessages && inputMessages.length > 0) {
    try {
      const userMessage = getMostRecentMessageOfType(
        inputMessages,
        messageType ? messageType : "user"
      );

      if (!userMessage) {
        return new Response("No user message found", { status: 400 });
      }

      const chat = await getChatById({ id });

      if (!chat) {
        const title = await generateTitleFromUserMessage({
          message: userMessage,
        });
        await saveChat({ id, userId: session.user.id, title });
      }

      await saveMessages({
        messages: [
          {
            id: userMessage.id || generateUUID(),
            chatId: id,
            role: userMessage.role,
            content: userMessage.content,
            createdAt: userMessage.createdAt || new Date(),
          },
        ],
      });
    } catch (error: any) {
      console.error("Failed to process chat:", error);
      return new Response("An error occurred while processing your request", {
        status: 500,
      });
    }
  }

  let messages = inputMessages;

  if (!messages || !messages.length) {
    const dbMessages = await getMessagesByChatId({ id: id });
    messages = dbMessages.map((msg) => ({
      id: msg.id,
      role: msg.role as "user" | "assistant" | "system",
      content:
        typeof msg.content === "string" ? msg.content : String(msg.content),
      createdAt: msg.createdAt,
    }));
  }

  if (processedDocument && processedDocument.images.length > 0) {
    const invalidImages = processedDocument.images.filter(
      (img) => !isValidBase64Image(img)
    );
    if (invalidImages.length > 0) {
      console.error(
        "Invalid image data detected:",
        invalidImages.length,
        "invalid images out of",
        processedDocument.images.length
      );
      return new Response(
        "Invalid image data format. Please ensure the PDF is valid and try again.",
        { status: 400 }
      );
    }

    return createDataStreamResponse({
      execute: async (dataStream) => {
        const invoiceId = generateUUID();
        try {
          dataStream.writeData({
            type: "text",
            content: `Processing your ${processedDocument.type} invoice (${
              processedDocument.images.length
            } ${processedDocument.images.length === 1 ? "page" : "pages"})...`,
          });

          // Step 1: Classify the document
          const classificationResult = await classifyInvoice({
            images: processedDocument.images,
            fileName: processedDocument.originalFileName,
            userId: session.user.id,
            invoiceId: invoiceId
          });

          if (
            !classificationResult.success ||
            !classificationResult.isInvoice
          ) {
            const content = `The uploaded file is not an invoice. Analysis details: ${classificationResult.reasoning}`;

            dataStream.writeData({
              type: "text",
              content: content,
            });

            const message = createDbMessage(
              generateUUID(),
              id,
              "assistant",
              content
            );
            await saveMessages({ messages: [message] });


            return;
          }

          // Step 2: Extract invoice data and check for duplicates
          const extractionResult = await extractInvoiceData({
            images: processedDocument.images,
            userId: session.user.id,
            fileName: processedDocument.originalFileName,
            invoiceId: invoiceId
          });

          if (!extractionResult.success || !extractionResult.extraction) {
            const content = `Failed to extract invoice data: ${extractionResult.error}`;

            dataStream.writeData({
              type: "text",
              content: content,
            });

            const message = createDbMessage(
              generateUUID(),
              id,
              "assistant",
              content
            );
            await saveMessages({ messages: [message] });

            return;
          }

          // Check for duplicates
          if (extractionResult.duplicateCheck.isDuplicate) {
            const content = `⚠️ Duplicate invoice detected. This invoice from ${extractionResult.extraction.vendorName} (Invoice #${extractionResult.extraction.invoiceNumber}, Amount: ${extractionResult.extraction.invoiceAmount}) appears to already exist in the system. ${extractionResult.duplicateCheck.reasoning}`;

            dataStream.writeData({
              type: "text",
              content: content,
            });

            const message = createDbMessage(
              generateUUID(),
              id,
              "assistant",
              content
            );
            await saveMessages({ messages: [message] });

            return;
          }

          // Step 3: Save the invoice
          const saveResult = await saveInvoice({
            id: invoiceId,
            userId: session.user.id,
            chatId: id,
            customerName: extractionResult.extraction.customerName,
            vendorName: extractionResult.extraction.vendorName,
            invoiceNumber: extractionResult.extraction.invoiceNumber,
            invoiceDate: extractionResult.extraction.invoiceDate,
            invoiceDueDate: extractionResult.extraction.invoiceDueDate,
            invoiceAmount: extractionResult.extraction.invoiceAmount,
            lineItems: extractionResult.extraction.lineItems,
          });

          if (!saveResult.success) {
            const content = `Failed to save invoice: ${saveResult.error}`;

            dataStream.writeData({
              type: "text",
              content: content,
            });

            const message = createDbMessage(
              generateUUID(),
              id,
              "assistant",
              content
            );
            await saveMessages({ messages: [message] });

            return;
          }

          const content = `✅ Invoice processed successfully! 

**Invoice Details:**
- Vendor: ${extractionResult.extraction.vendorName}
- Invoice Number: ${extractionResult.extraction.invoiceNumber}
- Amount: ${extractionResult.extraction.invoiceAmount}
- Date: ${extractionResult.extraction.invoiceDate}
- Due Date: ${extractionResult.extraction.invoiceDueDate}

The invoice has been saved to your system.`;

          dataStream.writeData({
            type: "text",
            content: content,
          });

          const message = createDbMessage(
            generateUUID(),
            id,
            "assistant",
            content
          );
          await saveMessages({ messages: [message] });

        } catch (error: any) {
          console.error("Failed to process invoice:", error);
          console.error("Error details:", {
            message: error.message,
            stack: error.stack,
            name: error.name,
          });

          let errorMessage =
            "An error occurred while processing your invoice. Please try again or contact support.";

          if (error.message?.includes("image")) {
            errorMessage =
              "There was an issue processing the document images. Please ensure the PDF is valid and try again.";
          } else if (
            error.message?.includes("model") ||
            error.message?.includes("API")
          ) {
            errorMessage =
              "There was an issue with the AI model. Please try again in a moment.";
          }

          const content = errorMessage;

          dataStream.writeData({
            type: "text",
            content: content,
          });

          const message = createDbMessage(
            generateUUID(),
            id,
            "assistant",
            content
          );
          await saveMessages({ messages: [message] });
        }
      },
      onError: (error) => {
        console.error("Failed to process invoice chat:", error);
        return "Oops, an error occurred!";
      },
    });
  }

  // Regular chat without file processing
  return createDataStreamResponse({
    execute: (dataStream) => {
      const result = streamText({
        model: myProvider.languageModel("chat-model-large"),
        messages: convertToCoreMessages(messages || []),
        system:
          "You are a helpful assistant for invoice processing. You can help users understand their invoices and answer questions about invoice management.",
      });

      result.mergeIntoDataStream(dataStream, { sendReasoning: true });
    },
    onError: (error) => {
      console.error("Failed to process invoice chat:", error);
      return "Oops, an error occurred!";
    },
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (!chat) {
      return new Response("Chat not found", { status: 404 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    console.error("Failed to delete chat:", error);
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
