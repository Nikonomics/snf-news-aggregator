# Database Migration Guide

## Step-by-Step Migration to PostgreSQL

### ✅ Completed Steps:

1. ✅ Installed `pg` library (PostgreSQL client)
2. ✅ Created database schema (`server/database/schema.sql`)
3. ✅ Created database connection module (`server/database/db.js`)
4. ✅ Created article database helpers (`server/database/articles.js`)
5. ✅ Created conference database helpers (`server/database/conferences.js`)
6. ✅ Created migration script (`server/database/migrate.js`)

---

## 🚀 What You Need to Do Now:

### Step 1: Create PostgreSQL Database on Render

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `snf-news-db`
   - **Database**: `snf_news_prod`
   - **Region**: Same as your web service
   - **Instance Type**: Free (or paid for better performance)
4. Click **"Create Database"**
5. Wait for it to provision (~2-3 minutes)

### Step 2: Get Database Connection String

1. Once created, click on your database
2. Copy the **"Internal Database URL"** (looks like: `postgresql://user:password@host/dbname`)
3. **Important**: Use "Internal Database URL" (faster, private network)

### Step 3: Add Environment Variable

**Option A: Via Render Dashboard**
1. Go to your web service settings
2. Go to **"Environment"** tab
3. Add new environment variable:
   - **Key**: `DATABASE_URL`
   - **Value**: (paste the Internal Database URL)
4. Click **"Save Changes"**

**Option B: For Local Testing**
Create `.env` file in project root:
```bash
DATABASE_URL=postgresql://localhost:5432/snf_news_dev
```

---

## 🔧 Running the Migration

### Option 1: Local Testing First (Recommended)

1. **Install PostgreSQL locally** (if you haven't):
   ```bash
   # macOS
   brew install postgresql@16
   brew services start postgresql@16

   # Create local database
   createdb snf_news_dev
   ```

2. **Set local DATABASE_URL**:
   ```bash
   export DATABASE_URL=postgresql://localhost:5432/snf_news_dev
   ```

3. **Run migration**:
   ```bash
   node server/database/migrate.js
   ```

4. **Expected output**:
   ```
   🚀 Starting data migration to PostgreSQL...
   ✓ PostgreSQL version: 16.x
   📋 Initializing database schema...
   ✓ Database schema initialized
   📰 Migrating articles from JSON to PostgreSQL...
   Found 810 valid articles to migrate
     ✓ Migrated 50 articles...
     ✓ Migrated 100 articles...
     ...
   ✅ Articles migration complete:
      - Migrated: 810
      - Skipped (duplicates): 0
      - Errors: 0
   📅 Migrating conferences from JSON to PostgreSQL...
   ✅ Conferences migration complete:
      - Migrated: 72
      - Errors: 0
   ✅ Migration complete!
   ```

### Option 2: Migrate Directly to Production

1. **Set DATABASE_URL** to Render's PostgreSQL URL:
   ```bash
   export DATABASE_URL="postgresql://user:password@host/dbname"
   ```

2. **Run migration**:
   ```bash
   node server/database/migrate.js
   ```

---

## 📝 Next Steps After Migration

### Update Server to Use Database

The server code needs to be updated to use the database instead of JSON files. Here's what needs to change:

#### Files to Update:
1. `server/index.js` - Replace JSON file operations with database queries
2. Add database connection on server startup
3. Update API endpoints to use database helpers

---

## 🧪 Testing the Database

### Test Connection
```bash
node -e "require('./server/database/db').testConnection()"
```

### Query Articles Count
```bash
node -e "require('./server/database/db').query('SELECT COUNT(*) FROM articles').then(r => console.log('Articles:', r.rows[0]))"
```

### Query Conferences Count
```bash
node -e "require('./server/database/db').query('SELECT COUNT(*) FROM conferences').then(r => console.log('Conferences:', r.rows[0]))"
```

---

## 🔍 Common Issues & Solutions

### Issue: "Connection refused"
**Solution**: Make sure DATABASE_URL is set correctly and database is running

### Issue: "SSL connection required"
**Solution**: For production, SSL is auto-enabled. For local dev, it's disabled.

### Issue: "Schema already exists"
**Solution**: The migration script drops and recreates tables safely. Safe to re-run.

### Issue: "Out of memory"
**Solution**: The migration processes articles in batches of 50. Should work fine.

---

## 📊 Database Performance

After migration, you should see:
- ✅ Faster article loading (10-20x)
- ✅ Efficient pagination
- ✅ Quick filtered queries
- ✅ No more full-file reads
- ✅ Concurrent access support

---

## 🚨 Important Notes

1. **Backup First**: Your JSON files remain untouched during migration
2. **Safe to Re-run**: Migration script checks for duplicates
3. **Rollback**: If anything goes wrong, just use JSON files again
4. **Production**: Test locally first, then deploy to production

---

## 🎯 What's Next?

After successful migration:
1. Update server code to use database
2. Test all API endpoints
3. Deploy to production
4. Monitor performance
5. (Optional) Remove JSON file dependencies

---

## Need Help?

If you encounter any issues during migration, check:
1. DATABASE_URL is correct
2. Database is running and accessible
3. `pg` package is installed (`npm install pg`)
4. Network connectivity to database

---

## Quick Command Reference

```bash
# Test database connection
node -e "require('./server/database/db').testConnection()"

# Run migration
node server/database/migrate.js

# Check article count
node -e "require('./server/database/db').query('SELECT COUNT(*) FROM articles').then(r => console.log(r.rows[0]))"

# Initialize schema only (no data)
node -e "require('./server/database/db').initializeDatabase()"
```
