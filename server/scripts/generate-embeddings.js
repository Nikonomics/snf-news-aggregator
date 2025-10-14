import fs from 'fs';
import path from 'path';
import { pipeline } from '@xenova/transformers';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate embeddings for document chunks using Xenova Transformers
 * Usage: node scripts/generate-embeddings.js <state>
 * Example: node scripts/generate-embeddings.js idaho
 */

class EmbeddingsGenerator {
  constructor(state) {
    this.state = state.toLowerCase();
    this.chunksPath = path.join(__dirname, '../data/medicaid-docs', this.state, 'chunks.json');
    this.outputPath = path.join(__dirname, '../data/embeddings', `${this.state}.json`);
    this.embedder = null;
  }

  /**
   * Initialize the embedding model
   */
  async initializeModel() {
    console.log('🔄 Loading embedding model (this may take a moment on first run)...');

    // Use Xenova's all-MiniLM-L6-v2 model (same as Python SentenceTransformers)
    // This will download ~23MB model on first run
    this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    console.log('✓ Model loaded\n');
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text) {
    const output = await this.embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  /**
   * Process all chunks and generate embeddings
   */
  async generateEmbeddings() {
    console.log(`\n🚀 Generating embeddings for ${this.state.toUpperCase()}`);
    console.log(`📁 Input: ${this.chunksPath}`);
    console.log(`📁 Output: ${this.outputPath}\n`);

    // Load chunks
    if (!fs.existsSync(this.chunksPath)) {
      console.error(`❌ Chunks file not found: ${this.chunksPath}`);
      console.error(`   Run: node scripts/process-medicaid-pdfs.js ${this.state} <pdf-directory>`);
      process.exit(1);
    }

    const chunks = JSON.parse(fs.readFileSync(this.chunksPath, 'utf8'));
    console.log(`📄 Loaded ${chunks.length} chunks\n`);

    // Initialize model
    await this.initializeModel();

    // Generate embeddings with progress indicator
    console.log('⚙️  Generating embeddings...');
    const startTime = Date.now();
    const embeddingsData = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      try {
        const embedding = await this.generateEmbedding(chunk.text);

        embeddingsData.push({
          ...chunk,
          embedding: embedding
        });

        // Progress indicator
        if ((i + 1) % 10 === 0 || i === chunks.length - 1) {
          const progress = ((i + 1) / chunks.length * 100).toFixed(1);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          process.stdout.write(`\r   Progress: ${i + 1}/${chunks.length} (${progress}%) - ${elapsed}s elapsed`);
        }
      } catch (error) {
        console.error(`\n❌ Error processing chunk ${i}:`, error.message);
      }
    }

    console.log('\n');

    // Ensure output directory exists
    const outputDir = path.dirname(this.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save embeddings
    fs.writeFileSync(this.outputPath, JSON.stringify(embeddingsData, null, 2));

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const fileSize = (fs.statSync(this.outputPath).size / 1024 / 1024).toFixed(2);

    console.log(`✅ Embeddings generated successfully!`);
    console.log(`   Total chunks: ${chunks.length}`);
    console.log(`   Total time: ${totalTime}s`);
    console.log(`   File size: ${fileSize} MB`);
    console.log(`   Saved to: ${this.outputPath}`);
    console.log(`\n📝 Next step: Restart your server to load the new embeddings`);
    console.log(`   The RAG system will automatically use these embeddings\n`);

    return embeddingsData;
  }
}

// CLI execution
const state = process.argv[2];

if (!state) {
  console.error('Usage: node scripts/generate-embeddings.js <state>');
  console.error('Example: node scripts/generate-embeddings.js idaho');
  process.exit(1);
}

const generator = new EmbeddingsGenerator(state);
generator.generateEmbeddings()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
