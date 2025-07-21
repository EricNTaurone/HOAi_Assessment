'use client';

import { useState } from 'react';
import { processDocumentFile } from '@/lib/pdf-processing';

export default function TestPdfPage() {
    const [result, setResult] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setResult('Processing...');

        try {
            const processed = await processDocumentFile(file);
            setResult(`✅ Success! Processed ${processed.type} with ${processed.images.length} image(s)`);
        } catch (error) {
            setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">PDF Processing Test</h1>
            <div className="space-y-4">
                <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    disabled={isProcessing}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {result && (
                    <div className="p-4 border rounded-lg bg-gray-50">
                        <pre className="whitespace-pre-wrap">{result}</pre>
                    </div>
                )}
            </div>
        </div>
    );
}
