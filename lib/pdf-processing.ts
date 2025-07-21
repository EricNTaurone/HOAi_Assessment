// Dynamic import for PDF.js to avoid SSR issues
let pdfjsLib: any = null;

// Configure PDF.js worker for client-side only
const configurePdfJs = async () => {
    if (typeof window === 'undefined') {
        throw new Error('PDF processing is only available in the browser');
    }
    
    if (!pdfjsLib) {
        // Dynamically import PDF.js only on the client side
        pdfjsLib = await import('pdfjs-dist');
        
        // Use local worker to avoid CORS issues
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        
        console.log('PDF.js configured with local worker');
    }
    
    return pdfjsLib;
};

export interface ProcessedDocument {
    type: 'image' | 'pdf';
    images: string[]; // Base64 encoded images
    originalFileName: string;
}

export async function processDocumentFile(file: File): Promise<ProcessedDocument> {
    const fileType = file.type;

    if (fileType === 'application/pdf') {
        return await processPdfFile(file);
    } else if (fileType.startsWith('image/')) {
        return await processImageFile(file);
    } else {
        throw new Error(`Unsupported file type: ${fileType}`);
    }
}

async function processImageFile(file: File): Promise<ProcessedDocument> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve({
                type: 'image',
                images: [base64],
                originalFileName: file.name
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function processPdfFile(file: File): Promise<ProcessedDocument> {
    try {
        console.log('Processing PDF on frontend:', file.name, file.size, 'bytes');
        
        // Ensure PDF.js is loaded and configured
        const pdfjs = await configurePdfJs();
        
        // Read the PDF file as array buffer
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Load the PDF document
        const loadingTask = pdfjs.getDocument({ data: uint8Array });
        const pdfDocument = await loadingTask.promise;

        console.log('PDF loaded successfully, pages:', pdfDocument.numPages);
        const images: string[] = [];

        // Process each page
        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
            console.log(`Processing page ${pageNumber}/${pdfDocument.numPages}`);
            
            const page = await pdfDocument.getPage(pageNumber);

            // Set up the canvas
            const scale = 2.0; // Higher scale for better quality
            const viewport = page.getViewport({ scale });

            // Create canvas element
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (!context) {
                throw new Error('Failed to get canvas context');
            }

            // Render the page
            const renderContext = {
                canvasContext: context,
                viewport: viewport,
            };

            await page.render(renderContext).promise;

            // Convert canvas to base64
            const dataURL = canvas.toDataURL('image/png', 0.9);
            const base64 = dataURL.split(',')[1];
            images.push(base64);
            
            console.log(`Page ${pageNumber} converted, base64 length:`, base64.length);
        }

        console.log('PDF conversion completed successfully');
        return {
            type: 'pdf',
            images,
            originalFileName: file.name
        };
    } catch (error) {
        console.error('Error processing PDF on frontend:', error);
        throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}