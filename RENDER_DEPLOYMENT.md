# Render Deployment Guide

This guide will help you deploy the SNF News Aggregator to Render so it runs completely on their servers without any local dependencies.

## Architecture

- **Frontend**: Static Site (Vite + React)
- **Backend**: Web Service (Node.js + Express)
- **Database**: PostgreSQL (already on Render)

---

## Step 1: Deploy Backend Server

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **Web Service**
3. Connect your GitHub repository: `Nikonomics/snf-news-aggregator`
4. Configure the service:

   **Basic Settings:**
   - **Name**: `snf-news-aggregator-backend`
   - **Region**: Oregon (closest to your database)
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: Node

   **Build & Deploy:**
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`

   **Environment Variables** (Add these in the Render dashboard):
   ```
   DATABASE_URL=postgres://... (your existing Render PostgreSQL URL)
   OPENAI_API_KEY=sk-... (your OpenAI API key)
   ANTHROPIC_API_KEY=sk-ant-... (your Anthropic API key)
   NODE_ENV=production
   ```

5. Click **Create Web Service**
6. Wait for deployment (2-3 minutes)
7. **Copy the service URL** (e.g., `https://snf-news-aggregator-backend.onrender.com`)

---

## Step 2: Deploy Frontend

1. In Render Dashboard, click **New** → **Static Site**
2. Connect your GitHub repository: `Nikonomics/snf-news-aggregator`
3. Configure the service:

   **Basic Settings:**
   - **Name**: `snf-news-aggregator-frontend`
   - **Branch**: `main`
   - **Root Directory**: (leave blank)

   **Build & Deploy:**
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

   **Environment Variables** (Add these in the Render dashboard):
   ```
   VITE_API_URL=https://snf-news-aggregator-backend.onrender.com
   ```

4. Click **Create Static Site**
5. Wait for deployment (2-3 minutes)
6. **Copy the site URL** (e.g., `https://snf-news-aggregator-frontend.onrender.com`)

---

## Step 3: Update Backend CORS Settings

After deploying, you need to update the backend to allow requests from your frontend URL.

1. Go to your backend service in Render
2. Add this environment variable:
   ```
   CORS_ORIGIN=https://snf-news-aggregator-frontend.onrender.com
   ```
3. Redeploy the backend

---

## Step 4: Test the Deployment

1. Visit your frontend URL: `https://snf-news-aggregator-frontend.onrender.com`
2. Test all features:
   - ✅ Task Grid View (should work immediately)
   - ✅ Team Dashboard (should work immediately)
   - ✅ Cluster Dashboard (should load data from Render backend)

---

## Troubleshooting

### Backend won't start
- Check the logs in Render dashboard
- Verify all environment variables are set
- Make sure `DATABASE_URL` is correct

### Frontend can't connect to backend
- Verify `VITE_API_URL` is set to your backend URL
- Check CORS settings in backend
- Look at browser console for errors

### Cluster Dashboard shows "Loading..." forever
- Check if backend is running (visit backend URL directly)
- Verify `VITE_API_URL` environment variable is set
- Check browser console for API errors

---

## Local Development

To run locally:
1. Copy `.env.example` to `.env` in the root directory
2. Set `VITE_API_URL=http://localhost:3001`
3. Start backend: `npm run server`
4. Start frontend: `npm run dev`
5. Visit `http://localhost:5174`

---

## Cost

- **Free Tier**: 
  - Static Site: Free forever
  - Web Service: Free for 90 days, then $7/month
  - PostgreSQL: Already on your account

- **Paid Tier**: 
  - Static Site: Free forever
  - Web Service: $7/month (no sleep, better performance)
  - PostgreSQL: Already on your account

---

## Next Steps

Once deployed, you can:
- Share the frontend URL with your team
- Access from any device without running local server
- Update code and Render will auto-deploy
- Monitor logs in Render dashboard

