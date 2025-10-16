# Comprehensive Data Source Catalog for PACadvocate.com
## Post-Acute Care Regulatory Intelligence System

### 1. LEGISLATIVE SOURCES

#### Federal Legislative Tracking
**Congressional Committees**
- **Primary Oversight Bodies:**
  - House Ways and Means Committee
    - Primary jurisdiction over Medicare/Medicaid policy
    - Year-round legislative sessions
    - Source: congress.gov/committee/house-ways-and-means
    - Crawl For: SNF payment bills, Medicare/Medicaid amendments, committee markups
  - Senate Finance Committee
    - Primary Senate jurisdiction over Medicare/Medicaid
    - Companion to House Ways and Means
    - Source: congress.gov/committee/senate-finance
    - Crawl For: Senate healthcare legislation, hearing transcripts, committee reports
  - House Energy and Commerce Committee
    - Healthcare subcommittees handle nursing home legislation
    - Significant role in SNF policy
    - Source: congress.gov/committee/house-energy-and-commerce
    - Crawl For: Quality and safety legislation, enforcement policy changes

**Bill Tracking System**
- Platform: Congress.gov
- API Access: Available via Congress.gov API
- Key Legislation Types:
  - Medicare/Medicaid reimbursement bills
  - Staffing mandate legislation
  - Quality improvement acts
  - Congressional Review Act resolutions (can disapprove CMS rules)
- Crawl For:
  - Bill texts and amendments
  - Committee actions and referrals
  - Voting records and passage status
  - Finalized laws affecting SNF payment, surveys, staffing, or requirements
- Search Terms:
  - "Skilled Nursing Facility"
  - "Nursing Home"
  - "Medicare Part A"
  - "Medicaid nursing facility"
  - "Long-term care"
- Update Frequency: Real-time as bills are introduced/updated
- Data Format: XML, JSON via API; HTML on website

**Federal Budget Documents**
- Sources:
  - CMS Payment Rules (annual)
  - Congressional Budget Office (CBO) reports
  - Medicare Trustees Report (annual)
- Update Frequency: Annually, with quarterly updates
- Key Timing: Budget proposals typically released February; enacted by September 30

#### State Legislative Tracking
**State Legislature Committees**
- Committee Types by State:
  - Joint Medicaid Oversight Committees (Louisiana, North Carolina)
  - Health and Welfare Committees (Idaho, others)
  - Ways and Means/Appropriations Committees (healthcare subcommittees)
  - Aging and Long-term Care Committees

**Top 10 States by SNF Bed Count (Priority Monitoring):**
1. Texas (1,313 facilities)
2. California (1,247 facilities)
3. Ohio (977 facilities)
4. Illinois (747 facilities)
5. Pennsylvania (750 facilities)
6. Florida (700 facilities)
7. New York (650 facilities)
8. North Carolina (600 facilities)
9. Indiana (550 facilities)
10. Michigan (500 facilities)

**Tracking Method:**
- Manual monitoring of state legislature websites (no comprehensive APIs available)
- LegiScan API for multi-state tracking
- State-specific bill tracking services
- Crawl For:
  - State bills, amendments, and proposed laws affecting nursing facilities and Medicaid rates
  - Committee hearings/reports from health, welfare, budget, or appropriations committees
  - Status and text of legislative proposals or reforms related to SNFs
  - Transcripts and testimony from committee meetings

**Example Access:**
- Idaho: legislature.idaho.gov/committees/housecommittees/ (Health & Welfare Committee, bill tracking)
- Each state: Official legislative portals and their health policy committees

**Search Terms:**
- "Nursing facility"
- "Long-term care facility"
- "Medicaid reimbursement"
- "Nursing home staffing"
- "Provider rates"
- "Medicaid nursing facility"
- "Long term care budget"

### 2. REGULATORY SOURCES

#### Federal Regulatory (CMS)
**CMS.gov - Main Hub**
- Primary URLs:
  - Main SNF PPS Page: cms.gov/medicare/payment/prospective-payment-systems/skilled-nursing-facility-snf
  - Federal Regulations List: cms.gov/medicare/payment/prospective-payment-systems/skilled-nursing-facility-snf/list-federal-regulations
  - SNF Consolidated Billing: cms.gov/medicare/coding-billing/skilled-nursing-facility-snf-consolidated-billing
  - Provider Enrollment: cms.gov/medicare/enrollment-renewal/providers-suppliers/skilled-nursing-facility-center
  - Health and Safety Standards: cms.gov/medicare/health-safety-standards/certification-compliance/nursing-homes
- Crawl For:
  - SNF payment rules (proposed & final)
  - QSO memos (survey & certification updates)
  - State Operations Manual and Appendix PP (surveyor guidance)
  - SNF consolidated billing files/rate schedules
  - MAC contact links and bulletins
  - Provider enrollment/participation requirements
  - Rate changes, survey guidance, billing updates
- RSS Feeds:
  - CMS RSS Feeds: cms.gov/about-cms/web-policies-important-links/rss-feeds
  - Subscribe to: Nursing Home updates, SNF-specific feeds
- Update Frequency: As announcements are made (weekly to monthly)
- Data Format: RSS/XML

**Survey & Certification (QSO) Memos**
- Source: cms.gov/medicare/health-safety-standards/quality-safety-oversight-general-information/policy-memos/policy-memos-states-and-cms-locations
- Crawl For:
  - Quality, Safety & Oversight policy memos to state survey agencies
  - Surveyor guidance changes and interpretations
  - Implementation timelines and compliance deadlines
  - Survey process updates and enforcement priorities
- Key Information:
  - Recent example: QSO-25-14-NH (surveyor guidance changes, effective April 28, 2025)
  - Critical for understanding survey/inspection expectations
- Update Frequency: Monthly or as needed
- Data Format: PDF
- Implementation Timing: Typically 30-60 days notice

**State Operations Manual (SOM)**
- Primary Document: Appendix PP
- URL: cms.gov/files/document/appendix-pp-state-operations-manual.pdf
- Full Manual: cms.gov/medicare/provider-enrollment-and-certification/guidanceforlawsandregulations/nursing-homes
- Alternative URL: cms.gov/medicare/provider-enrollment-and-certification/guidanceforlawsandregulations/downloads/appendix-pp-state-operations-manual.pdf
- Crawl For:
  - Surveyor guidance for long-term care facilities
  - Interpretive guidelines for regulations (42 CFR Part 483)
  - F-tag explanations and compliance requirements
  - Landmark surveyor guidance and interpretive rules
  - Critical updates and implementation memos
- Content:
- Update Frequency: Quarterly or as needed
- Implementation Period: 30-60 days for significant revisions
- Data Format: PDF (official); HTML versions available from third parties

**Federal Register - Annual Payment Rules & Rulemaking**
- Website: federalregister.gov
- Predictable Annual Cycle:
  - Proposed Rule:
    - Typical Publication: ~April 11 annually
    - Example: CMS-1827-P (FY 2026 Proposed Rule - April 30, 2025)
    - Comment Period: 60 days
    - Federal Register URL: federalregister.gov/documents/[year]/[month]/[day]/[document-number]
  - Final Rule:
    - Typical Publication: ~July 31 annually (effective October 1)
    - Example: CMS-1827-F (FY 2026 Final Rule - August 4, 2025)
    - Implementation: October 1 (start of federal fiscal year)
- Crawl For:
  - Proposed and final SNF rules from CMS
  - Public comment periods and submission deadlines
  - Major enforcement and regulatory notices
  - Rulemaking notices and policy changes
  - Implementation timelines
- Search Strategy:
  - Primary Search Term: "Medicare Program; Prospective Payment System and Consolidated Billing for Skilled Nursing Facilities"
  - Alternative Searches: "skilled nursing facility" or "SNF" for all policy, payment, or enforcement rules
  - Advanced Search: Use Federal Register API or website
  - API Access: federalregister.gov/developers/documentation
- Key Components to Monitor:
  - Market basket update (inflation adjustment)
  - Case-mix adjustment changes
  - Wage index updates
  - Quality reporting requirements
  - Value-based purchasing programs
  - Payment model refinements (PDPM updates)

**Federal Register - Other Regulatory Actions**
- Additional Monitoring:
  - Requirements of Participation updates (42 CFR Part 483)
  - Staffing mandates
  - Quality measure changes
  - Enforcement policy updates
  - Emergency regulatory waivers
- Access Methods:
  - Daily Browsing: federalregister.gov/public-inspection/current
  - Search Portal: federalregister.gov
  - Docket Search: regulations.gov/search/docket
  - Public Comment: regulations.gov
- Update Frequency: Daily Federal Register publication
- Data Format: XML, PDF, HTML via API

**Regulations.gov - Public Comment Tracking**
- Website: regulations.gov
- Crawl For:
  - CMS regulatory dockets
  - Public comments submitted on SNF payment/regulation proposals
  - Final regulatory decision dockets
  - Comment submission deadlines
  - Agency responses to comments
- Search Strategy:
  - Docket Search using "skilled nursing facility" or "CMS"
- Data Format: HTML, PDF (docket documents)
- Update Frequency: Real-time as comments are posted

**Medicare Administrative Contractors (MAC)**
- Function: Regional claims processors providing guidance to providers
- Key MAC Resources:
  - SNF Consolidated Billing matrices
  - Provider enrollment updates
  - Claims processing guidance
  - Local coverage determinations
  - Provider bulletins and newsletters
- Crawl For:
  - SNF billing bulletins, coding updates
  - Appeals and error correction guidance
  - Regional audit and payment policy notices
  - Local billing changes per region
- Example MAC:
  - Noridian (JE): med.noridianmedicare.com/web/jea/provider-types/snf
- Key Sections:
  - Provider Types > Skilled Nursing Facility (varies by MAC region)
  - Bulletins and newsletters
  - Local coverage determinations
  - Billing and coding guidance
- Update Frequency: Monthly to quarterly bulletins
- Data Format: HTML, PDF
- Geographic Coverage: Each MAC serves specific regions/states

#### State Regulatory Sources
**State Medicaid Agencies**
- Primary Functions:
  - Publish nursing facility reimbursement rates
  - Issue provider bulletins and policy updates
  - Manage Medicaid State Plan Amendments (SPAs)
  - Emergency rate changes
- Crawl For:
  - Official reimbursement rates for nursing facilities
  - Medicaid provider bulletins and policy changes impacting SNF payment
  - Fee schedules, State Plan Amendments (SPA), and annual budget updates
  - Announcements of emergency rate changes and temporary policies
  - Provider rates, bulletins, policy memos, SPAs, emergency rate change notices
- Example State Resources:
  - Idaho: healthandwelfare.idaho.gov/providers/idaho-medicaid-providers/medicaid-nursing-facilities
  - Idaho Provider Directory: idmedicaid.com/General%20Information/Directory.pdf
  - Provider Directory: State-specific Medicaid provider pages
  - CMS State Contacts: cms.gov/medicare/health-safety-standards/quality-safety-oversight-general-information/contact-information
- Key Sections to Monitor:
  - "Provider Publications" or "Provider Updates" section
  - Rate schedules and fee updates
  - Policy manuals and bulletins
  - State Plan Amendments
- Rate Updates:
  - Typical Timing: Annually on July 1 (varies by state)
  - Emergency Changes: 30-60 day notice via Medicaid State Plan Amendments
  - COVID-19 Example: Multiple states implemented temporary 4-20% rate increases
- Data Format: PDF, HTML; some states provide Excel/CSV rate schedules
- Search Keywords:
  - "Provider rates"
  - "Fee schedules"
  - "Medicaid SPA"
  - "SNF"
  - "Nursing home"
- Access Method:
  - Individual state Medicaid agency websites (no unified API)
  - Medicaid.gov for federal oversight: medicaid.gov
  - State Plan Amendments: medicaid.gov/medicaid/spa/downloads/

**State Health Departments / Survey Agencies**
- Survey Agency Functions:
  - Conduct facility surveys/inspections
  - Enforce state-specific regulations
  - Publish survey results and deficiency reports
  - Issue sanctions and enforcement actions
- Crawl For:
  - Survey/enforcement priorities and standards for SNFs
  - Deficiency reports, sanctions, and enforcement actions
  - Guidance docs for inspections, penalties, corrective actions
  - Nursing facility survey results, deficiency lists, regulatory guidance
- Key Information:
  - State-specific licensure requirements
  - Survey schedules and results
  - Complaint investigation outcomes
- Update Frequency: Varies by state; typically monthly
- Search Keywords:
  - "Nursing facility survey results"
  - "Deficiency report"
  - "Long term care enforcement"
  - "Licensing standards"
- Access:
  - State health department long-term care or licensing/survey divisions
  - CMS directory of state agency contacts: cms.gov/medicare/health-safety-standards/quality-safety-oversight-general-information/contact-information

**State Budget Documents & Fiscal Reports**
- Function: Track appropriations and fiscal impact on SNF rates
- Crawl For:
  - State budget bills, appropriations reports, fiscal impact statements specifying Medicaid rates
  - Medicaid appropriations bills and enacted budget laws
  - Fiscal impact reports and legislative summaries specifying SNF rate updates
  - Emergency funding and special appropriations impacting nursing home rates
- Example Sources:
  - State legislature finance/appropriations committee sites, or budget bills section
  - PDFs of enacted budgets and legislative reports
  - Idaho Example: legislature.idaho.gov/wp-content/uploads/OPE/Reports/r2302.pdf
  - State agency budget sections and rate-setting documents
- Search Keywords:
  - "Medicaid budget"
  - "Provider reimbursement"
  - "Rate cut"
  - "Appropriation"
  - "Nursing facility rates"
- Access:
  - Legislative budget/fiscal office pages
  - State agency budget sections
  - Performance evaluation and fiscal analysis units

**State Provider Bulletins, Alerts & News**
- Function: Real-time updates on policy changes
- Crawl For:
  - Email subscription bulletins for rate changes and policy updates
  - Provider alerts about emergency changes or operational policies
  - Guidance for compliance, appeals, or corrective actions
  - RSS feeds and urgent announcements about rates or compliance
- Key Sections:
  - State Medicaid agency "News & Updates" or "Provider Alert" pages
  - Email subscription services
  - RSS feeds where available
  - Urgent policy announcements
- Search Keywords:
  - "Rate change"
  - "Emergency Medicaid update"
  - "Provider alert"
  - "Bulletin"
  - "Policy update"
- Access Method:
  - Subscribe to email alerts (many states offer this)
  - Monitor RSS feeds where available
  - Check "Provider News" sections regularly
  - Set up automated monitoring for new publications

### 3. ENFORCEMENT & OVERSIGHT SOURCES

#### Recovery Audit Contractors (RAC)
- Primary Source: cms.gov/data-research/monitoring-programs/medicare-fee-service-compliance-programs/medicare-fee-service-recovery-audit-program
- Crawl For:
  - Announcements of new and ongoing RAC audit issues & targets (SNF focus)
  - Quarterly and annual findings/summaries
  - Provider guidance about RAC policy/process
  - Common denial reasons and appeal statistics
- SNF Focus Areas:
  - Resource Utilization Group (RUG) placement errors
  - Therapy service medical necessity
  - Three-day hospital stay requirements
  - Minimum Data Set (MDS) documentation accuracy
  - Consolidated billing compliance
- Key Information:
  - RAC audit focus areas (updated quarterly)
  - Common denial reasons
  - Appeal statistics
  - Provider education materials
- Update Frequency: Quarterly focus area updates
- Data Format: HTML, PDF reports

#### Office of Inspector General (OIG)
- Primary Source: oig.hhs.gov
- Crawl For:
  - Federal audit reports and findings on SNFs (payment compliance, fraud, overpayments, etc.)
  - Annual and project-specific summaries impacting Medicare/Medicaid SNF providers
  - Fraud alerts and advisories
  - Special investigations
  - Provider compliance guidance
- Key Resources:
  - Work Plan: oig.hhs.gov/reports-and-publications/workplan/
  - Annual priorities for audits and investigations
  - SNF-specific focus areas (example: oig.hhs.gov/reports-and-publications/workplan/summary/wp-summary-0000650.asp)
- Update Frequency: Annually with quarterly updates
- Report Types:
  - Audit reports on SNF compliance
  - Fraud alerts and advisories
  - Special investigations
  - Provider compliance guidance
- Data Format: PDF, HTML

#### Quality Reporting & Care Compare
**CMS Nursing Home Compare:**
- Data Portal: data.cms.gov/provider-data/search?theme=Nursing+homes+including+rehab+services
- Public Facing: medicare.gov/care-compare/
- Crawl For:
  - Public datasets on SNF provider characteristics
  - SNF payment/utilization files
  - Quality ratings, outcomes, audit statistics
  - Provider data by facility type
- Key Metrics:
  - Star ratings (1-5 stars)
  - Health inspection results
  - Staffing levels
  - Quality measures
- Update Frequency:
  - Monthly data updates (subject to validation freezes)
  - Annual star rating methodology updates
- Data Format: CSV, JSON via API; HTML on website

#### State Survey Results
- Sources:
  - State health department websites
  - CMS Nursing Home Compare (aggregated state survey data)
- Crawl For:
  - Deficiency citations (F-tags)
  - Scope and severity determinations
  - Correction plans
  - Sanctions and enforcement actions
- Information Includes:
- Update Frequency: Varies by state; typically within 30 days of survey
- Data Format: PDF, HTML; some states provide CSV

### CRAWLING STRATEGY & TECHNICAL IMPLEMENTATION

#### Federal Website Crawling Priority Matrix
| Site/Source | Crawl Priority | Update Frequency | Data Format | Automation Method |
|-------------|----------------|------------------|-------------|-------------------|
| CMS.gov | High | Weekly | HTML, PDF, RSS | RSS + Web scraping |
| Federal Register | High | Daily | XML, PDF, HTML | API + RSS |
| Congress.gov | High | Real-time | JSON, XML, HTML | API polling |
| Regulations.gov | Medium | Real-time | HTML, PDF | Web scraping |
| CMS RAC Program | Medium | Quarterly | HTML, PDF | Web scraping |
| MAC websites | Medium | Monthly | HTML, PDF | Web scraping |
| data.cms.gov | Medium | Monthly | CSV, JSON | API |
| OIG.gov | Medium | Quarterly | PDF, HTML | Web scraping |
| CMS Policy Memos | High | Monthly | PDF | PDF monitoring |

#### State Website Crawling Priority Matrix
| Source Type | Crawl Priority | Update Frequency | Data Format | Automation Method |
|-------------|----------------|------------------|-------------|-------------------|
| Legislature Sites | High (during session) | Real-time | HTML, PDF | Web scraping + LegiScan API |
| Medicaid Agencies | High | Weekly | PDF, HTML, Excel | Web scraping + Email monitoring |
| Survey Agencies | Medium | Monthly | PDF, HTML | Web scraping |
| Budget Documents | High (budget season) | Annually | PDF | PDF monitoring |
| Provider Alerts | High | As published | Email, RSS, HTML | Email subscriptions + RSS |

#### Search Terms & Keywords by Source Type
**Federal Terminology:**
- "Skilled Nursing Facility Prospective Payment System" / "SNF PPS"
- "Resource Utilization Groups" / "RUG-IV" (legacy)
- "Patient Driven Payment Model" / "PDPM" (current)
- "Consolidated Billing"
- "Requirements of Participation"
- "42 CFR Part 483"

**State Terminology:**
- "Nursing Facility" (Medicaid term)
- "Long-term Care Facility"
- "Nursing Home"
- "Medicaid nursing facility"
- "Long term care budget"
- "Provider rates"
- "Fee schedules"

**Legislative Keywords:**
- "Medicare Part A"
- "Medicaid reimbursement"
- "Nursing home staffing"
- "Provider rates"
- "Medicaid appropriation"

**Enforcement Keywords:**
- "Deficiency report"
- "Survey results"
- "RAC audit"
- "Compliance"
- "Enforcement action"

#### Data Formats by Source Type
**Federal Sources:**
- PDF: Federal Register documents, State Operations Manual, QSO memos, MAC bulletins
- HTML: CMS website pages, guidance documents, committee reports
- XML/RSS: CMS RSS feeds, Federal Register API
- JSON: Congress.gov API, Federal Register API, data.cms.gov
- CSV: Provider data, quality measure data

**State Sources:**
- PDF: Rate schedules, policy bulletins, budget documents, legislative reports
- HTML: State agency web pages, legislature sites
- Excel/CSV: Rate schedules, facility directories (when available)
- JSON: Limited API access (varies by state)
- Email: Provider alerts and bulletins

#### Update Frequencies Summary
**Real-Time/Daily:**
- Federal Register publications
- Congress.gov bill updates
- Regulations.gov comment submissions

**Weekly:**
- CMS website updates
- State Medicaid agency announcements (during active periods)

**Monthly:**
- QSO memos (as needed)
- MAC bulletins
- Quality measure data updates
- State survey results

**Quarterly:**
- State Operations Manual updates (as needed)
- RAC focus areas
- OIG Work Plan updates

**Annual (Predictable):**
- SNF PPS Proposed Rule (~April 11)
- SNF PPS Final Rule (~July 31, effective October 1)
- State Medicaid rates (typically July 1)
- OIG Work Plan (annually)
- Budget documents

**Variable/As Needed:**
- Emergency rate changes (30-60 day notice)
- Legislative bills (introduced throughout session)
- Enforcement actions

#### API & Automation Opportunities
**Available APIs:**
- Congress.gov: Full legislative tracking API
- Federal Register: Complete rulemaking API with advanced search
- data.cms.gov: Provider data and quality measures
- LegiScan: Multi-state legislative tracking

**RSS Feeds Available:**
- CMS nursing home updates
- Federal Register SNF-related rules
- Some state Medicaid agencies (varies)

**Email Subscriptions:**
- State Medicaid provider alerts
- MAC bulletins
- Federal Register notifications
- State legislature bill tracking

**Manual Monitoring Required:**
- Most state legislature websites (no comprehensive API)
- State Medicaid agency rate changes (PDF publications)
- State health department updates
- Some MAC bulletins
- QSO memos (PDF monitoring)

**Automation Strategy:**
- RSS feeds for CMS and Federal Register
- API polling for Congress.gov, Federal Register, and provider data
- Web scraping for state-specific sources (where APIs unavailable)
- PDF parsing for regulatory documents and rate schedules
- Email monitoring systems for MAC bulletins and state agency notifications
- Scheduled crawling based on known publication patterns

### MONITORING PRIORITIES BY IMPACT

#### High Impact (Daily Monitoring Required)
- Federal Register proposed/final rules
- Congress.gov bill status changes
- QSO memos (implementation guidance)
- Congressional bills affecting Medicare/Medicaid
- Emergency state rate changes
- State legislature activity (during session)

#### Medium Impact (Weekly Monitoring)
- CMS website updates
- MAC bulletins
- State Operations Manual updates
- State Medicaid agency announcements
- State legislative sessions (during session)
- RAC audit focuses

#### Standard Impact (Monthly Monitoring)
- Quality measure updates
- OIG reports
- State Medicaid routine updates
- State survey results
- Provider education resources

#### Periodic Review (Quarterly/Annual)
- Budget documents
- OIG Work Plan
- Annual rate updates
- Policy manual revisions

### SUMMARY: COMPREHENSIVE MONITORING CHECKLIST

#### Federal Daily Checks
- ✓ Federal Register for new SNF rules
- ✓ Congress.gov for bill updates
- ✓ Regulations.gov for comment deadlines

#### Federal Weekly Checks
- ✓ CMS.gov SNF pages for policy updates
- ✓ MAC websites for billing bulletins
- ✓ data.cms.gov for new datasets

#### Federal Monthly Checks
- ✓ QSO memos for surveyor guidance
- ✓ OIG reports for audit findings
- ✓ RAC program updates

#### State Daily Checks (Priority States)
- ✓ Legislature websites for bill activity (during session)
- ✓ Medicaid agency news/alerts

#### State Weekly Checks
- ✓ Medicaid rate schedules
- ✓ Provider bulletin pages
- ✓ Email subscription updates

#### State Monthly Checks
- ✓ Survey agency enforcement actions
- ✓ Budget committee activity (during budget season)
- ✓ State Plan Amendments

This comprehensive catalog provides the foundation for building PACadvocate's regulatory intelligence system, ensuring complete coverage of legislative, regulatory, and enforcement activities affecting post-acute care providers across all 50 states and the federal government.
