#!/usr/bin/env node

/**
 * Migration script to move data from JSON files to PostgreSQL
 * Run with: node server/database/migrate.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import * as db from './db.js'
import * as articlesDb from './articles.js'
import * as conferencesDb from './conferences.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function migrateArticles() {
  console.log('\n📰 Migrating articles from JSON to PostgreSQL...')

  try {
    const articlesPath = path.join(__dirname, '../data/analyzed-articles.json')

    if (!fs.existsSync(articlesPath)) {
      console.log('⚠️  No analyzed-articles.json file found')
      return 0
    }

    const articlesData = JSON.parse(fs.readFileSync(articlesPath, 'utf8'))

    // Filter out null values
    const validArticles = articlesData.filter(article => article !== null && article.title)

    console.log(`Found ${validArticles.length} valid articles to migrate`)

    let migrated = 0
    let skipped = 0
    let errors = 0

    for (const article of validArticles) {
      try {
        // Check if article already exists
        const exists = await articlesDb.articleExists(article.url)

        if (exists) {
          skipped++
          continue
        }

        // Insert article
        const articleId = await articlesDb.insertArticle(article)

        // Insert tags if they exist
        if (article.tags && article.tags.length > 0) {
          await articlesDb.insertArticleTags(articleId, article.tags)
        }

        migrated++

        if (migrated % 50 === 0) {
          console.log(`  ✓ Migrated ${migrated} articles...`)
        }
      } catch (error) {
        errors++
        console.error(`  ❌ Error migrating article "${article.title}":`, error.message)
      }
    }

    console.log(`\n✅ Articles migration complete:`)
    console.log(`   - Migrated: ${migrated}`)
    console.log(`   - Skipped (duplicates): ${skipped}`)
    console.log(`   - Errors: ${errors}`)

    return migrated
  } catch (error) {
    console.error('❌ Error migrating articles:', error)
    return 0
  }
}

async function migrateConferences() {
  console.log('\n📅 Migrating conferences from JSON to PostgreSQL...')

  try {
    const conferencesPath = path.join(__dirname, '../data/conferences.json')

    if (!fs.existsSync(conferencesPath)) {
      console.log('⚠️  No conferences.json file found')
      return 0
    }

    const conferencesData = JSON.parse(fs.readFileSync(conferencesPath, 'utf8'))

    let migrated = 0
    let errors = 0

    // Migrate state conferences
    if (conferencesData.stateConferences) {
      for (const conference of conferencesData.stateConferences) {
        try {
          await conferencesDb.insertConference(conference)
          migrated++
        } catch (error) {
          errors++
          console.error(`  ❌ Error migrating state conference:`, error.message)
        }
      }
    }

    // Migrate national conferences
    if (conferencesData.nationalConferences) {
      for (const conference of conferencesData.nationalConferences) {
        try {
          await conferencesDb.insertConference(conference)
          migrated++
        } catch (error) {
          errors++
          console.error(`  ❌ Error migrating national conference:`, error.message)
        }
      }
    }

    console.log(`\n✅ Conferences migration complete:`)
    console.log(`   - Migrated: ${migrated}`)
    console.log(`   - Errors: ${errors}`)

    return migrated
  } catch (error) {
    console.error('❌ Error migrating conferences:', error)
    return 0
  }
}

async function runMigration() {
  console.log('🚀 Starting data migration to PostgreSQL...\n')

  try {
    // Test database connection
    const connected = await db.testConnection()
    if (!connected) {
      console.error('❌ Database connection failed. Please check your DATABASE_URL environment variable.')
      process.exit(1)
    }

    // Initialize database schema
    console.log('\n📋 Initializing database schema...')
    const initialized = await db.initializeDatabase()
    if (!initialized) {
      console.error('❌ Database initialization failed')
      process.exit(1)
    }

    // Migrate articles
    const articlesMigrated = await migrateArticles()

    // Migrate conferences
    const conferencesMigrated = await migrateConferences()

    console.log('\n✅ Migration complete!')
    console.log(`   Total articles: ${articlesMigrated}`)
    console.log(`   Total conferences: ${conferencesMigrated}`)

    // Close database connection
    await db.closePool()
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    await db.closePool()
    process.exit(1)
  }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
}

export { migrateArticles, migrateConferences, runMigration }
