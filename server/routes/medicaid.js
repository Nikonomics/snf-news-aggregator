import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getRelevantDocuments } from '../services/documentFetcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Load Medicaid policies data
const policiesPath = path.join(__dirname, '../data/medicaid-policies-structured.json');
let medicaidPolicies = {};

try {
  const data = fs.readFileSync(policiesPath, 'utf8');
  medicaidPolicies = JSON.parse(data);
  console.log(`✓ Loaded Medicaid policies for ${Object.keys(medicaidPolicies).length} states`);
} catch (error) {
  console.error('Error loading Medicaid policies:', error);
}

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// GET all states list
router.get('/states', (req, res) => {
  try {
    const states = Object.keys(medicaidPolicies).sort();
    res.json({ states });
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({ error: 'Failed to fetch states' });
  }
});

// GET policies for a specific state
router.get('/policies/:state', (req, res) => {
  try {
    const { state } = req.params;
    const stateData = medicaidPolicies[state];

    if (!stateData) {
      return res.status(404).json({ error: 'State not found' });
    }

    res.json(stateData);
  } catch (error) {
    console.error('Error fetching state policies:', error);
    res.status(500).json({ error: 'Failed to fetch state policies' });
  }
});

// POST chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { state, question, conversationHistory = [], deepAnalysis = false } = req.body;

    if (!state || !question) {
      return res.status(400).json({ error: 'State and question are required' });
    }

    const stateData = medicaidPolicies[state];

    if (!stateData) {
      return res.status(404).json({ error: 'State not found' });
    }

    // Build context from state policies
    const policiesContext = stateData.policies.map(policy => {
      return `Category: ${policy.category}
Policy: ${policy.policyName}
Summary: ${policy.summary}
Details: ${policy.sourceLanguage}
Sources: ${policy.sources}
Date: ${policy.dates}
---`;
    }).join('\n\n');

    let additionalContext = '';
    let fetchedDocuments = [];

    // If Deep Analysis is enabled, fetch actual regulation documents
    if (deepAnalysis) {
      console.log(`[Deep Analysis] Fetching regulatory documents for ${state}...`);

      try {
        // Fetch documents from all categories (limit to 3 most relevant)
        const documents = await getRelevantDocuments(state, 'all', medicaidPolicies);

        // Filter out errors and empty documents
        fetchedDocuments = documents.filter(doc => doc.type !== 'error' && doc.text.length > 100);

        if (fetchedDocuments.length > 0) {
          additionalContext = '\n\nADDITIONAL REGULATORY DOCUMENTS:\n\n';
          fetchedDocuments.forEach((doc, idx) => {
            additionalContext += `Document ${idx + 1}: ${doc.url}\n`;
            additionalContext += `Type: ${doc.type}\n`;
            additionalContext += `Content:\n${doc.text}\n\n`;
            additionalContext += '---\n\n';
          });

          console.log(`[Deep Analysis] Fetched ${fetchedDocuments.length} documents (${additionalContext.length} chars)`);
        } else {
          console.log(`[Deep Analysis] No documents could be fetched`);
        }
      } catch (docError) {
        console.error('[Deep Analysis] Error fetching documents:', docError);
        // Continue without documents rather than failing
      }
    }

    // Build conversation messages
    const messages = [
      ...conversationHistory,
      {
        role: 'user',
        content: question
      }
    ];

    // System prompt for Claude
    const systemPrompt = deepAnalysis
      ? `You are a knowledgeable assistant specializing in Medicaid Fee-for-Service Nursing Facility Payment Policies for ${state}.

DEEP ANALYSIS MODE: You have access to both the policy summary spreadsheet AND the actual regulatory documents.

Your task is to provide comprehensive answers by analyzing BOTH:
1. The policy summaries (for quick reference)
2. The full regulatory documents (for detailed information)

CRITICAL FORMATTING REQUIREMENTS:
1. Structure your response like a textbook with clear hierarchy:
   - Use descriptive section headers (##) for major topics
   - Use bullet points for lists
   - Use numbered steps for procedures

2. Format ALL mathematical formulas and calculations as STANDALONE blocks:
   - Put each formula on its own line
   - Use clear variable definitions before the formula
   - Show calculation steps separately
   - Example format:

     **Formula:**
     Rate = (Total Allowable Costs ÷ Patient Days) × Inflation Factor

     **Where:**
     - Total Allowable Costs = sum of all cost centers
     - Patient Days = annual patient days
     - Inflation Factor = DRI Market Basket Index

3. Break complex information into digestible chunks:
   - No long run-on paragraphs
   - Maximum 3-4 sentences per paragraph
   - Use white space generously
   - Add visual breaks between concepts

4. Make calculations intuitive:
   - Show examples with actual numbers when possible
   - Explain what each component means in plain language
   - Highlight key thresholds or limits

5. Content guidelines:
   - Prioritize information from the actual regulatory documents
   - Be specific and accurate with regulatory citations
   - If information differs between summary and documents, note this clearly

6. Always end with a "## Sources" section listing:
   - Policy category and name
   - Specific document URLs referenced
   - Any relevant regulatory citations

Here are the Medicaid policy summaries for ${state}:

${policiesContext}

${additionalContext}`
      : `You are a knowledgeable assistant specializing in Medicaid Fee-for-Service Nursing Facility Payment Policies for ${state}.

Your task is to answer questions about ${state}'s Medicaid policies using the provided policy summary data.

CRITICAL FORMATTING REQUIREMENTS:
1. Structure your response like a textbook with clear hierarchy:
   - Use descriptive section headers (##) for major topics
   - Use bullet points for lists
   - Use numbered steps for procedures

2. Format ALL mathematical formulas and calculations as STANDALONE blocks:
   - Put each formula on its own line
   - Use clear variable definitions before the formula
   - Show calculation steps separately
   - Example format:

     **Formula:**
     Rate = (Total Allowable Costs ÷ Patient Days) × Inflation Factor

     **Where:**
     - Total Allowable Costs = sum of all cost centers
     - Patient Days = annual patient days
     - Inflation Factor = DRI Market Basket Index

3. Break complex information into digestible chunks:
   - No long run-on paragraphs
   - Maximum 3-4 sentences per paragraph
   - Use white space generously
   - Add visual breaks between concepts

4. Make calculations intuitive:
   - Show examples with actual numbers when possible
   - Explain what each component means in plain language
   - Highlight key thresholds or limits

5. Content guidelines:
   - Base answers on the provided policy information
   - If the answer requires more detail than available, suggest enabling "Deep Analysis"
   - Always cite sources by mentioning policy name and category
   - Include source document URLs when relevant

6. Always end with a "## Sources" section listing:
   - Policy category and name
   - Relevant URLs from the policy data

Here are the Medicaid policies for ${state}:

${policiesContext}`;`

    // Call Claude API with extended context for deep analysis
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: deepAnalysis ? 4096 : 2048,
      system: systemPrompt,
      messages: messages
    });

    const assistantMessage = response.content[0].text;

    // Extract sources/citations from the response
    const citations = [];
    stateData.policies.forEach(policy => {
      if (assistantMessage.toLowerCase().includes(policy.policyName.toLowerCase()) ||
          assistantMessage.toLowerCase().includes(policy.category.toLowerCase())) {
        citations.push({
          category: policy.category,
          policyName: policy.policyName,
          sources: policy.sources
        });
      }
    });

    // Add fetched document URLs to citations
    if (fetchedDocuments.length > 0) {
      fetchedDocuments.forEach(doc => {
        if (!citations.find(c => c.sources && c.sources.includes(doc.url))) {
          citations.push({
            category: 'Regulatory Document',
            policyName: 'Full Regulation',
            sources: doc.url
          });
        }
      });
    }

    res.json({
      response: assistantMessage,
      citations: citations.length > 0 ? citations : null,
      state: state,
      deepAnalysis: deepAnalysis,
      documentsFetched: fetchedDocuments.length
    });

  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({
      error: 'Failed to process chat request',
      details: error.message
    });
  }
});

export default router;
