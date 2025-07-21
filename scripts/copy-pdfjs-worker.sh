#!/bin/bash
# Copy PDF.js worker to public directory
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.js
echo "PDF.js worker copied to public directory"
