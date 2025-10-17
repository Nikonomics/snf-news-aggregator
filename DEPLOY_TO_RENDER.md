# 🚀 Quick Deploy to Render

Follow these steps to deploy your project management tool to Render:

## 📋 Prerequisites

- ✅ GitHub repo is connected to Render
- ✅ PostgreSQL database is already on Render
- ✅ You have your API keys ready

---

## Step 1: Deploy Backend (5 minutes)

1. **Go to Render Dashboard**: https://dashboard.render.com/
2. **Click**: New → Web Service
3. **Connect**: Your GitHub repo `Nikonomics/snf-news-aggregator`
4. **Configure**:
   ```
   Name: snf-news-aggregator-backend
   Region: Oregon
   Branch: main
   Root Directory: server
   Build Command: npm install
   Start Command: node index.js
   ```
5. **Add Environment Variables**:
   ```
   DATABASE_URL = [your existing Render PostgreSQL URL]
   OPENAI_API_KEY = [your OpenAI key]
   ANTHROPIC_API_KEY = [your Anthropic key]
   NODE_ENV = production
   ```
6. **Create** and wait 2-3 minutes
7. **Copy the URL**: `https://snf-news-aggregator-backend.onrender.com`

---

## Step 2: Deploy Frontend (3 minutes)

1. **In Render Dashboard**: New → Static Site
2. **Connect**: Same GitHub repo
3. **Configure**:
   ```
   Name: snf-news-aggregator-frontend
   Branch: main
   Build Command: npm install && npm run build
   Publish Directory: dist
   ```
4. **Add Environment Variable**:
   ```
   VITE_API_URL = https://snf-news-aggregator-backend.onrender.com
   ```
   (Use the backend URL you copied in Step 1)
5. **Create** and wait 2-3 minutes
6. **Done!** Your app is live at: `https://snf-news-aggregator-frontend.onrender.com`

---

## Step 3: Enable CORS (1 minute)

1. **Go to Backend Service** in Render
2. **Add Environment Variable**:
   ```
   CORS_ORIGIN = https://snf-news-aggregator-frontend.onrender.com
   ```
   (Use the frontend URL from Step 2)
3. **Manual Deploy** → Deploy latest commit

---

## ✅ Test Your Deployment

Visit your frontend URL and test:
- ✅ Task Grid View
- ✅ Team Dashboard  
- ✅ Cluster Dashboard (should load from Render backend)

---

## 🎉 You're Done!

Your project management tool is now:
- ✅ Running 24/7 on Render
- ✅ Accessible from anywhere
- ✅ No local server needed
- ✅ Auto-deploys on every push

---

## 💡 Pro Tips

- **Free tier**: Backend sleeps after 15 min of inactivity (takes 30 sec to wake up)
- **Paid tier** ($7/month): Backend stays awake, faster response times
- **Monitor**: Check logs in Render dashboard if anything breaks
- **Update**: Just push to GitHub, Render auto-deploys

---

## 🆘 Need Help?

Check `RENDER_DEPLOYMENT.md` for detailed troubleshooting.

