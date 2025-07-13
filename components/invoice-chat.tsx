'use client';

import { useChat } from 'ai/react';
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface InvoiceChatProps {
    id: string;
    initialMessages: any[];
    selectedChatModel: string;
    selectedVisibilityType: string;
}

export function InvoiceChat({
                                id,
                                initialMessages,
                                selectedChatModel,
                                selectedVisibilityType
                            }: InvoiceChatProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: '/api/chat/invoice-chat',
        initialMessages,
        body: {
            id,
            chatModel: selectedChatModel,
            visibility: selectedVisibilityType,
            file: file ? fileToBase64(file) : null,
        },
    });

    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            // Validate file type
            const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
            if (!validTypes.includes(selectedFile.type)) {
                toast.error('Please upload a PDF, JPEG, or PNG file');
                return;
            }

            // Validate file size (e.g., 10MB limit)
            if (selectedFile.size > 10 * 1024 * 1024) {
                toast.error('File size must be less than 10MB');
                return;
            }

            setFile(selectedFile);
            toast.success(`File "${selectedFile.name}" uploaded successfully`);
        }
    }, []);

    const processInvoice = useCallback(async () => {
        if (!file) {
            toast.error('Please upload a file first');
            return;
        }

        setIsProcessing(true);
        try {
            const base64File = await fileToBase64(file);

            // Submit the file for processing
            handleSubmit(new Event('submit'), {
                data: {
                    file: base64File,
                    fileName: file.name,
                },
            });
        } catch (error) {
            toast.error('Failed to process invoice');
            console.error('Error processing invoice:', error);
        } finally {
            setIsProcessing(false);
        }
    }, [file, handleSubmit]);

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto p-4">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold mb-2">Invoice Processing Assistant</h1>
                <p className="text-gray-600">
                    Upload your invoice documents and Ill help you extract and process the information.
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
                    disabled={!file || isProcessing || isLoading}
                    className="w-full"
                >
                    {isProcessing || isLoading ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Processing Invoice...
                        </>
                    ) : (
                        'Process Invoice'
                    )}
                </Button>
            </div>

            {/* Messages Display */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`p-3 rounded-lg ${
                            message.role === 'user'
                                ? 'bg-blue-100 ml-auto max-w-xs'
                                : 'bg-gray-100 mr-auto max-w-lg'
                        }`}
                    >
                        <div className="text-sm font-medium mb-1 capitalize">
                            {message.role === 'user' ? 'You' : 'Assistant'}
                        </div>
                        <div className="text-sm">{message.content}</div>
                    </div>
                ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Ask questions about your invoice or upload processing..."
                    className="flex-1"
                />
                <Button type="submit" disabled={isLoading}>
                    Send
                </Button>
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
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
    });
}