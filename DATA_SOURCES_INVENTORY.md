# Data Sources Inventory

## 📊 **Complete Data Source Catalog**

### **1. News & Analysis** 📰

#### **RSS Feeds (9 sources)**
| Source | URL | Status | Update Frequency |
|--------|-----|--------|------------------|
| Skilled Nursing News | https://skillednursingnews.com/feed/ | ✅ Active | Real-time |
| Google News - SNF | https://news.google.com/rss/search?q=skilled+nursing+facilities | ✅ Active | Real-time |
| Google News - Nursing Homes | https://news.google.com/rss/search?q=nursing+homes | ✅ Active | Real-time |
| Google News - Medicare SNF | https://news.google.com/rss/search?q=Medicare+SNF | ✅ Active | Real-time |
| Google News - Long-term Care | https://news.google.com/rss/search?q=long-term+care | ✅ Active | Real-time |
| Google News - CMS News | https://news.google.com/rss/search?q=CMS+nursing+home+news | ✅ Active | Real-time |
| Google News - Post-acute Care | https://news.google.com/rss/search?q=post-acute+care | ✅ Active | Real-time |
| Google News - SNF Staffing | https://news.google.com/rss/search?q=SNF+staffing | ✅ Active | Real-time |
| Google News - SNF Reimbursement | https://news.google.com/rss/search?q=SNF+reimbursement | ✅ Active | Real-time |

**Database Tables**: `articles`, `tags`, `article_tags`, `state_summaries`
**AI Processing**: Article analysis, relevance scoring, categorization, trend analysis

---

### **2. Regulatory & Legislative** 🏛️

#### **Federal Sources**
| Source | API/URL | Status | Data Type | Update Frequency |
|--------|---------|--------|-----------|------------------|
| Congress.gov | https://api.congress.gov/ | ✅ Active | Federal bills | Real-time |
| Federal Register | https://www.federalregister.gov/api/v1/ | ✅ Active | Federal regulations | Daily |

**Database Tables**: `bills`, `federal_regulations`

#### **State Sources**
| Source | Type | Status | Data Type | Processing |
|--------|------|--------|-----------|------------|
| Medicaid Policies | File-based | ✅ Active | State policies | JSON (parsed from Excel) |
| Idaho ALF Regulations | File-based | ✅ Active | State regulations | RAG processing (PDF/TXT) |

**Database Tables**: `medicaid_policies`, `idaho_alf_chunks`

---

### **3. Market & Operations** 🏢

#### **CMS Data Sources**
| Dataset | API Endpoint | Status | Data Type | Update Frequency |
|--------|--------------|--------|-----------|------------------|
| Nursing Home Compare | https://data.cms.gov/provider-data/api/1/datastore/query/4pq5-n9py/0 | ✅ Active | Facility details, ratings | Monthly |
| Deficiencies | https://data.cms.gov/provider-data/api/1/datastore/query/r5ix-sfxw/0 | ✅ Active | Health citations | Monthly |
| Care Compare | https://data.cms.gov/provider-data/api/1/datastore/query/4pq5-n9py/0 | ✅ Active | Quality metrics | Monthly |

**Database Tables**: `facilities`, `deficiencies`, `care_compare_ratings`

---

### **4. Financial & Reimbursement** 💰

#### **Bureau of Labor Statistics**
| Source | API Endpoint | Status | Data Type | Update Frequency |
|--------|--------------|--------|-----------|------------------|
| OEWS Wages | https://api.bls.gov/publicAPI/v2/timeseries/data/ | ✅ Active | RN, LPN, CNA, Manager wages | Annual |

**Database Tables**: `wage_data`

#### **US Census Bureau**
| Source | API Endpoint | Status | Data Type | Update Frequency |
|--------|--------------|--------|-----------|------------------|
| ACS Demographics | https://api.census.gov/data/2021/acs/acs5 | ✅ Active | Population 65+, 85+ | Annual |
| County Demographics | https://api.census.gov/data/2021/acs/acs5 | ✅ Active | County-level data | Annual |

**Database Tables**: `state_demographics`, `county_demographics`

---

## 🔄 **Data Collection Status**

### **Active Collectors**
- ✅ **CMS Facilities Collector** - Collects facility data with pagination
- ✅ **CMS Deficiencies Collector** - State-by-state collection (2GB+ dataset)
- ✅ **CMS Care Compare Collector** - Quality ratings and metrics
- ✅ **Census Demographics Collector** - State-level population data
- ✅ **Census County Collector** - County-level demographics
- ✅ **BLS Wages Collector** - Occupational wage data
- ✅ **Congress Collector** - Federal legislation
- ✅ **Federal Register Collector** - Federal regulations

### **Data Processing**
- ✅ **Article Analysis** - AI-powered content analysis
- ✅ **Medicaid Policy Parsing** - Excel to JSON conversion
- ✅ **Idaho ALF Processing** - PDF/TXT to RAG chunks
- ✅ **Vector Embeddings** - Semantic search capabilities

---

## 📈 **Data Volume Estimates**

| Source | Records | Size | Update Frequency |
|--------|---------|------|------------------|
| Articles | 1,461 | ~50MB | Daily |
| Facilities | ~15,000 | ~100MB | Monthly |
| Deficiencies | ~500,000 | ~2GB | Monthly |
| Demographics | ~3,000 | ~10MB | Annual |
| Wages | ~200 | ~1MB | Annual |
| Bills | ~1,000 | ~5MB | Real-time |
| Regulations | ~500 | ~2MB | Daily |

**Total Database Size**: ~2.2GB

---

## 🚨 **Known Limitations**

### **Rate Limits**
- **Anthropic API**: Rate limited until Nov 1, 2025
- **BLS API**: 500 requests per day
- **Census API**: No rate limits (free tier)
- **CMS API**: No documented rate limits

### **Data Quality Issues**
- **CMS Deficiencies**: Large dataset requires state-by-state processing
- **Census Data**: 2021 data (most recent available)
- **BLS Data**: Annual updates only
- **RSS Feeds**: Some duplicate content across sources

### **Technical Constraints**
- **AI Processing**: Rate limits affect article analysis
- **Storage**: 2GB+ for deficiencies data
- **Processing**: PDF parsing for Idaho ALF regulations
- **API Keys**: Multiple API keys required for full functionality

---

## 🎯 **Missing Data Sources**

### **High Priority**
| Source | Type | Implementation | Priority |
|--------|------|----------------|----------|
| Medicare Cost Reports | File download | CMS Provider of Services | High |
| State Medicaid Rates | Web scraping | State websites | High |
| PDPM Payment Data | API/File | CMS API | High |

### **Medium Priority**
| Source | Type | Implementation | Priority |
|--------|------|----------------|----------|
| Healthcare Automation Tools | Web scraping | Industry websites | Medium |
| Digital Health Trends | RSS/API | Healthcare tech news | Medium |
| Compliance Software | Web scraping | Software directories | Medium |

### **Low Priority**
| Source | Type | Implementation | Priority |
|--------|------|----------------|----------|
| Political Analysis | API | News APIs | Low |
| Innovation Tracking | Web scraping | Tech news | Low |

---

## 📊 **Data Architecture Summary**

### **Database Categories**
1. **News & Analysis** - Articles, tags, analysis results
2. **Regulatory & Legislative** - Bills, regulations, policies
3. **Market & Operations** - Facilities, quality metrics
4. **Financial & Reimbursement** - Demographics, wages, costs

### **Data Flow**
```
External APIs → Collectors → Database → API Endpoints → Frontend
     ↓              ↓           ↓           ↓            ↓
  Rate Limits → Processing → Storage → Business Logic → UI
```

### **Update Schedule**
- **Real-time**: News, bills, regulations
- **Daily**: Article analysis, RSS feeds
- **Monthly**: CMS data, quality metrics
- **Annual**: Demographics, wage data

---

*Last Updated: October 16, 2025*
*Next Review: October 23, 2025*
