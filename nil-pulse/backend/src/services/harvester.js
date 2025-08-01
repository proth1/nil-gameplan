import axios from 'axios'
import cheerio from 'cheerio'
import RSSParser from 'rss-parser'
import puppeteer from 'puppeteer'
import cron from 'node-cron'
import natural from 'natural'
import { supabase } from '../server.js'
import { logger } from '../utils/logger.js'

class NILContentHarvester {
  constructor() {
    this.rssParser = new RSSParser()
    this.browser = null
    this.isRunning = false
    this.harvesterStats = {
      totalSourcesProcessed: 0,
      totalContentHarvested: 0,
      totalDuplicatesSkipped: 0,
      totalErrors: 0,
      lastRunTime: null,
      averageProcessingTime: 0
    }

    // Initialize sentiment analyzer
    this.sentimentAnalyzer = new natural.SentimentAnalyzer('English', 
      natural.PorterStemmer, ['negation'])
    this.tokenizer = new natural.WordTokenizer()
  }

  /**
   * Initialize the harvester and start scheduled runs
   */
  async initialize() {
    logger.info('Initializing NIL Content Harvester...')
    
    try {
      // Initialize Puppeteer browser
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1920,1080'
        ]
      })

      // Schedule harvesting runs
      this.scheduleHarvesting()
      
      logger.info('NIL Content Harvester initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize harvester:', error)
      throw error
    }
  }

  /**
   * Schedule regular harvesting runs
   */
  scheduleHarvesting() {
    // Run every 15 minutes for high-frequency sources
    cron.schedule('*/15 * * * *', async () => {
      if (!this.isRunning) {
        await this.runHarvestCycle('high')
      }
    })

    // Run every hour for medium-frequency sources
    cron.schedule('0 * * * *', async () => {
      if (!this.isRunning) {
        await this.runHarvestCycle('medium')
      }
    })

    // Run every 6 hours for low-frequency sources
    cron.schedule('0 */6 * * *', async () => {
      if (!this.isRunning) {
        await this.runHarvestCycle('low')
      }
    })

    logger.info('Harvesting schedule configured')
  }

  /**
   * Run a complete harvest cycle
   */
  async runHarvestCycle(frequency) {
    if (this.isRunning) {
      logger.warn('Harvest cycle already running, skipping...')
      return
    }

    this.isRunning = true
    const startTime = Date.now()
    
    logger.info(`Starting ${frequency} frequency harvest cycle`)

    try {
      // Get active sources for this frequency
      const sources = await this.getActiveSources(frequency)
      logger.info(`Found ${sources.length} sources to process`)

      const results = {
        processed: 0,
        harvested: 0,
        duplicates: 0,
        errors: 0
      }

      // Process sources in parallel (but limit concurrency)
      const BATCH_SIZE = 5
      for (let i = 0; i < sources.length; i += BATCH_SIZE) {
        const batch = sources.slice(i, i + BATCH_SIZE)
        const batchPromises = batch.map(source => 
          this.harvestSource(source).catch(error => {
            logger.error(`Error harvesting source ${source.id}:`, error)
            results.errors++
            return { harvested: 0, duplicates: 0 }
          })
        )

        const batchResults = await Promise.all(batchPromises)
        
        batchResults.forEach(result => {
          if (result) {
            results.harvested += result.harvested || 0
            results.duplicates += result.duplicates || 0
          }
        })
        
        results.processed += batch.length

        // Small delay between batches to be respectful
        if (i + BATCH_SIZE < sources.length) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }

      const duration = Date.now() - startTime
      
      // Update statistics
      this.harvesterStats = {
        ...this.harvesterStats,
        totalSourcesProcessed: this.harvesterStats.totalSourcesProcessed + results.processed,
        totalContentHarvested: this.harvesterStats.totalContentHarvested + results.harvested,
        totalDuplicatesSkipped: this.harvesterStats.totalDuplicatesSkipped + results.duplicates,
        totalErrors: this.harvesterStats.totalErrors + results.errors,
        lastRunTime: new Date().toISOString(),
        averageProcessingTime: duration
      }

      logger.info(`Harvest cycle completed in ${duration}ms`, {
        frequency,
        ...results,
        duration
      })

    } catch (error) {
      logger.error('Harvest cycle failed:', error)
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Get active sources based on frequency
   */
  async getActiveSources(frequency) {
    const frequencyFilters = {
      high: 900, // 15 minutes
      medium: 3600, // 1 hour  
      low: 21600 // 6 hours
    }

    const { data: sources, error } = await supabase
      .from('nil_sources')
      .select('*')
      .eq('is_active', true)
      .lte('update_frequency', frequencyFilters[frequency])
      .or(
        `last_harvested.is.null,last_harvested.lt.${
          new Date(Date.now() - frequencyFilters[frequency] * 1000).toISOString()
        }`
      )

    if (error) {
      logger.error('Failed to get sources:', error)
      return []
    }

    return sources || []
  }

  /**
   * Harvest content from a single source
   */
  async harvestSource(source) {
    logger.info(`Harvesting source: ${source.name} (${source.source_type})`)
    
    const startTime = Date.now()
    let harvested = 0
    let duplicates = 0

    try {
      let rawContent = []

      switch (source.source_type) {
        case 'rss':
          rawContent = await this.harvestRSS(source)
          break
        case 'web':
          rawContent = await this.harvestWebPage(source)
          break
        case 'api':
          rawContent = await this.harvestAPI(source)
          break
        default:
          logger.warn(`Unsupported source type: ${source.source_type}`)
          return { harvested: 0, duplicates: 0 }
      }

      // Process and store content
      for (const content of rawContent) {
        try {
          const isDuplicate = await this.checkForDuplicate(content.contentHash)
          
          if (isDuplicate) {
            duplicates++
            continue
          }

          await this.storeRawContent(source, content)
          
          // Process content immediately for high-priority sources
          if (source.reliability_score >= 80) {
            await this.processContent(content, source)
          }
          
          harvested++
        } catch (error) {
          logger.error(`Error processing content item:`, error)
        }
      }

      // Update source last_harvested timestamp
      await supabase
        .from('nil_sources')
        .update({ last_harvested: new Date().toISOString() })
        .eq('id', source.id)

      const duration = Date.now() - startTime
      logger.info(`Source harvested successfully`, {
        source: source.name,
        harvested,
        duplicates,
        duration: `${duration}ms`
      })

      return { harvested, duplicates }

    } catch (error) {
      logger.error(`Failed to harvest source ${source.name}:`, error)
      throw error
    }
  }

  /**
   * Harvest RSS feed
   */
  async harvestRSS(source) {
    const feed = await this.rssParser.parseURL(source.url)
    const rawContent = []

    for (const item of feed.items) {
      if (this.isNILRelated(item.title + ' ' + (item.contentSnippet || ''))) {
        rawContent.push({
          title: item.title,
          content: item.content || item.contentSnippet || '',
          author: item.creator || item.author,
          url: item.link,
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          contentHash: this.generateContentHash(item.link, item.title)
        })
      }
    }

    return rawContent
  }

  /**
   * Harvest web page using Puppeteer
   */
  async harvestWebPage(source) {
    const page = await this.browser.newPage()
    const rawContent = []

    try {
      await page.goto(source.url, { waitUntil: 'networkidle2', timeout: 30000 })
      
      // Extract content based on source configuration
      const config = source.harvest_config || {}
      const articles = await page.evaluate((config) => {
        const results = []
        const selector = config.articleSelector || 'article, .post, .news-item'
        const elements = document.querySelectorAll(selector)
        
        elements.forEach((element, index) => {
          if (index >= 50) return // Limit to 50 articles per page
          
          const titleEl = element.querySelector(config.titleSelector || 'h1, h2, h3, .title')
          const contentEl = element.querySelector(config.contentSelector || '.content, .body, p')
          const linkEl = element.querySelector(config.linkSelector || 'a[href]')
          const authorEl = element.querySelector(config.authorSelector || '.author, .byline')

          const title = titleEl?.textContent?.trim()
          const content = contentEl?.textContent?.trim()
          const url = linkEl?.href
          const author = authorEl?.textContent?.trim()

          if (title && content && url) {
            results.push({ title, content, url, author })
          }
        })
        
        return results
      }, config)

      for (const article of articles) {
        if (this.isNILRelated(article.title + ' ' + article.content.substring(0, 500))) {
          rawContent.push({
            ...article,
            publishedAt: new Date(),
            contentHash: this.generateContentHash(article.url, article.title)
          })
        }
      }

    } finally {
      await page.close()
    }

    return rawContent
  }

  /**
   * Harvest from API endpoint
   */
  async harvestAPI(source) {
    const config = source.harvest_config || {}
    const headers = {
      'User-Agent': 'NIL-Pulse-Harvester/1.0',
      ...config.headers
    }

    const response = await axios.get(source.url, { 
      headers,
      timeout: 30000,
      params: config.params
    })

    const rawContent = []
    const data = response.data

    // Handle different API response formats
    const items = Array.isArray(data) ? data : 
                  data.items || data.results || data.articles || []

    for (const item of items.slice(0, 100)) { // Limit to 100 items
      const title = item.title || item.headline || item.name
      const content = item.content || item.description || item.summary || item.body
      const url = item.url || item.link || item.permalink
      const author = item.author || item.byline || item.source
      const publishedAt = item.published_at || item.date || item.created_at

      if (title && content && url && this.isNILRelated(title + ' ' + content)) {
        rawContent.push({
          title,
          content,
          url,
          author,
          publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
          contentHash: this.generateContentHash(url, title)
        })
      }
    }

    return rawContent
  }

  /**
   * Check if content is NIL-related using keyword matching
   */
  isNILRelated(text) {
    const nilKeywords = [
      'nil', 'name image likeness', 'name, image, likeness',
      'endorsement deal', 'nil deal', 'collective',
      'ncaa', 'college athlete', 'student athlete',
      'nil policy', 'nil law', 'nil legislation',
      'nil compliance', 'nil rules'
    ]

    const lowerText = text.toLowerCase()
    return nilKeywords.some(keyword => lowerText.includes(keyword))
  }

  /**
   * Generate content hash for deduplication
   */
  generateContentHash(url, title) {
    const crypto = require('crypto')
    return crypto.createHash('md5').update(url + title).digest('hex')
  }

  /**
   * Check for duplicate content
   */
  async checkForDuplicate(contentHash) {
    const { data } = await supabase
      .from('nil_content_raw')
      .select('id')
      .eq('content_hash', contentHash)
      .limit(1)
      .single()

    return !!data
  }

  /**
   * Store raw content in database
   */
  async storeRawContent(source, content) {
    const { error } = await supabase
      .from('nil_content_raw')
      .insert({
        source_id: source.id,
        url: content.url,
        title: content.title,
        content: content.content,
        author: content.author,
        published_at: content.publishedAt.toISOString(),
        content_hash: content.contentHash,
        metadata: {
          harvested_at: new Date().toISOString(),
          source_type: source.source_type
        }
      })

    if (error) {
      logger.error('Failed to store raw content:', error)
      throw error
    }
  }

  /**
   * Process raw content into structured NIL content
   */
  async processContent(rawContent, source) {
    try {
      // Extract entities and analyze content
      const entities = this.extractEntities(rawContent.content)
      const sentiment = this.analyzeSentiment(rawContent.content)
      const importance = this.calculateImportance(rawContent, source)
      const category = this.categorizeContent(rawContent.content)
      
      // Extract deal information if present
      const dealInfo = this.extractDealInfo(rawContent.content)
      
      // Extract mentioned states
      const states = this.extractStates(rawContent.content)

      const processedContent = {
        title: rawContent.title,
        summary: this.generateSummary(rawContent.content),
        content: rawContent.content,
        author: rawContent.author,
        url: rawContent.url,
        published_at: rawContent.publishedAt,
        source_id: source.id,
        
        primary_category: category.primary,
        secondary_categories: category.secondary,
        
        states_mentioned: states,
        entities_mentioned: entities,
        
        sentiment_score: sentiment,
        importance_score: importance,
        trend_velocity: 0, // Will be calculated by trend analysis
        
        tags: this.extractTags(rawContent.content),
        
        // Deal-specific fields
        ...dealInfo
      }

      const { error } = await supabase
        .from('nil_content')
        .insert(processedContent)

      if (error) {
        logger.error('Failed to store processed content:', error)
        throw error
      }

      logger.info('Content processed and stored successfully', {
        title: rawContent.title,
        category: category.primary,
        importance
      })

    } catch (error) {
      logger.error('Failed to process content:', error)
      throw error
    }
  }

  /**
   * Extract entities from content
   */
  extractEntities(content) {
    const entities = []
    
    // Simple entity extraction - in production, use more sophisticated NLP
    const athletePattern = /(?:athlete|player)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/gi
    const schoolPattern = /(?:University of|College of|State University|\w+\s+University|\w+\s+College)\s+([A-Z][a-z]+)/gi
    const brandPattern = /(?:sponsored by|endorsement with|deal with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi

    let match
    while ((match = athletePattern.exec(content)) !== null) {
      entities.push({ name: match[1], type: 'athlete', confidence: 0.8 })
    }
    
    while ((match = schoolPattern.exec(content)) !== null) {
      entities.push({ name: match[0], type: 'school', confidence: 0.7 })
    }
    
    while ((match = brandPattern.exec(content)) !== null) {
      entities.push({ name: match[1], type: 'brand', confidence: 0.9 })
    }

    return entities
  }

  /**
   * Analyze sentiment of content
   */
  analyzeSentiment(content) {
    const tokens = this.tokenizer.tokenize(content.toLowerCase())
    const score = this.sentimentAnalyzer.getSentiment(tokens)
    
    // Normalize to -1 to 1 range
    return Math.max(-1, Math.min(1, score))
  }

  /**
   * Calculate importance score
   */
  calculateImportance(content, source) {
    let score = source.reliability_score || 50

    // Boost score for certain keywords
    const highImportanceKeywords = ['legislation', 'lawsuit', 'ncaa', 'policy', 'rule']
    const mediumImportanceKeywords = ['deal', 'endorsement', 'collective', 'compliance']
    
    const lowerContent = content.content.toLowerCase()
    
    highImportanceKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) score += 15
    })
    
    mediumImportanceKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) score += 10
    })

    // Cap at 100
    return Math.min(100, score)
  }

  /**
   * Categorize content
   */
  categorizeContent(content) {
    const lowerContent = content.toLowerCase()
    
    const categories = {
      legislation: ['law', 'bill', 'legislation', 'statute', 'regulation'],
      litigation: ['lawsuit', 'court', 'legal action', 'judge', 'ruling'],
      enforcement: ['violation', 'penalty', 'sanction', 'investigation'],
      deals: ['deal', 'endorsement', 'partnership', 'sponsorship'],
      collectives: ['collective', 'nil collective', 'booster'],
      high_school: ['high school', 'prep', 'secondary'],
      womens_sports: ['women\'s', 'female athlete', 'womens'],
      policy: ['policy', 'guideline', 'rule', 'standard'],
      compliance: ['compliance', 'violation', 'requirement'],
      market_analysis: ['market', 'valuation', 'worth', 'revenue']
    }

    let primary = 'market_analysis' // default
    const secondary = []

    for (const [category, keywords] of Object.entries(categories)) {
      const matches = keywords.filter(keyword => lowerContent.includes(keyword)).length
      if (matches > 0) {
        if (matches >= 2 || category === 'legislation' || category === 'deals') {
          primary = category
        } else {
          secondary.push(category)
        }
      }
    }

    return { primary, secondary }
  }

  /**
   * Extract deal information
   */
  extractDealInfo(content) {
    const dealInfo = {}
    
    // Extract deal value
    const valuePattern = /\$?([\d,]+(?:\.\d+)?)\s*(?:million|k|thousand)?/gi
    const valueMatch = valuePattern.exec(content)
    if (valueMatch) {
      let value = parseFloat(valueMatch[1].replace(/,/g, ''))
      if (content.toLowerCase().includes('million')) value *= 1000000
      if (content.toLowerCase().includes('k') || content.toLowerCase().includes('thousand')) value *= 1000
      dealInfo.deal_value = value
    }

    // Extract athlete name (simple pattern)
    const athletePattern = /athlete\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i
    const athleteMatch = athletePattern.exec(content)
    if (athleteMatch) {
      dealInfo.athlete_name = athleteMatch[1]
    }

    // Extract sport
    const sports = ['football', 'basketball', 'baseball', 'soccer', 'tennis', 'golf', 'track', 'swimming']
    for (const sport of sports) {
      if (content.toLowerCase().includes(sport)) {
        dealInfo.sport = sport
        break
      }
    }

    return dealInfo
  }

  /**
   * Extract mentioned states
   */
  extractStates(content) {
    const stateAbbreviations = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS',
      'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY',
      'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ]

    const mentioned = []
    const upperContent = content.toUpperCase()
    
    for (const state of stateAbbreviations) {
      if (upperContent.includes(state)) {
        mentioned.push(state)
      }
    }

    return mentioned
  }

  /**
   * Generate content summary
   */
  generateSummary(content) {
    // Simple extractive summarization - take first 2 sentences
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10)
    return sentences.slice(0, 2).join('. ') + '.'
  }

  /**
   * Extract tags from content
   */
  extractTags(content) {
    const commonTags = [
      'ncaa', 'nil', 'endorsement', 'collective', 'compliance', 'legislation', 
      'deal', 'athlete', 'university', 'college', 'sports', 'policy'
    ]

    const lowerContent = content.toLowerCase()
    return commonTags.filter(tag => lowerContent.includes(tag))
  }

  /**
   * Get harvester statistics
   */
  getStats() {
    return this.harvesterStats
  }

  /**
   * Shutdown the harvester
   */
  async shutdown() {
    logger.info('Shutting down NIL Content Harvester...')
    
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
    
    this.isRunning = false
    logger.info('NIL Content Harvester shut down successfully')
  }
}

// Create and export singleton instance
export const harvester = new NILContentHarvester()

// Initialize harvester when module loads
if (process.env.NODE_ENV !== 'test') {
  harvester.initialize().catch(error => {
    logger.error('Failed to initialize harvester:', error)
    process.exit(1)
  })
}

export default harvester