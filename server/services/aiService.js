/**
 * Unified AI Service with Anthropic and OpenAI Support
 * Automatic fallback between providers
 */

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { smartTruncate } from '../lib/truncate.js'

class AIService {
  constructor() {
    this.providers = {
      openai: {
        client: null,
        available: false
      },
      anthropic: {
        client: null,
        available: false
      }
    }
    
    // Initialize providers only if API keys are available
    if (process.env.OPENAI_API_KEY) {
      try {
        this.providers.openai.client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        })
        this.providers.openai.available = true
        console.log('✓ OpenAI client initialized')
      } catch (error) {
        console.error('Failed to initialize OpenAI client:', error.message)
      }
    }
    
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        this.providers.anthropic.client = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY
        })
        this.providers.anthropic.available = true
        console.log('✓ Anthropic client initialized')
      } catch (error) {
        console.error('Failed to initialize Anthropic client:', error.message)
      }
    }
    
    this.failedProviders = new Set()
    this.requestCounts = new Map()
    this.lastReset = Date.now()
    
    // Reset counters every hour
    setInterval(() => {
      this.requestCounts.clear()
      this.failedProviders.clear()
      this.lastReset = Date.now()
    }, 60 * 60 * 1000)
  }

  getNativeProvider(model) {
    if (!model) return 'anthropic'
    if (model.startsWith('claude-')) return 'anthropic'
    if (model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3')) return 'openai'
    return 'anthropic'
  }

  getCrossProviderModel(model) {
    const mapping = {
      'claude-haiku-4-5-20251001': 'gpt-4o-mini',
      'claude-sonnet-4-20250514': 'gpt-4o',
      'gpt-4o-mini': 'claude-haiku-4-5-20251001',
      'gpt-4o': 'claude-sonnet-4-20250514'
    }

    return mapping[model] || null
  }

  getProviderForModel(model) {
    if (!model) model = 'claude-haiku-4-5-20251001'

    const nativeProvider = this.getNativeProvider(model)

    if (this.providers[nativeProvider]?.available && !this.failedProviders.has(nativeProvider)) {
      return { provider: nativeProvider, model }
    }

    const altModel = this.getCrossProviderModel(model)
    if (altModel) {
      const altProvider = this.getNativeProvider(altModel)
      if (this.providers[altProvider]?.available && !this.failedProviders.has(altProvider)) {
        console.warn(`⚠️ ${nativeProvider} failed/unavailable for ${model}, falling back to ${altProvider} with ${altModel}`)
        return { provider: altProvider, model: altModel }
      }
    }

    if (this.providers[nativeProvider]?.available) {
      console.warn(`⚠️ Retrying ${nativeProvider} for ${model} despite previous failure`)
      return { provider: nativeProvider, model }
    }

    throw new Error(`No AI providers available for model ${model}`)
  }

  incrementRequestCount(provider) {
    const count = this.requestCounts.get(provider) || 0
    this.requestCounts.set(provider, count + 1)
  }

  getRequestCount(provider) {
    return this.requestCounts.get(provider) || 0
  }

  getStats() {
    return {
      providers: Object.keys(this.providers).map(name => ({
        name,
        available: this.providers[name].available,
        failed: this.failedProviders.has(name),
        requestCount: this.getRequestCount(name)
      })),
      currentProvider: null,
      failedProviders: Array.from(this.failedProviders),
      lastReset: this.lastReset
    }
  }

  /**
   * Phase 0.6 — Truncate article fields before any AI call.
   * Apply to BOTH triage and analysis callers:
   *   const safeArticle = aiService.prepareArticle(article)
   *
   * @param {object} article - article object with title and summary
   * @returns {object} article with title and summary truncated to spec limits
   */
  prepareArticle(article) {
    if (!article) return article
    return {
      ...article,
      summary: smartTruncate(article.summary, 4000),
      title: (article.title || '').substring(0, 500),
    }
  }

  async analyzeContent(prompt, options = {}) {
    // Phase 0.6 — if caller passes article context, truncate before building prompt
    if (options.article) {
      options = { ...options, article: this.prepareArticle(options.article) }
    }

    const maxRetries = 3
    const requestedModel = options.model || 'claude-haiku-4-5-20251001'
    let lastError

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      let routing
      try {
        routing = this.getProviderForModel(requestedModel)
        const result = await this.callProvider(routing.provider, prompt, { ...options, model: routing.model })
        
        this.failedProviders.delete(routing.provider)
        this.incrementRequestCount(routing.provider)
        
        return {
          ...result,
          provider: routing.provider,
          model: routing.model,
          attempt: attempt + 1
        }
      } catch (error) {
        lastError = error
        console.warn(`AI attempt ${attempt + 1} failed (provider: ${routing?.provider}, model: ${routing?.model}):`, error.message)
        
        if (error.status === 429 || error.status === 402 || error.message?.includes('rate limit') || error.message?.includes('quota') || error.message?.includes('billing')) {
          const failedProvider = routing?.provider || this.getNativeProvider(requestedModel)
          this.failedProviders.add(failedProvider)
          console.warn(`🚨 Marked ${failedProvider} as failed (${error.status || 'unknown status'}), next attempt will try failover`)
        }

        if (error.status === 400 && error.message?.includes('model')) {
          throw new Error(`Invalid model ${routing?.model || requestedModel} for provider: ${error.message}`)
        }
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
        }
      }
    }

    throw lastError
  }

  async callProvider(provider, prompt, options) {
    const config = this.providers[provider]
    
    if (!config.available) {
      throw new Error(`Provider ${provider} is not available`)
    }

    switch (provider) {
      case 'anthropic':
        return await this.callAnthropic(prompt, options)
      case 'openai':
        return await this.callOpenAI(prompt, options)
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  }

  async callAnthropic(prompt, options) {
    const response = await this.providers.anthropic.client.messages.create({
      model: options.model,
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.1,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    return {
      content: response.content[0].text,
      usage: response.usage,
      model: response.model
    }
  }

  async callOpenAI(prompt, options) {
    const response = await this.providers.openai.client.chat.completions.create({
      model: options.model,
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.1,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    return {
      content: response.choices[0].message.content,
      usage: response.usage,
      model: response.model
    }
  }
}

export default new AIService()
