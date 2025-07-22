"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { fetcher } from "@/lib/utils";
import { processDocumentFile } from "@/lib/pdf-processing";
import { Messages } from "./messages";
import useSWR from "swr";
import { Vote } from "@/lib/db/schema";
import { MultimodalInput } from "./multimodal-input";
import { Attachment } from "ai";
import { ChatHeaderMenu } from "./chat-header-menu";
import { useChat } from "ai/react";
import { SidebarHistory } from "./sidebar-history";
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
} from "@/components/ui/sidebar";
import type { User } from "next-auth";

interface ChatProps {
  id: string;
  initialMessages: any[];
  selectedChatModel: string;
  selectedVisibilityType: string;
  isNewChat: boolean;
  user?: User;
}

export function Chat({
  id,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
  isNewChat,
  user,
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
    api: "/api/chat",
    initialMessages,
    body: {
      id,
      chatModel: selectedChatModel,
      visibility: selectedVisibilityType,
    },
    onFinish: () => {
      setIsProcessing(false);
      setStreamingContent("");
      setStreamingMessageId(null);
    },
  });

  const handleSubmit = useCallback(
    (event?: { preventDefault?: () => void }, chatRequestOptions?: any) => {
      if (event?.preventDefault) {
        event.preventDefault();
      }
      if (!input.trim()) return;

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
    setStreamingContent("");
    setStreamingMessageId(null);

    try {
      // Show processing toast for PDF files
      if (file.type === "application/pdf") {
        toast.info("Converting PDF to images... This may take a moment.");
      }

      const processedDoc = await processDocumentFile(file);

      toast.success(
        `Document processed successfully! Generated ${processedDoc.images.length} image(s).`
      );

      await append({
        role: "user",
        content: `Process Invoice: ${file.name}`,
        experimental_attachments: [
          {
            name: "processedDocument",
            contentType: "application/json",
            url: `data:application/json;base64,${btoa(
              JSON.stringify(processedDoc)
            )}`,
          },
          {
            name: "metadata",
            contentType: "application/json",
            url: `data:application/json;base64,${btoa(
              JSON.stringify({
                isInvoiceProcessing: true,
              })
            )}`,
          },
        ],
      });

      const url = new URL(window.location.href);
      if (!url.searchParams.get("threadId")) {
        url.searchParams.set("threadId", id);
        router.replace(url.pathname + url.search);
      }
    } catch (error) {
      console.error("Error processing invoice:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to process invoice"
      );
    } finally {
      setFile(null);
      setIsProcessing(false);
      setStreamingContent("");
      setStreamingMessageId(null);
    }
  }, [
    file,
    isNewChat,
    id,
    selectedChatModel,
    selectedVisibilityType,
    append,
    router,
  ]);

  return (
    <SidebarProvider>
      <div className="flex h-full">
        {/* Sidebar */}
        <Sidebar>
          <SidebarContent>
            <SidebarHistory user={user} />
          </SidebarContent>
        </Sidebar>

        {/* Main chat content */}
        <div className="flex flex-col flex-1 max-w-4xl mx-auto p-4 relative">
          {/* Header Menu */}
          <ChatHeaderMenu userId={user?.id} />

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
            key={`${displayMessages.length}-${streamingContent.length}`}
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
      </div>
    </SidebarProvider>
  );
}
