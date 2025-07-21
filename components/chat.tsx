"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { fetcher, generateUUID } from "@/lib/utils";
import { processDocumentFile } from "@/lib/pdf-processing";
import { Messages } from "./messages";
import useSWR from "swr";
import { Vote } from "@/lib/db/schema";
import { MultimodalInput } from "./multimodal-input";
import { Attachment, Message } from "ai";
import { ChatHeaderMenu } from "./chat-header-menu";
import { ExtendedAIMessage } from "@/lib/types/message.dto";
import { useChat } from "ai/react";

// Define streaming data types
interface StreamingData {
  type:
    | "text"
    | "text-delta"
    | "finish"
    | "error"
    | "invoice-data"
    | "progress"
    | "metadata";
  content: string;
  data?: any; // Additional data for structured responses
  progress?: number; // Progress percentage for long operations
}

interface ChatProps {
  id: string;
  initialMessages: any[];
  selectedChatModel: string;
  selectedVisibilityType: string;
  isNewChat: boolean;
  userId?: string;
}

export function Chat({
  id,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
  isNewChat,
  userId,
}: ChatProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const router = useRouter();

  const {
    messages,
    input,
    handleSubmit: originalHandleSubmit,
    isLoading,
    setMessages,
    setInput,
    append,
    reload,
    stop,
  } = useChat({
    api: "/api/invoice-chat",
    initialMessages,
    body: {
      id,
      chatModel: selectedChatModel,
      visibility: selectedVisibilityType,
    },
    onFinish: () => {
      // Clear the file after processing
      setFile(null);
      setIsProcessing(false);
    },
  });

  // Custom submit handler that works with the regular chat API
  const handleSubmit = useCallback(
    (event?: { preventDefault?: () => void }, chatRequestOptions?: any) => {
      if (event?.preventDefault) {
        event.preventDefault();
      }
      if (!input.trim()) return;

      // Use the original handleSubmit for regular chat messages
      originalHandleSubmit(event, chatRequestOptions);
    },
    [input, originalHandleSubmit]
  );

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (selectedFile) {
        // Validate file type
        const validTypes = [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/jpg",
        ];
        if (!validTypes.includes(selectedFile.type)) {
          toast.error("Please upload a PDF, JPEG, or PNG file");
          return;
        }

        // Validate file size (e.g., 10MB limit)
        if (selectedFile.size > 10 * 1024 * 1024) {
          toast.error("File size must be less than 10MB");
          return;
        }

        setFile(selectedFile);
        toast.success(`File "${selectedFile.name}" uploaded successfully`);
      }
    },
    []
  );

  const initializeNewChat = useCallback(
    async (fileName: string) => {
      try {
        // Create an initial message that matches the Message type structure
        const initialMessage: Message = {
          id: generateUUID(),
          role: "user" as const,
          content: `Process Invoice: ${fileName}`,
          createdAt: new Date(),
        };

        try {
          const response = await append(initialMessage);
        } catch (error) {
          console.error("Error appending initial message:", error);
        }

        // Update URL with threadId
        const url = new URL(window.location.href);
        url.searchParams.set("threadId", id);
        router.push(url.pathname + url.search);

        return true;
      } catch (error) {
        console.error("Error initializing chat:", error);
        toast.error("Failed to initialize chat");
        return false;
      }
    },
    [id, selectedChatModel, router]
  );

  const { data: votes } = useSWR<Array<Vote>>(
    `/api/vote?chatId=${id}`,
    fetcher
  );
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);

  // Combine messages with streaming content for rendering
  const displayMessages = streamingMessageId
    ? messages.map((msg) =>
        msg.id === streamingMessageId
          ? { ...msg, content: streamingContent }
          : msg
      )
    : messages;

  const processInvoice = useCallback(async () => {
    if (!file) {
      toast.error("Please upload a file first");
      return;
    }

    setIsProcessing(true);
    try {
      // If this is a new chat, initialize it first
      if (isNewChat) {
        toast.info("Initializing chat...");
        const chatInitialized = await initializeNewChat(file.name);
        if (!chatInitialized) {
          return;
        }
      }

      // Show processing toast for PDF files
      if (file.type === "application/pdf") {
        toast.info("Converting PDF to images... This may take a moment.");
      }

      const processedDoc = await processDocumentFile(file);

      toast.success(
        `Document processed successfully! Generated ${processedDoc.images.length} image(s).`
      );

      // Create the user message for invoice processing
      const userMessage = `Process Invoice: ${file.name}`;

      // Add the user message to the chat first
      const userMessageObj = {
        id: generateUUID(),
        role: "user" as const,
        content: userMessage,
        createdAt: new Date(),
      };

      // Calculate the updated messages array
      const updatedMessages = [...messages, userMessageObj];

      // Update messages with user message
      console.log("messages before setMessages:", messages); // Debug log
      setMessages(updatedMessages);
      console.log("messages after setMessages:", messages); // Debug log

      // Make the API call to invoice-chat with the processed document
      const response = await fetch("/api/invoice-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          messages: updatedMessages,
          processedDocument: processedDoc,
          chatModel: selectedChatModel,
          visibility: selectedVisibilityType,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      // Create assistant message for streaming response
      const assistantMessage = {
        id: generateUUID(),
        role: "assistant" as const,
        content: "",
        createdAt: new Date(),
      };

      // Calculate the updated messages with assistant message
      const messagesWithAssistant = [...updatedMessages, assistantMessage];

      // Add empty assistant message to start streaming
      console.log(
        "Setting initial messages with assistant:",
        messagesWithAssistant.length
      ); // Debug log
      console.log("messages before setMessages:", messages); // Debug log
      setMessages(messagesWithAssistant);
      console.log("messages after setMessages:", messages); // Debug log
      setStreamingMessageId(assistantMessage.id);
      setStreamingContent("");

      // Process the streaming response using helper function
      await processStreamingResponse(
        reader,
        assistantMessage,
        messagesWithAssistant,
        setMessages,
        setStreamingContent,
        setStreamingMessageId,
        (errorMessage: string) => {
          toast.error(errorMessage);
        },
        (progress: number) => {
          // Handle progress updates if needed
          console.log("Processing progress:", progress);
          // You could show a progress bar or update UI accordingly
        }
      );
    } catch (error) {
      console.error("Error processing invoice:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to process invoice"
      );
    } finally {
      // setIsProcessing(false);
      setStreamingContent("");
      setStreamingMessageId(null);
    }
  }, [
    file,
    isNewChat,
    initializeNewChat,
    messages,
    setMessages,
    id,
    selectedChatModel,
    selectedVisibilityType,
  ]);

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 relative">
      {/* Header Menu */}
      <ChatHeaderMenu userId={userId} />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          Invoice Processing Assistant
        </h1>
        <p className="text-gray-600">
          Upload your invoice documents and I&apos;ll help you extract and
          process the information.
        </p>
      </div>

      {/* File Upload Section */}
      <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="mb-4">
              <label
                htmlFor="file-upload"
                className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 inline-flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Choose Invoice File
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <p className="text-sm text-gray-500">
              Supports PDF, JPEG, PNG files up to 10MB
            </p>
          </div>
        </div>

        {file && (
          <div className="mt-4 p-3 bg-green-50 rounded-md">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                File Ready: {file.name}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Process Button */}
      <div className="mb-6">
        <Button
          onClick={processInvoice}
          disabled={!isNewChat || !file || isProcessing || isLoading}
          className="w-full"
        >
          {isProcessing || isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Processing Invoice...
            </>
          ) : (
            "Process Invoice"
          )}
        </Button>
        {!isNewChat && (
          <p className="text-sm text-gray-500 mt-2 text-center">
            Process Invoice is only available for new chats
          </p>
        )}
      </div>
      <Messages
        chatId={id}
        isLoading={isLoading}
        votes={votes}
        messages={displayMessages}
        setMessages={setMessages}
        reload={reload}
        isReadonly={false}
        isBlockVisible={false}
        key={`${displayMessages.length}-${streamingContent.length}`} // Force re-render on content changes
      />

      <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
        <MultimodalInput
          chatId={id}
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          stop={stop}
          attachments={attachments}
          setAttachments={setAttachments}
          messages={messages}
          setMessages={setMessages}
          append={append}
        />
      </form>
    </div>
  );
}

// Helper function to convert file to base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix to get just the base64 string
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}

// Helper function to parse streaming data
function parseStreamingData(line: string): StreamingData | null {
  const dataPattern = /^[\d+]:(.*)/;
  try {
    const jsonString = dataPattern.exec(line)?.[1];
    const data: StreamingData = jsonString ? JSON.parse(jsonString)[0] : null;
    return data;
  } catch (e) {
    console.warn("Failed to parse streaming data:", line, "Error:", e);
    return null;
  }
}

// Helper function to process streaming response
async function processStreamingResponse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  assistantMessage: any,
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setStreamingContent: React.Dispatch<React.SetStateAction<string>>,
  setStreamingMessageId: React.Dispatch<React.SetStateAction<string | null>>,
  onError?: (error: string) => void,
  onInvoiceData?: (data: any) => void,
  onProgress?: (progress: number) => void
): Promise<string> {
  let accumulatedContent = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = new TextDecoder().decode(value);
    const lines = chunk.split("\n");

    for (const line of lines) {
      const data = parseStreamingData(line);
      if (!data) {
        // Log non-data lines to understand the streaming format
        if (line.trim() && !line.startsWith("data: ")) {
          console.log("Non-data line:", line);
        }
        continue;
      }

      const newMessage: Message = {
        id: generateUUID(),
        role: "assistant",
        content: data.content,
        createdAt: new Date(),
      };

      setMessages([...messages, newMessage]);

      console.log("Parsed data:", data); // Debug log

      // Handle different data types from the stream
      switch (data.type) {
        case "text":

        case "text-delta":
          accumulatedContent += data.content;
          setStreamingContent(accumulatedContent);
          break;

        case "finish":
          console.log("Stream finished");
          // Update the final message content and clear streaming state
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === assistantMessage.id
                ? { ...msg, content: accumulatedContent }
                : msg
            )
          );
          setStreamingContent("");
          setStreamingMessageId(null);
          break;

        case "error":
          if (onError) {
            onError(data.content || "An error occurred during processing");
          }
          setStreamingContent("");
          setStreamingMessageId(null);
          break;

        case "invoice-data":
          if (onInvoiceData && data.data) {
            onInvoiceData(data.data);
          }
          break;

        case "progress":
          if (onProgress && data.progress !== undefined) {
            onProgress(data.progress);
          }
          break;

        case "metadata":
          console.log("Metadata received:", data.data);
          break;

        default:
          console.log("Unhandled data type:", data.type, data);
          break;
      }
    }
  }

  return accumulatedContent;
}

async function postMessage({ messages }: { messages: ExtendedAIMessage[] }) {
  return await fetch("/api/message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),
  });
}
