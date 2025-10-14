# Medicaid RAG System - Setup Guide

This guide explains how to set up the RAG (Retrieval Augmented Generation) system for state-specific Medicaid policy chatbots.

## Overview

The RAG system allows the chatbot to answer questions based on actual PDF documents (regulations, billing guides, etc.) instead of just policy summaries.

**Architecture:**
1. PDF documents → Text extraction + Chunking
2. Text chunks → Embeddings (vector representations)
3. User question → Search embeddings → Find relevant chunks
4. Relevant chunks → Send to Claude → Get accurate answer

## Prerequisites

- Node.js installed
- Idaho Medicaid PDF documents downloaded locally
- Packages installed: `@xenova/transformers`, `pdf-parse`

## Step-by-Step Setup

### Step 1: Organize Your PDFs

Create a directory with your Idaho Medicaid PDFs:

```bash
mkdir -p ~/medicaid-pdfs/idaho
# Copy your PDFs into this directory
```

**Recommended PDFs for Idaho:**
- IDAPA 16.03.10 (Medicaid Enhanced Plan Benefits)
- Idaho Medicaid Provider Handbook
- Nursing Facility Rate Schedules
- Billing and Claims Guides
- Level of Care Criteria
- PASRR Requirements

### Step 2: Process PDFs into Chunks

Run the PDF processing script:

```bash
cd /Users/nikolashulewsky/snf-news-aggregator/server
node scripts/process-medicaid-pdfs.js idaho ~/medicaid-pdfs/idaho
```

**What this does:**
- Extracts text from all PDFs
- Splits text into 800-word chunks with 100-word overlap
- Classifies documents by type (regulation, billing_guide, etc.)
- Saves chunks to `data/medicaid-docs/idaho/chunks.json`

**Expected output:**
```
🚀 Processing Medicaid PDFs for IDAHO
📁 Source directory: ~/medicaid-pdfs/idaho
📁 Output directory: .../data/medicaid-docs/idaho

Found 5 PDF files

📄 Processing: idapa_16_03_10.pdf
   ✓ Extracted 156000 characters
   ✓ Created 245 chunks

... (more files)

✅ Processing complete!
   Total files: 5
   Total chunks: 1250
   Saved to: .../data/medicaid-docs/idaho/chunks.json
```

### Step 3: Generate Embeddings

Generate vector embeddings for the chunks:

```bash
node scripts/generate-embeddings.js idaho
```

**What this does:**
- Loads the chunks.json file
- Downloads the embedding model (all-MiniLM-L6-v2, ~23MB, first run only)
- Generates 384-dimensional vector for each chunk
- Saves embeddings to `data/embeddings/idaho.json`

**Expected output:**
```
🚀 Generating embeddings for IDAHO
📁 Input: .../data/medicaid-docs/idaho/chunks.json
📁 Output: .../data/embeddings/idaho.json

📄 Loaded 1250 chunks

🔄 Loading embedding model (this may take a moment on first run)...
✓ Model loaded

⚙️  Generating embeddings...
   Progress: 1250/1250 (100.0%) - 156.3s elapsed

✅ Embeddings generated successfully!
   Total chunks: 1250
   Total time: 156.3s
   File size: 18.52 MB
   Saved to: .../data/embeddings/idaho.json
```

**Note:** First run downloads the model (~23MB). Subsequent runs are faster.

### Step 4: Restart Your Server

The vector search system will automatically load embeddings on server startup:

```bash
# Stop current server (Ctrl+C)
node index.js
```

**You should see:**
```
🚀 Initializing Vector Search...

🔄 Loading embedding model...
✓ Model loaded

✓ Loaded 1250 embeddings for idaho

✅ Vector Search initialized with 1 states
```

### Step 5: Test the RAG System

Now when you use the Medicaid chatbot for Idaho with Deep Analysis enabled, it will:

1. Take your question
2. Search the 1250 document chunks
3. Find the 5 most relevant chunks
4. Send those chunks + your question to Claude
5. Claude answers based on the actual regulatory text

**Example:**

```
User: "How is the Medicaid per diem rate calculated in Idaho?"

System:
→ Generates embedding for question
→ Searches 1250 chunks
→ Finds top 5 matches (e.g., rate calculation sections from IDAPA)
→ Sends to Claude with context
→ Claude answers with specific formulas and citations
```

## Adding More States

To add another state (e.g., Texas):

```bash
# Step 1: Process PDFs
node scripts/process-medicaid-pdfs.js texas ~/medicaid-pdfs/texas

# Step 2: Generate embeddings
node scripts/generate-embeddings.js texas

# Step 3: Restart server
# Embeddings will auto-load
```

The system supports multiple states simultaneously.

## File Structure

```
server/
├── data/
│   ├── medicaid-docs/          # Processed document chunks
│   │   ├── idaho/
│   │   │   └── chunks.json     # Text chunks with metadata
│   │   └── texas/
│   │       └── chunks.json
│   └── embeddings/              # Vector embeddings
│       ├── idaho.json           # Embeddings + chunks + metadata
│       └── texas.json
├── scripts/
│   ├── process-medicaid-pdfs.js   # PDF → chunks
│   ├── generate-embeddings.js     # Chunks → embeddings
│   └── README_RAG.md              # This file
└── services/
    └── vectorSearch.js            # Search engine
```

## API Integration

The vector search is automatically integrated into `/api/medicaid/chat`.

When Deep Analysis is enabled, the endpoint:
1. Uses vector search to find relevant chunks
2. Formats them as context
3. Sends to Claude with the user's question

## Troubleshooting

**Q: "No embeddings found for Idaho"**
- A: Run the processing and embedding generation scripts first

**Q: "Error extracting PDF"**
- A: Some PDFs are scanned images. Try using OCR or find text-based PDFs

**Q: Model download is slow**
- A: First run downloads ~23MB. It caches locally for future use

**Q: Too many chunks (slow performance)**
- A: Adjust chunk size in process-medicaid-pdfs.js (line 52)
- A: Or filter by document type in vector search

**Q: Search results not relevant**
- A: Try increasing topK in search (default 5 chunks)
- A: Check that chunks.json has good quality text
- A: Verify PDFs contain the information you're asking about

## Performance

- **Chunk Processing**: ~1-2 seconds per PDF
- **Embedding Generation**: ~8 chunks per second (first run)
- **Query Search**: ~50-100ms for 1000 chunks
- **Total Query Time**: <200ms + Claude API time

## Next Steps

1. ✅ Set up Idaho (following this guide)
2. Test with various questions
3. Add more Idaho documents if needed
4. Expand to other states
5. Fine-tune chunk size and overlap for best results

## Questions?

- Check console logs for detailed error messages
- Verify file paths are correct
- Ensure PDFs are text-based (not scanned images)
