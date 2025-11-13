# Cloudflare D1 Database Setup Guide

## Important Note
Cloudflare D1 is **SQLite-based** and is accessed through **Cloudflare Workers**, not traditional connection strings. For local development with Prisma, we use a local SQLite file.

---

## Step 1: Create Cloudflare D1 Database

### Option A: Using Cloudflare Dashboard

1. **Go to Cloudflare Dashboard**
   - Visit: https://dash.cloudflare.com/
   - Log in to your account

2. **Navigate to D1**
   - Click on **"Workers & Pages"** in the sidebar
   - Click on **"D1"** in the submenu
   - Or go directly to: https://dash.cloudflare.com/[your-account-id]/workers/d1

3. **Create Database**
   - Click **"Create database"** button
   - Enter database name: `event-db` (or any name you prefer)
   - Select a location (choose closest to your users)
   - Click **"Create"**

4. **Get Database ID**
   - After creation, you'll see your database listed
   - Click on the database name
   - Copy the **Database ID** (you'll need this for `wrangler.toml`)

### Option B: Using Wrangler CLI

1. **Install Wrangler** (if not installed)
   ```bash
   npm install -g wrangler
   # or
   npx wrangler --version
   ```

2. **Login to Cloudflare**
   ```bash
   npx wrangler login
   ```
   - This will open a browser to authenticate

3. **Create D1 Database**
   ```bash
   npx wrangler d1 create event-db
   ```
   
4. **Output will show:**
   ```
   ✅ Successfully created DB 'event-db'!
   
   [[d1_databases]]
   binding = "DB"
   database_name = "event-db"
   database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   ```

---

## Step 2: Configure for Local Development

### For Prisma (Local SQLite File)

1. **Create `.env` file** in `services/event-service/`:
   ```env
   EVENT_DATABASE_URL="file:./event.db"
   ```

2. **Run Prisma Migrations** (creates local SQLite file):
   ```bash
   cd services/event-service
   npm run prisma:migrate
   ```

3. **This creates `event.db` file** - this is your local SQLite database

---

## Step 3: Setup Wrangler Configuration (For Production)

1. **Create `wrangler.toml`** in `services/event-service/`:
   ```toml
   name = "event-service"
   main = "src/index.ts"
   compatibility_date = "2024-01-01"

   [[d1_databases]]
   binding = "DB"
   database_name = "event-db"
   database_id = "your-database-id-here"  # Replace with your actual database ID
   ```

2. **Replace `database_id`** with the ID from Step 1

---

## Step 4: Deploy Schema to Cloudflare D1

### Using Wrangler CLI

1. **Create migration SQL file** (from Prisma):
   ```bash
   cd services/event-service
   npm run prisma:migrate
   ```

2. **Get the SQL from Prisma migration**:
   - Check `prisma/migrations/[latest]/migration.sql`
   - Copy the SQL content

3. **Apply to Cloudflare D1**:
   ```bash
   npx wrangler d1 execute event-db --file=./prisma/migrations/[latest]/migration.sql
   ```

   Or execute SQL directly:
   ```bash
   npx wrangler d1 execute event-db --command="CREATE TABLE IF NOT EXISTS Event (...)"
   ```

---

## Step 5: Local Development with Wrangler

1. **Start local development server**:
   ```bash
   npx wrangler dev
   ```

2. **This creates local D1 database** at:
   ```
   .wrangler/state/v3/d1/miniflare-D1DatabaseObject/event-db/db.sqlite
   ```

3. **For Prisma, you can use this path**:
   ```env
   EVENT_DATABASE_URL="file:./.wrangler/state/v3/d1/miniflare-D1DatabaseObject/event-db/db.sqlite"
   ```

---

## Important Notes

### ⚠️ Cloudflare D1 Limitations

1. **No Direct Connection String**: D1 doesn't use traditional connection strings like PostgreSQL
2. **Workers Only**: D1 is accessed through Cloudflare Workers runtime
3. **Local Development**: Use local SQLite file for Prisma development
4. **Production**: Deploy as Cloudflare Worker to access D1

### 🔄 Current Setup

- **Local Development**: Uses `file:./event.db` (local SQLite)
- **Production**: Would need to deploy as Cloudflare Worker
- **Prisma**: Works with local SQLite file for development

### 📝 Alternative Approach

If you want to use D1 in production but keep your current Node.js service:

1. **Keep local SQLite** for development
2. **Use Cloudflare D1 HTTP API** (if available) for production
3. **Or deploy event-service as Cloudflare Worker**

---

## Quick Start (Local Development)

```bash
# 1. Create .env file
cd services/event-service
echo 'EVENT_DATABASE_URL="file:./event.db"' > .env

# 2. Run migrations
npm run prisma:migrate

# 3. Start service
npm run dev
```

That's it! You now have a local SQLite database for development.

