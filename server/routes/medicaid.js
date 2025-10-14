import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
    const { state, question, conversationHistory = [] } = req.body;

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

    // Build conversation messages
    const messages = [
      ...conversationHistory,
      {
        role: 'user',
        content: question
      }
    ];

    // System prompt for Claude
    const systemPrompt = `You are a knowledgeable assistant specializing in Medicaid Fee-for-Service Nursing Facility Payment Policies for ${state}.

Your task is to answer questions about ${state}'s Medicaid policies using ONLY the provided policy data.

IMPORTANT GUIDELINES:
1. Base your answers ONLY on the provided policy information
2. If the answer isn't in the provided data, say "I don't have information about that in the ${state} policies provided"
3. Always cite your sources by mentioning the policy name and category
4. Be specific and accurate
5. If a policy has detailed source language, reference it
6. Format your response clearly with proper sections
7. At the end of your response, include a "Sources" section listing the specific policies you referenced

Here are the Medicaid policies for ${state}:

${policiesContext}`;

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
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

    res.json({
      response: assistantMessage,
      citations: citations.length > 0 ? citations : null,
      state: state
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
