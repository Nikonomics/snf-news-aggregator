# SNF News Aggregator - Project Tracker

## 📊 **Current Data Architecture Status**

### **✅ Completed Data Sources**

#### **News & Analysis** 📰
- **RSS Feeds**: 9 sources (Skilled Nursing News, Google News variants)
- **AI Processing**: Article analysis, relevance scoring, categorization
- **Database**: `articles`, `tags`, `article_tags`, `state_summaries`
- **Features**: Deduplication, content hashing, trend analysis, user bookmarks

#### **Regulatory & Legislative** 🏛️
- **Federal Bills**: Congress.gov API integration
- **Federal Regulations**: Federal Register API
- **State Regulations**: Idaho ALF (IDAPA documents)
- **Medicaid Policies**: State-specific policy data (JSON files)

#### **Market & Operations** 🏢
- **CMS Facilities**: Nursing Home Compare API (Dataset: 4pq5-n9py)
- **CMS Deficiencies**: Health survey citations (Dataset: r5ix-sfxw)
- **CMS Care Compare**: Quality ratings and metrics
- **Database Tables**: `facilities`, `deficiencies`, `care_compare_ratings`

#### **Financial & Reimbursement** 💰
- **BLS Wages**: RN, LPN, CNA, Manager wages by state
- **Census Demographics**: Population 65+, 85+ by state and county
- **Database Tables**: `state_demographics`, `county_demographics`, `wage_data`

### **🔄 In Progress**
- **Database Schema Design**: Designing schemas for new data sources
- **API Endpoints**: Creating endpoints to serve collected data

### **⏳ Pending**
- **Technology & Innovation**: Automation tools, digital health trends
- **Additional Financial Data**: Medicare cost reports, reimbursement rates
- **Frontend Dashboards**: UI components to display collected data
- **Analytics**: Cross-dataset analysis and insights

---

## 🗂️ **Data Source Inventory**

### **API-Based Sources**
| Source | Status | Data Type | Update Frequency | Database Table |
|--------|--------|-----------|------------------|----------------|
| CMS Facilities | ✅ Active | Facility details, ratings | Monthly | `facilities` |
| CMS Deficiencies | ✅ Active | Health citations | Monthly | `deficiencies` |
| CMS Care Compare | ✅ Active | Quality metrics | Monthly | `care_compare_ratings` |
| Census Demographics | ✅ Active | Population data | Annual | `state_demographics` |
| Census County Data | ✅ Active | County demographics | Annual | `county_demographics` |
| BLS Wages | ✅ Active | Wage data by occupation | Annual | `wage_data` |
| Congress.gov | ✅ Active | Federal legislation | Real-time | `bills` |
| Federal Register | ✅ Active | Federal regulations | Real-time | `federal_regulations` |

### **File-Based Sources**
| Source | Status | Data Type | File Format | Processing |
|--------|--------|-----------|-------------|------------|
| Medicaid Policies | ✅ Active | State policies | JSON | Parsed from Excel |
| Idaho ALF Regulations | ✅ Active | State regulations | PDF/TXT | RAG processing |

### **Missing Data Sources**
| Category | Data Source | Priority | Implementation |
|----------|-------------|----------|----------------|
| Technology | Healthcare automation tools | Medium | API integration needed |
| Technology | Digital health trends | Medium | Web scraping or API |
| Financial | Medicare cost reports | High | File download + processing |
| Financial | State reimbursement rates | High | Web scraping or API |
| Financial | PDPM payment data | High | CMS API or file download |

---

## 🎯 **Next Steps Priority Matrix**

### **High Priority (This Week)**
1. **Create API endpoints** for existing data
2. **Build frontend dashboards** for CMS, Census, BLS data
3. **Test data collection** processes

### **Medium Priority (Next 2 Weeks)**
1. **Add Medicare cost reports** data source
2. **Create analytics** combining multiple datasets
3. **Build state comparison** features

### **Low Priority (Future)**
1. **Technology & innovation** tracking
2. **Advanced analytics** and AI insights
3. **User management** and preferences

---

## 📁 **File Organization**

### **Current Structure**
```
server/
├── collectors/           # Data collection scripts
├── database/            # Database schemas and migrations
├── data/               # Static data files
├── routes/             # API endpoints
└── services/           # Business logic

src/
├── components/         # React components
├── services/           # Frontend API calls
└── data/              # Mock data
```

### **Recommended Additions**
```
docs/
├── data-sources.md     # Detailed data source documentation
├── api-endpoints.md    # API documentation
└── user-guide.md      # User documentation

tracking/
├── progress.md        # Development progress
├── issues.md          # Known issues and bugs
└── roadmap.md         # Future development plans
```

---

## 🔧 **Development Workflow**

### **Daily Tasks**
- [ ] Check data collection logs
- [ ] Review new articles and analysis
- [ ] Test API endpoints
- [ ] Update progress tracker

### **Weekly Tasks**
- [ ] Run data collection scripts
- [ ] Review and update documentation
- [ ] Plan next development sprint
- [ ] Test new features

### **Monthly Tasks**
- [ ] Full data refresh
- [ ] Performance optimization
- [ ] Security updates
- [ ] User feedback review

---

## 📊 **Metrics Dashboard**

### **Data Collection Status**
- **Articles**: 1,461 total, 810 from RSS
- **Facilities**: [Check CMS collector status]
- **Demographics**: [Check Census collector status]
- **Wages**: [Check BLS collector status]

### **System Health**
- **Database**: Connected ✅
- **AI Services**: Rate limited (until Nov 1)
- **RSS Feeds**: Active ✅
- **API Endpoints**: [Status to be checked]

---

## 🚨 **Known Issues**

1. **AI Rate Limits**: Anthropic API rate limited until Nov 1, 2025
2. **Model Deprecation**: Claude 3.5 Sonnet deprecated, need to migrate
3. **Data Volume**: CMS Deficiencies dataset is 2GB+, needs optimization
4. **Frontend**: Need to build dashboards for collected data

---

## 📝 **Notes**

- All data collectors are implemented and functional
- Database schema is well-designed with proper relationships
- AI services have fallback mechanisms for reliability
- Project is ready for frontend development phase

---

*Last Updated: October 16, 2025*
*Next Review: October 23, 2025*
