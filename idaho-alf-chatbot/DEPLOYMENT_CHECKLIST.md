# Idaho ALF Chatbot - Knowledge Base Update Deployment Checklist

## ✅ Completed Steps

- [x] Added 6 new regulation documents to `/data/raw/`
- [x] Processed 158 new chunks from the documents
- [x] Generated embeddings for all new chunks
- [x] Merged with existing knowledge base (225 total chunks)
- [x] Tested locally - all working correctly

## 📋 Pre-Deployment Checklist

### 1. Verify Files
```bash
# Check the updated knowledge base file
ls -lh data/processed/chunks_with_embeddings.json
# Should be ~13MB with 225 chunks
```

### 2. Test Locally (Already Done ✓)
```bash
cd backend
export $(cat .env | grep -v '^#' | xargs)
python3 test_updated_kb.py
```

### 3. Commit Changes
```bash
cd /Users/nikolashulewsky/snf-news-aggregator/idaho-alf-chatbot
git add data/processed/chunks_with_embeddings.json
git add data/raw/*.txt
git commit -m "Expand knowledge base: Add 158 chunks from 6 additional IDAPA regulations"
git push
```

## 🚀 Deployment Options

### Option A: Automatic Deployment (Recommended)
If your Render service is connected to GitHub:
1. Push changes to GitHub
2. Render will automatically detect and deploy
3. Monitor deployment in Render dashboard

### Option B: Manual Deployment
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your `alf-chatbot` service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait for deployment to complete (~5-10 minutes)

### Option C: Force Rebuild
If automatic deployment doesn't trigger:
1. Go to Render Dashboard
2. Select your service
3. Click "Settings" → "Clear build cache"
4. Click "Manual Deploy" → "Deploy latest commit"

## 🔍 Post-Deployment Verification

### 1. Check Health Endpoint
```bash
curl https://alf-chatbot.onrender.com/health
```
Expected response:
```json
{
  "status": "healthy",
  "message": "RAG engine is running",
  "chunks_loaded": 225
}
```

### 2. Test Query Endpoint
```bash
curl -X POST https://alf-chatbot.onrender.com/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the reportable diseases in Idaho?",
    "top_k": 3,
    "temperature": 0.3
  }'
```

### 3. Test in Frontend
1. Go to your SNF News Aggregator app
2. Navigate to the Idaho ALF Chatbot
3. Ask: "What are the food safety requirements?"
4. Verify it pulls from the new IDAPA 16.02.19 (food code)

## 📊 Knowledge Base Summary

### New Documents Added
1. **IDAPA 16.02.1** - Idaho reportable diseases (32 chunks)
2. **IDAPA 16.02.19** - Food code (32 chunks)
3. **IDAPA 16.05.01** - Use and disclosure of department records (32 chunks)
4. **IDAPA 16.05.06** - Criminal history background checks (22 chunks)
5. **IDAPA 24.34.01** - Idaho board of nursing (8 chunks)
6. **IDAPA 24.39.30** - Rules of building safety (32 chunks)

### Statistics
- **Total Chunks**: 225 (up from 67)
- **File Size**: 13MB (up from 4.2MB)
- **New Chunks**: 158
- **Increase**: 236%

### Categories Covered
- Policies: 32 chunks
- Infection Control: 22 chunks
- Licensing: 25 chunks
- Physical Plant: 15 chunks
- Administrative: 20 chunks
- Admission/Discharge: 12 chunks
- Variances: 11 chunks
- Dietary: 6 chunks
- Records: 6 chunks
- Medications: 4 chunks
- Service Agreements: 4 chunks
- Staffing: 1 chunk

## 🐛 Troubleshooting

### Issue: Health check shows old chunk count
**Solution**: Clear Render cache and redeploy

### Issue: New regulations not appearing in responses
**Solution**: Check if chunks_with_embeddings.json was properly committed and deployed

### Issue: API errors after deployment
**Solution**: Check Render logs for errors, verify environment variables are set

### Issue: Slow response times
**Solution**: This is normal with 225 chunks. Consider implementing caching or increasing Render plan

## 📝 Notes

- The new knowledge base includes cross-referenced regulations from IDAPA 16 and IDAPA 24
- All chunks have been embedded using OpenAI's text-embedding-3-small model
- The RAG engine will automatically use the new chunks when relevant
- No frontend changes are required - the chatbot will automatically use the updated knowledge base

## ✅ Deployment Complete Checklist

- [ ] Changes committed to Git
- [ ] Changes pushed to GitHub
- [ ] Render deployment triggered
- [ ] Deployment completed successfully
- [ ] Health endpoint shows 225 chunks
- [ ] Test query returns expected results
- [ ] Frontend chatbot working with new data
- [ ] Document deployment in project tracker

---

**Last Updated**: October 17, 2025
**Deployed By**: [Your Name]
**Deployment Time**: [Time of deployment]

