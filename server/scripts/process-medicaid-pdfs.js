import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Process Medicaid PDF documents into chunks for RAG
 * Usage: node scripts/process-medicaid-pdfs.js <state> <pdf-directory>
 * Example: node scripts/process-medicaid-pdfs.js idaho ../medicaid-pdfs/idaho
 */

class PDFProcessor {
  constructor(state) {
    this.state = state.toLowerCase();
    this.outputDir = path.join(__dirname, '../data/medicaid-docs', this.state);

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Extract text from PDF
   */
  async extractPDFText(pdfPath) {
    try {
      const dataBuffer = fs.readFileSync(pdfPath);
      // pdf-parse default export in CommonJS
      const data = await pdf.default ? await pdf.default(dataBuffer) : await pdf(dataBuffer);
      return data.text;
    } catch (error) {
      console.error(`Error extracting PDF ${pdfPath}:`, error.message);
      return null;
    }
  }

  /**
   * Chunk text into smaller pieces with overlap
   * @param {string} text - Full text to chunk
   * @param {number} chunkSize - Number of words per chunk
   * @param {number} overlap - Number of words to overlap between chunks
   */
  chunkText(text, chunkSize = 800, overlap = 100) {
    // Clean up text
    const cleaned = text
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/\n{3,}/g, '\n\n')  // Reduce excessive newlines
      .trim();

    const words = cleaned.split(' ');
    const chunks = [];

    for (let i = 0; i < words.length; i += (chunkSize - overlap)) {
      const chunk = words.slice(i, i + chunkSize).join(' ');

      // Only add chunks with substantial content
      if (chunk.trim().length > 100) {
        chunks.push(chunk.trim());
      }
    }

    return chunks;
  }

  /**
   * Classify document type based on filename
   */
  classifyDocument(filename) {
    const lower = filename.toLowerCase();

    if (lower.includes('idapa') || lower.includes('administrative') || lower.includes('rule')) {
      return 'regulation';
    } else if (lower.includes('cms') || lower.includes('appendix') || lower.includes('federal')) {
      return 'federal_guidance';
    } else if (lower.includes('billing') || lower.includes('claim')) {
      return 'billing_guide';
    } else if (lower.includes('rate') || lower.includes('reimbursement')) {
      return 'rate_schedule';
    } else if (lower.includes('eligibility') || lower.includes('coverage')) {
      return 'eligibility';
    } else {
      return 'general';
    }
  }

  /**
   * Process all PDFs and text files in a directory
   */
  async processDirectory(pdfDir) {
    console.log(`\n🚀 Processing Medicaid documents for ${this.state.toUpperCase()}`);
    console.log(`📁 Source directory: ${pdfDir}`);
    console.log(`📁 Output directory: ${this.outputDir}\n`);

    if (!fs.existsSync(pdfDir)) {
      console.error(`❌ Directory not found: ${pdfDir}`);
      process.exit(1);
    }

    const files = fs.readdirSync(pdfDir).filter(f => {
      const ext = f.toLowerCase();
      return ext.endsWith('.pdf') || ext.endsWith('.txt');
    });

    if (files.length === 0) {
      console.error(`❌ No PDF or TXT files found in ${pdfDir}`);
      process.exit(1);
    }

    const pdfCount = files.filter(f => f.toLowerCase().endsWith('.pdf')).length;
    const txtCount = files.filter(f => f.toLowerCase().endsWith('.txt')).length;
    console.log(`Found ${files.length} files (${pdfCount} PDFs, ${txtCount} text files)\n`);

    const allChunks = [];
    let totalChunks = 0;

    for (const file of files) {
      const filePath = path.join(pdfDir, file);
      console.log(`📄 Processing: ${file}`);

      // Extract text based on file type
      let text;
      if (file.toLowerCase().endsWith('.txt')) {
        text = fs.readFileSync(filePath, 'utf8');
      } else {
        text = await this.extractPDFText(filePath);
      }

      if (!text) {
        console.log(`   ⚠️  Skipped (could not extract text)\n`);
        continue;
      }

      // Chunk text
      const chunks = this.chunkText(text);
      console.log(`   ✓ Extracted ${text.length} characters`);
      console.log(`   ✓ Created ${chunks.length} chunks\n`);

      // Create metadata for each chunk
      const docType = this.classifyDocument(file);
      chunks.forEach((chunk, index) => {
        allChunks.push({
          text: chunk,
          metadata: {
            state: this.state,
            source: file,
            doc_type: docType,
            chunk_index: index,
            total_chunks: chunks.length,
            chunk_id: `${this.state}_${path.parse(file).name}_${index}`
          }
        });
      });

      totalChunks += chunks.length;
    }

    // Save chunks to JSON
    const outputPath = path.join(this.outputDir, 'chunks.json');
    fs.writeFileSync(outputPath, JSON.stringify(allChunks, null, 2));

    console.log(`\n✅ Processing complete!`);
    console.log(`   Total files: ${files.length}`);
    console.log(`   Total chunks: ${totalChunks}`);
    console.log(`   Saved to: ${outputPath}`);
    console.log(`\n📝 Next step: Run embeddings generation script`);
    console.log(`   node scripts/generate-embeddings.js ${this.state}\n`);

    return allChunks;
  }
}

// CLI execution
const state = process.argv[2];
const pdfDir = process.argv[3];

if (!state || !pdfDir) {
  console.error('Usage: node scripts/process-medicaid-pdfs.js <state> <pdf-directory>');
  console.error('Example: node scripts/process-medicaid-pdfs.js idaho ~/Downloads/idaho-medicaid-docs');
  process.exit(1);
}

const processor = new PDFProcessor(state);
processor.processDirectory(pdfDir)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
