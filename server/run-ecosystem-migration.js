import 'dotenv/config';
import * as db from './database/db.js';
import { readFileSync } from 'fs';

async function runMigration() {
  try {
    const migrationFile = process.argv[2] || './database/migrations/003_add_ecosystem_fields.sql';
    console.log(`Running migration: ${migrationFile}\n`);

    const sql = readFileSync(migrationFile, 'utf8');

    await db.query(sql);

    console.log('✅ Migration completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
