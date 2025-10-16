import React, { useState, useEffect } from 'react';
import './ProjectTracker.css';

const ProjectTracker = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSource, setSelectedSource] = useState(null);
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [projectStatus, setProjectStatus] = useState({
    dataSources: {
      news: { status: 'active', count: 1461, lastUpdate: '2025-10-16' },
      cms: { status: 'active', count: 15000, lastUpdate: '2025-10-15' },
      census: { status: 'active', count: 3000, lastUpdate: '2025-10-14' },
      bls: { status: 'active', count: 200, lastUpdate: '2025-10-13' },
      regulations: { status: 'active', count: 1000, lastUpdate: '2025-10-16' }
    },
    development: {
      backend: { progress: 85, status: 'in-progress' },
      frontend: { progress: 40, status: 'in-progress' },
      apis: { progress: 60, status: 'in-progress' },
      testing: { progress: 20, status: 'pending' }
    },
    issues: [
      { id: 1, type: 'warning', message: 'AI Rate Limits: Anthropic API rate limited until Nov 1, 2025', status: 'active' },
      { id: 2, type: 'info', message: 'Model Deprecation: Claude 3.5 Sonnet deprecated, need to migrate', status: 'active' },
      { id: 3, type: 'warning', message: 'Data Volume: CMS Deficiencies dataset is 2GB+, needs optimization', status: 'active' },
      { id: 4, type: 'success', message: 'Database: Connected and operational', status: 'resolved' }
    ]
  });

  // Detailed source information mapping
  const sourceDetails = {
    'RSS Feeds': {
      level: 'Federal',
      category: 'News',
      function: 'News aggregation',
      crawlFor: 'SNF-related news articles, industry updates, policy announcements',
      frequency: 'Real-time',
      format: 'RSS/XML',
      method: 'RSS polling',
      priority: 'High',
      url: 'Multiple RSS feeds',
      description: 'Automated news collection from 9 RSS feeds covering skilled nursing facilities, long-term care, and healthcare policy.'
    },
    'Article Analysis': {
      level: 'Internal',
      category: 'Processing',
      function: 'AI content analysis',
      crawlFor: 'Article content, relevance scoring, categorization, sentiment analysis',
      frequency: 'Real-time',
      format: 'JSON',
      method: 'AI processing',
      priority: 'High',
      url: 'Internal processing',
      description: 'AI-powered analysis of collected articles for relevance, impact, and categorization.'
    },
    'Congress.gov API': {
      level: 'Federal',
      category: 'Legislative',
      function: 'Bill tracking and legislative text',
      crawlFor: 'Bills, amendments, committee actions, voting records, hearings, law texts affecting SNF payment/staffing/quality',
      frequency: 'Real-time',
      format: 'JSON, XML, HTML',
      method: 'API polling',
      priority: 'High',
      url: 'congress.gov',
      description: 'Real-time tracking of federal legislation affecting skilled nursing facilities and post-acute care.'
    },
    'House Ways & Means': {
      level: 'Federal',
      category: 'Legislative',
      function: 'Medicare/Medicaid oversight',
      crawlFor: 'SNF payment bills, committee markups, hearing transcripts, Medicare/Medicaid amendments',
      frequency: 'Real-time',
      format: 'HTML, PDF',
      method: 'Web scraping',
      priority: 'High',
      url: 'congress.gov/committee/house-ways-and-means',
      description: 'Primary House committee with jurisdiction over Medicare/Medicaid policy and SNF payment legislation.'
    },
    'Senate Finance': {
      level: 'Federal',
      category: 'Legislative',
      function: 'Medicare/Medicaid oversight',
      crawlFor: 'Senate healthcare legislation, hearing transcripts, committee reports, policy proposals',
      frequency: 'Real-time',
      format: 'HTML, PDF',
      method: 'Web scraping',
      priority: 'High',
      url: 'congress.gov/committee/senate-finance',
      description: 'Primary Senate committee with jurisdiction over Medicare/Medicaid policy, companion to House Ways & Means.'
    },
    'CMS.gov - SNF PPS': {
      level: 'Federal',
      category: 'Regulatory',
      function: 'Payment policy',
      crawlFor: 'SNF payment rules (proposed & final), rate updates, market basket, wage index, PDPM changes',
      frequency: 'Weekly',
      format: 'HTML, PDF, RSS',
      method: 'RSS + Web scraping',
      priority: 'High',
      url: 'cms.gov/medicare/payment/prospective-payment-systems/skilled-nursing-facility-snf',
      description: 'CMS Skilled Nursing Facility Prospective Payment System updates, rate changes, and policy modifications.'
    },
    'Federal Register - SNF Rules': {
      level: 'Federal',
      category: 'Regulatory',
      function: 'Rulemaking',
      crawlFor: 'Proposed rules (~April 11), final rules (~July 31), comment periods, implementation dates, payment updates',
      frequency: 'Daily/Annual cycle',
      format: 'XML, PDF, HTML',
      method: 'API + RSS',
      priority: 'High',
      url: 'federalregister.gov',
      description: 'Federal Register publications for SNF payment rules, regulatory changes, and policy updates.'
    },
    'CMS.gov - QSO Memos': {
      level: 'Federal',
      category: 'Regulatory',
      function: 'Survey guidance',
      crawlFor: 'Quality/Safety/Oversight memos, surveyor guidance changes, implementation timelines, enforcement priorities',
      frequency: 'Monthly',
      format: 'PDF',
      method: 'PDF monitoring',
      priority: 'High',
      url: 'cms.gov/medicare/health-safety-standards/quality-safety-oversight-general-information/policy-memos',
      description: 'CMS Quality, Safety & Oversight memos providing surveyor guidance and enforcement priorities.'
    },
    'State Medicaid Agency Websites': {
      level: 'State',
      category: 'Regulatory',
      function: 'Reimbursement policy',
      crawlFor: 'Official reimbursement rates, provider bulletins, fee schedules, State Plan Amendments (SPAs), emergency rate changes, policy memos',
      frequency: 'Weekly',
      format: 'PDF, HTML, Excel',
      method: 'Web scraping + Email monitoring',
      priority: 'High',
      url: 'Varies by state',
      description: 'State-specific Medicaid agency websites providing reimbursement rates and policy updates for nursing facilities.'
    },
    'CMS Recovery Audit Program (RAC)': {
      level: 'Federal',
      category: 'Enforcement',
      function: 'Payment integrity',
      crawlFor: 'RAC audit targets, quarterly findings, common denials, appeal statistics, provider guidance, focus areas (RUG errors, therapy necessity, 3-day stay, MDS)',
      frequency: 'Quarterly',
      format: 'HTML, PDF',
      method: 'Web scraping',
      priority: 'Medium',
      url: 'cms.gov/data-research/monitoring-programs/medicare-fee-service-compliance-programs/recovery-audit-program',
      description: 'CMS Recovery Audit Contractor program monitoring payment integrity and identifying overpayments.'
    },
    'AI Processing': {
      level: 'Internal',
      category: 'Processing',
      function: 'AI content analysis',
      crawlFor: 'Article content, relevance scoring, categorization, sentiment analysis',
      frequency: 'Real-time',
      format: 'JSON',
      method: 'AI processing',
      priority: 'High',
      url: 'Internal processing',
      description: 'AI-powered analysis of collected articles for relevance, impact, and categorization.'
    },
    'House Ways & Means': {
      level: 'Federal',
      category: 'Legislative',
      function: 'Medicare/Medicaid oversight',
      crawlFor: 'SNF payment bills, committee markups, hearing transcripts, Medicare/Medicaid amendments',
      frequency: 'Real-time',
      format: 'HTML, PDF',
      method: 'Web scraping',
      priority: 'High',
      url: 'congress.gov/committee/house-ways-and-means',
      description: 'Primary House committee with jurisdiction over Medicare/Medicaid policy and SNF payment legislation.'
    },
    'Senate Finance': {
      level: 'Federal',
      category: 'Legislative',
      function: 'Medicare/Medicaid oversight',
      crawlFor: 'Senate healthcare legislation, hearing transcripts, committee reports, policy proposals',
      frequency: 'Real-time',
      format: 'HTML, PDF',
      method: 'Web scraping',
      priority: 'High',
      url: 'congress.gov/committee/senate-finance',
      description: 'Primary Senate committee with jurisdiction over Medicare/Medicaid policy, companion to House Ways & Means.'
    },
    'Energy & Commerce': {
      level: 'Federal',
      category: 'Legislative',
      function: 'Healthcare policy',
      crawlFor: 'Quality and safety legislation, enforcement policy changes, nursing home regulations',
      frequency: 'Real-time',
      format: 'HTML, PDF',
      method: 'Web scraping',
      priority: 'Medium',
      url: 'congress.gov/committee/house-energy-and-commerce',
      description: 'House Energy and Commerce Committee handling healthcare policy and nursing home regulations.'
    },
    'Federal Budget Docs': {
      level: 'Federal',
      category: 'Legislative',
      function: 'Appropriations & funding',
      crawlFor: 'CMS payment rules, Medicare Trustees Report, CBO reports, budget proposals',
      frequency: 'Annual (Feb-Sept)',
      format: 'PDF, HTML',
      method: 'Manual review',
      priority: 'Medium',
      url: 'Multiple sources',
      description: 'Federal budget documents including CMS payment rules and Medicare Trustees reports.'
    },
    'Top 10 States': {
      level: 'State',
      category: 'Legislative',
      function: 'Bill tracking',
      crawlFor: 'State bills, amendments, proposed laws affecting nursing facilities/Medicaid rates, committee hearings/reports, transcripts, status updates',
      frequency: 'Real-time (during session)',
      format: 'HTML, PDF',
      method: 'Web scraping + LegiScan API',
      priority: 'High (during session)',
      url: 'Varies by state',
      description: 'Priority monitoring of the top 10 states by SNF bed count for legislative activity.'
    },
    'LegiScan API': {
      level: 'State',
      category: 'Legislative',
      function: 'Multi-state bill tracking',
      crawlFor: 'State bills, amendments, proposed laws affecting nursing facilities/Medicaid rates, committee hearings/reports, transcripts, status updates',
      frequency: 'Real-time (during session)',
      format: 'HTML, PDF',
      method: 'Web scraping + LegiScan API',
      priority: 'High (during session)',
      url: 'legiscan.com',
      description: 'LegiScan API for multi-state legislative tracking across all 50 states.'
    },
    'State Committees': {
      level: 'State',
      category: 'Legislative',
      function: 'Healthcare oversight',
      crawlFor: 'Committee hearings, bill markups, testimony, legislative proposals, reform initiatives',
      frequency: 'Real-time (during session)',
      format: 'HTML, PDF',
      method: 'Web scraping',
      priority: 'High (during session)',
      url: 'State legislature committee pages',
      description: 'State legislature health and welfare committees handling healthcare oversight.'
    },
    'Budget Documents': {
      level: 'State',
      category: 'Legislative',
      function: 'Fiscal policy',
      crawlFor: 'Medicaid appropriations, budget bills, fiscal impact statements, SNF rate updates, emergency funding',
      frequency: 'Annual (budget season)',
      format: 'PDF',
      method: 'PDF monitoring',
      priority: 'High (budget season)',
      url: 'State legislature fiscal offices',
      description: 'State budget documents and appropriations affecting Medicaid and SNF rates.'
    },
    'CMS.gov Main': {
      level: 'Federal',
      category: 'Regulatory',
      function: 'Payment policy',
      crawlFor: 'SNF payment rules (proposed & final), rate updates, market basket, wage index, PDPM changes',
      frequency: 'Weekly',
      format: 'HTML, PDF, RSS',
      method: 'RSS + Web scraping',
      priority: 'High',
      url: 'cms.gov/medicare/payment/prospective-payment-systems/skilled-nursing-facility-snf',
      description: 'CMS main website for SNF payment system updates and policy changes.'
    },
    'Federal Register': {
      level: 'Federal',
      category: 'Regulatory',
      function: 'Rulemaking',
      crawlFor: 'Proposed rules (~April 11), final rules (~July 31), comment periods, implementation dates, payment updates',
      frequency: 'Daily/Annual cycle',
      format: 'XML, PDF, HTML',
      method: 'API + RSS',
      priority: 'High',
      url: 'federalregister.gov',
      description: 'Federal Register publications for SNF payment rules, regulatory changes, and policy updates.'
    },
    'QSO Memos': {
      level: 'Federal',
      category: 'Regulatory',
      function: 'Survey guidance',
      crawlFor: 'Quality/Safety/Oversight memos, surveyor guidance changes, implementation timelines, enforcement priorities',
      frequency: 'Monthly',
      format: 'PDF',
      method: 'PDF monitoring',
      priority: 'High',
      url: 'cms.gov/medicare/health-safety-standards/quality-safety-oversight-general-information/policy-memos',
      description: 'CMS Quality, Safety & Oversight memos providing surveyor guidance and enforcement priorities.'
    },
    'State Operations Manual': {
      level: 'Federal',
      category: 'Regulatory',
      function: 'Survey standards',
      crawlFor: 'F-tag interpretive guidelines, surveyor guidance, compliance requirements, regulatory interpretations',
      frequency: 'Quarterly',
      format: 'PDF',
      method: 'PDF monitoring',
      priority: 'High',
      url: 'cms.gov/files/document/appendix-pp-state-operations-manual.pdf',
      description: 'CMS State Operations Manual providing surveyor guidance and compliance requirements.'
    },
    'Regulations.gov': {
      level: 'Federal',
      category: 'Regulatory',
      function: 'Public comment tracking',
      crawlFor: 'Regulatory dockets, public comments, comment deadlines, agency responses, final decisions',
      frequency: 'Real-time',
      format: 'HTML, PDF',
      method: 'Web scraping',
      priority: 'Medium',
      url: 'regulations.gov',
      description: 'Regulations.gov for tracking public comments and regulatory dockets.'
    },
    'MAC Websites': {
      level: 'Federal',
      category: 'Regulatory',
      function: 'Regional guidance',
      crawlFor: 'SNF billing bulletins, coding updates, appeals guidance, regional audit notices, claims processing changes',
      frequency: 'Monthly-Quarterly',
      format: 'HTML, PDF',
      method: 'Web scraping',
      priority: 'Medium',
      url: 'Varies by region (e.g., med.noridianmedicare.com)',
      description: 'Medicare Administrative Contractor websites providing regional billing guidance.'
    },
    'State Medicaid Agencies': {
      level: 'State',
      category: 'Regulatory',
      function: 'Reimbursement policy',
      crawlFor: 'Official reimbursement rates, provider bulletins, fee schedules, State Plan Amendments (SPAs), emergency rate changes, policy memos',
      frequency: 'Weekly',
      format: 'PDF, HTML, Excel',
      method: 'Web scraping + Email monitoring',
      priority: 'High',
      url: 'Varies by state',
      description: 'State-specific Medicaid agency websites providing reimbursement rates and policy updates.'
    },
    'State Health Departments': {
      level: 'State',
      category: 'Regulatory',
      function: 'Facility inspection',
      crawlFor: 'Survey/enforcement priorities, deficiency reports, sanctions, enforcement actions, inspection guidance, corrective action requirements',
      frequency: 'Monthly',
      format: 'PDF, HTML',
      method: 'Web scraping',
      priority: 'Medium',
      url: 'State health department long-term care divisions',
      description: 'State health department long-term care divisions handling facility inspections.'
    },
    'Provider Bulletins': {
      level: 'State',
      category: 'Regulatory',
      function: 'Policy updates',
      crawlFor: 'Email bulletins, RSS feeds, urgent announcements, rate changes, compliance updates, operational policies',
      frequency: 'As published',
      format: 'Email, RSS, HTML',
      method: 'Email subscriptions + RSS',
      priority: 'High',
      url: 'State Medicaid agency news pages',
      description: 'State provider bulletins and alerts for policy updates and rate changes.'
    },
    'State Plan Amendments': {
      level: 'State',
      category: 'Regulatory',
      function: 'Policy changes',
      crawlFor: 'State Plan Amendments, rate changes, policy modifications, federal approval process',
      frequency: 'As submitted',
      format: 'PDF',
      method: 'PDF monitoring',
      priority: 'Medium',
      url: 'medicaid.gov/medicaid/spa/downloads/',
      description: 'State Plan Amendments for policy changes and rate modifications.'
    },
    'RAC Program': {
      level: 'Federal',
      category: 'Enforcement',
      function: 'Payment integrity',
      crawlFor: 'RAC audit targets, quarterly findings, common denials, appeal statistics, provider guidance, focus areas (RUG errors, therapy necessity, 3-day stay, MDS)',
      frequency: 'Quarterly',
      format: 'HTML, PDF',
      method: 'Web scraping',
      priority: 'Medium',
      url: 'cms.gov/data-research/monitoring-programs/medicare-fee-service-compliance-programs/recovery-audit-program',
      description: 'CMS Recovery Audit Contractor program monitoring payment integrity and identifying overpayments.'
    },
    'OIG Reports': {
      level: 'Federal',
      category: 'Enforcement',
      function: 'Fraud & compliance',
      crawlFor: 'Work Plan, audit reports, fraud alerts, special investigations, compliance guidance, SNF-specific findings',
      frequency: 'Quarterly (Work Plan: Annual)',
      format: 'PDF, HTML',
      method: 'Web scraping',
      priority: 'Medium',
      url: 'oig.hhs.gov',
      description: 'Office of Inspector General reports on fraud, compliance, and audit findings.'
    },
    'Care Compare Data': {
      level: 'Federal',
      category: 'Oversight',
      function: 'Quality transparency',
      crawlFor: 'Star ratings, health inspections, staffing levels, quality measures, facility comparisons',
      frequency: 'Monthly',
      format: 'CSV, JSON, HTML',
      method: 'API',
      priority: 'Low',
      url: 'medicare.gov/care-compare/',
      description: 'CMS Nursing Home Compare data for quality ratings and facility comparisons.'
    },
    'State Survey Results': {
      level: 'State',
      category: 'Enforcement',
      function: 'Facility inspection',
      crawlFor: 'Survey/enforcement priorities, deficiency reports, sanctions, enforcement actions, inspection guidance, corrective action requirements',
      frequency: 'Monthly',
      format: 'PDF, HTML',
      method: 'Web scraping',
      priority: 'Medium',
      url: 'State health department long-term care divisions',
      description: 'State survey results and enforcement actions for nursing facilities.'
    },
    'CMS Facilities': {
      level: 'Federal',
      category: 'Oversight',
      function: 'Facility data',
      crawlFor: 'Provider characteristics, facility data, certification status, ownership information',
      frequency: 'Monthly',
      format: 'CSV, JSON',
      method: 'API',
      priority: 'High',
      url: 'data.cms.gov/provider-data/search?theme=Nursing+homes',
      description: 'CMS Nursing Home Compare facility data including characteristics and certification status.'
    },
    'CMS Deficiencies': {
      level: 'Federal',
      category: 'Oversight',
      function: 'Quality data',
      crawlFor: 'Deficiency citations, scope and severity, correction plans, enforcement actions',
      frequency: 'Monthly',
      format: 'CSV, JSON',
      method: 'API',
      priority: 'High',
      url: 'data.cms.gov/provider-data/search?theme=Nursing+homes',
      description: 'CMS deficiency data including citations and enforcement actions.'
    },
    'CMS Care Compare': {
      level: 'Federal',
      category: 'Oversight',
      function: 'Quality metrics',
      crawlFor: 'Star ratings, health inspections, staffing levels, quality measures, facility comparisons',
      frequency: 'Monthly',
      format: 'CSV, JSON, HTML',
      method: 'API',
      priority: 'High',
      url: 'medicare.gov/care-compare/',
      description: 'CMS Care Compare quality metrics and star ratings for nursing facilities.'
    },
    'BLS Wages': {
      level: 'Federal',
      category: 'Financial',
      function: 'Wage data',
      crawlFor: 'RN, LPN, CNA wage data by state, occupational employment statistics',
      frequency: 'Annual',
      format: 'JSON',
      method: 'API',
      priority: 'Medium',
      url: 'api.bls.gov/publicAPI/v2/timeseries/data/',
      description: 'Bureau of Labor Statistics wage data for healthcare workers by state.'
    },
    'Census Demographics': {
      level: 'Federal',
      category: 'Demographics',
      function: 'Population data',
      crawlFor: 'Population by age group, demographic characteristics, state and county data',
      frequency: 'Annual',
      format: 'JSON',
      method: 'API',
      priority: 'Medium',
      url: 'api.census.gov/data',
      description: 'Census demographic data including population by age group for states and counties.'
    },
    'County Demographics': {
      level: 'Federal',
      category: 'Demographics',
      function: 'County population data',
      crawlFor: 'Population by age group, demographic characteristics, county-level data',
      frequency: 'Annual',
      format: 'JSON',
      method: 'API',
      priority: 'Medium',
      url: 'api.census.gov/data',
      description: 'Census county-level demographic data including population by age group.'
    }
  };

  const dataSources = [
    {
      category: 'News & Analysis',
      icon: '📰',
      sources: [
        { name: 'RSS Feeds', count: 9, status: 'active', lastUpdate: '2025-10-16' },
        { name: 'Article Analysis', count: 1461, status: 'active', lastUpdate: '2025-10-16' },
        { name: 'AI Processing', count: 'Active', status: 'limited', lastUpdate: '2025-10-16' }
      ]
    },
    {
      category: 'Federal Legislative',
      icon: '🏛️',
      sources: [
        { name: 'Congress.gov API', count: 'Real-time', status: 'active', lastUpdate: '2025-10-16' },
        { name: 'House Ways & Means', count: 'Committee', status: 'pending', lastUpdate: 'TBD' },
        { name: 'Senate Finance', count: 'Committee', status: 'pending', lastUpdate: 'TBD' },
        { name: 'Energy & Commerce', count: 'Committee', status: 'pending', lastUpdate: 'TBD' },
        { name: 'Federal Budget Docs', count: 'Annual', status: 'pending', lastUpdate: 'TBD' }
      ]
    },
    {
      category: 'State Legislative',
      icon: '🏛️',
      sources: [
        { name: 'Top 10 States', count: 'Priority', status: 'pending', lastUpdate: 'TBD' },
        { name: 'LegiScan API', count: 'Multi-state', status: 'pending', lastUpdate: 'TBD' },
        { name: 'State Committees', count: '50 states', status: 'pending', lastUpdate: 'TBD' },
        { name: 'Budget Documents', count: 'Annual', status: 'pending', lastUpdate: 'TBD' }
      ]
    },
    {
      category: 'Federal Regulatory',
      icon: '📋',
      sources: [
        { name: 'CMS.gov Main', count: 'Weekly', status: 'pending', lastUpdate: 'TBD' },
        { name: 'Federal Register', count: 'Daily', status: 'pending', lastUpdate: 'TBD' },
        { name: 'QSO Memos', count: 'Monthly', status: 'pending', lastUpdate: 'TBD' },
        { name: 'State Operations Manual', count: 'Quarterly', status: 'pending', lastUpdate: 'TBD' },
        { name: 'Regulations.gov', count: 'Real-time', status: 'pending', lastUpdate: 'TBD' },
        { name: 'MAC Websites', count: 'Monthly', status: 'pending', lastUpdate: 'TBD' }
      ]
    },
    {
      category: 'State Regulatory',
      icon: '📋',
      sources: [
        { name: 'State Medicaid Agencies', count: '50 states', status: 'pending', lastUpdate: 'TBD' },
        { name: 'State Health Departments', count: '50 states', status: 'pending', lastUpdate: 'TBD' },
        { name: 'Provider Bulletins', count: 'Real-time', status: 'pending', lastUpdate: 'TBD' },
        { name: 'State Plan Amendments', count: 'As needed', status: 'pending', lastUpdate: 'TBD' }
      ]
    },
    {
      category: 'Enforcement & Oversight',
      icon: '🔍',
      sources: [
        { name: 'RAC Program', count: 'Quarterly', status: 'pending', lastUpdate: 'TBD' },
        { name: 'OIG Reports', count: 'Quarterly', status: 'pending', lastUpdate: 'TBD' },
        { name: 'Care Compare Data', count: 'Monthly', status: 'pending', lastUpdate: 'TBD' },
        { name: 'State Survey Results', count: 'Monthly', status: 'pending', lastUpdate: 'TBD' }
      ]
    },
    {
      category: 'Market & Operations',
      icon: '🏢',
      sources: [
        { name: 'CMS Facilities', count: 15000, status: 'active', lastUpdate: '2025-10-15' },
        { name: 'CMS Deficiencies', count: 500000, status: 'active', lastUpdate: '2025-10-15' },
        { name: 'CMS Care Compare', count: 15000, status: 'active', lastUpdate: '2025-10-15' }
      ]
    },
    {
      category: 'Financial & Reimbursement',
      icon: '💰',
      sources: [
        { name: 'BLS Wages', count: 200, status: 'active', lastUpdate: '2025-10-13' },
        { name: 'Census Demographics', count: 3000, status: 'active', lastUpdate: '2025-10-14' },
        { name: 'County Demographics', count: 3000, status: 'active', lastUpdate: '2025-10-14' }
      ]
    }
  ];

  const developmentTasks = [
    { id: 1, title: 'Create API endpoints for CMS data', status: 'pending', priority: 'high', category: 'Backend' },
    { id: 2, title: 'Create API endpoints for Census data', status: 'pending', priority: 'high', category: 'Backend' },
    { id: 3, title: 'Create API endpoints for BLS data', status: 'pending', priority: 'high', category: 'Backend' },
    { id: 4, title: 'Build CMS facilities dashboard', status: 'pending', priority: 'high', category: 'Frontend' },
    { id: 5, title: 'Build demographics dashboard', status: 'pending', priority: 'high', category: 'Frontend' },
    { id: 6, title: 'Build wage analysis dashboard', status: 'pending', priority: 'high', category: 'Frontend' },
    { id: 7, title: 'Implement Federal Register monitoring', status: 'pending', priority: 'high', category: 'Data' },
    { id: 8, title: 'Implement Congress.gov API integration', status: 'pending', priority: 'high', category: 'Data' },
    { id: 9, title: 'Implement QSO Memos monitoring', status: 'pending', priority: 'high', category: 'Data' },
    { id: 10, title: 'Implement State Medicaid monitoring', status: 'pending', priority: 'high', category: 'Data' },
    { id: 11, title: 'Implement RAC Program monitoring', status: 'pending', priority: 'medium', category: 'Data' },
    { id: 12, title: 'Implement OIG Reports monitoring', status: 'pending', priority: 'medium', category: 'Data' },
    { id: 13, title: 'Implement MAC Websites monitoring', status: 'pending', priority: 'medium', category: 'Data' },
    { id: 14, title: 'Implement State Operations Manual monitoring', status: 'pending', priority: 'medium', category: 'Data' },
    { id: 15, title: 'Create regulatory intelligence dashboard', status: 'pending', priority: 'medium', category: 'Frontend' },
    { id: 16, title: 'Create enforcement tracking dashboard', status: 'pending', priority: 'medium', category: 'Frontend' },
    { id: 17, title: 'Add user management features', status: 'pending', priority: 'low', category: 'Frontend' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'limited': return '#f59e0b';
      case 'pending': return '#6b7280';
      case 'completed': return '#10b981';
      case 'in-progress': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getIssueIcon = (type) => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      default: return '📝';
    }
  };

  return (
    <div className="project-tracker">
      <div className="project-header">
        <h1>📊 Project Tracker</h1>
        <p>SNF News Aggregator - Development Status & Data Sources</p>
      </div>

      <div className="tracker-tabs">
        <button 
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📈 Overview
        </button>
        <button 
          className={`tab-button ${activeTab === 'data-sources' ? 'active' : ''}`}
          onClick={() => setActiveTab('data-sources')}
        >
          🗂️ Data Sources
        </button>
        <button 
          className={`tab-button ${activeTab === 'development' ? 'active' : ''}`}
          onClick={() => setActiveTab('development')}
        >
          🔧 Development
        </button>
        <button 
          className={`tab-button ${activeTab === 'issues' ? 'active' : ''}`}
          onClick={() => setActiveTab('issues')}
        >
          🚨 Issues
        </button>
      </div>

      <div className="tracker-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="stats-grid">
              <div className="stat-card">
                <h3>📊 Data Sources</h3>
                <div className="stat-number">50+</div>
                <div className="stat-label">Planned Sources</div>
              </div>
              <div className="stat-card">
                <h3>💾 Database Records</h3>
                <div className="stat-number">520K+</div>
                <div className="stat-label">Current Records</div>
              </div>
              <div className="stat-card">
                <h3>🔧 Development</h3>
                <div className="stat-number">25%</div>
                <div className="stat-label">Complete</div>
              </div>
              <div className="stat-card">
                <h3>🚨 Issues</h3>
                <div className="stat-number">3</div>
                <div className="stat-label">Active Issues</div>
              </div>
            </div>

            <div className="progress-section">
              <h3>Development Progress</h3>
              <div className="progress-bars">
                <div className="progress-item">
                  <div className="progress-label">Backend Development</div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '85%' }}></div>
                  </div>
                  <div className="progress-text">85%</div>
                </div>
                <div className="progress-item">
                  <div className="progress-label">Frontend Development</div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '40%' }}></div>
                  </div>
                  <div className="progress-text">40%</div>
                </div>
                <div className="progress-item">
                  <div className="progress-label">Regulatory Data Sources</div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '15%' }}></div>
                  </div>
                  <div className="progress-text">15%</div>
                </div>
                <div className="progress-item">
                  <div className="progress-label">Legislative Data Sources</div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '10%' }}></div>
                  </div>
                  <div className="progress-text">10%</div>
                </div>
                <div className="progress-item">
                  <div className="progress-label">Enforcement Monitoring</div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '5%' }}></div>
                  </div>
                  <div className="progress-text">5%</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'data-sources' && (
          <div className="data-sources-tab">
            {dataSources.map((category, index) => (
              <div key={index} className="data-category">
                <div className="category-header">
                  <span className="category-icon">{category.icon}</span>
                  <h3>{category.category}</h3>
                </div>
                <div className="sources-grid">
                  {category.sources.map((source, sourceIndex) => (
                    <div 
                      key={sourceIndex} 
                      className={`source-card ${selectedSource === source.name ? 'selected' : ''}`}
                      onClick={() => setSelectedSource(selectedSource === source.name ? null : source.name)}
                    >
                      <div className="source-name">{source.name}</div>
                      <div className="source-count">{source.count}</div>
                      <div className="source-status">
                        <span 
                          className="status-dot" 
                          style={{ backgroundColor: getStatusColor(source.status) }}
                        ></span>
                        {source.status}
                      </div>
                      <div className="source-update">Updated: {source.lastUpdate}</div>
                      {selectedSource === source.name && sourceDetails[source.name] && (
                        <div className="source-details">
                          <div className="detail-section">
                            <h4>📋 Description</h4>
                            <p>{sourceDetails[source.name].description}</p>
                          </div>
                          <div className="detail-grid">
                            <div className="detail-item">
                              <strong>Level:</strong> {sourceDetails[source.name].level}
                            </div>
                            <div className="detail-item">
                              <strong>Category:</strong> {sourceDetails[source.name].category}
                            </div>
                            <div className="detail-item">
                              <strong>Function:</strong> {sourceDetails[source.name].function}
                            </div>
                            <div className="detail-item">
                              <strong>Frequency:</strong> {sourceDetails[source.name].frequency}
                            </div>
                            <div className="detail-item">
                              <strong>Format:</strong> {sourceDetails[source.name].format}
                            </div>
                            <div className="detail-item">
                              <strong>Method:</strong> {sourceDetails[source.name].method}
                            </div>
                            <div className="detail-item">
                              <strong>Priority:</strong> 
                              <span className={`priority-${sourceDetails[source.name].priority.toLowerCase()}`}>
                                {sourceDetails[source.name].priority}
                              </span>
                            </div>
                            <div className="detail-item">
                              <strong>URL:</strong> 
                              <a href={`https://${sourceDetails[source.name].url}`} target="_blank" rel="noopener noreferrer">
                                {sourceDetails[source.name].url}
                              </a>
                            </div>
                          </div>
                          <div className="detail-section">
                            <h4>🔍 What to Crawl For</h4>
                            <p>{sourceDetails[source.name].crawlFor}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="developer-info">
              <div className="developer-header">
                <h3>🔧 Developer Implementation Guide</h3>
                <button 
                  className="toggle-details-btn"
                  onClick={() => setShowAllDetails(!showAllDetails)}
                >
                  {showAllDetails ? 'Hide' : 'Show'} All Details
                </button>
              </div>
              {showAllDetails && (
                <div className="implementation-table">
                <table>
                  <thead>
                    <tr>
                      <th>Source Name</th>
                      <th>Level</th>
                      <th>Category</th>
                      <th>Primary Function</th>
                      <th>What to Crawl For</th>
                      <th>Update Frequency</th>
                      <th>Data Format</th>
                      <th>Automation Method</th>
                      <th>Priority</th>
                      <th>URL/Access Point</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="federal-section">
                      <td colSpan="10"><strong>FEDERAL LEGISLATIVE SOURCES</strong></td>
                    </tr>
                    <tr>
                      <td>Congress.gov</td>
                      <td>Federal</td>
                      <td>Legislative</td>
                      <td>Bill tracking and legislative text</td>
                      <td>Bills, amendments, committee actions, voting records, hearings, law texts affecting SNF payment/staffing/quality</td>
                      <td>Real-time</td>
                      <td>JSON, XML, HTML</td>
                      <td>API polling</td>
                      <td>High</td>
                      <td>congress.gov</td>
                    </tr>
                    <tr>
                      <td>House Ways & Means Committee</td>
                      <td>Federal</td>
                      <td>Legislative</td>
                      <td>Medicare/Medicaid oversight</td>
                      <td>SNF payment bills, committee markups, hearing transcripts, Medicare/Medicaid amendments</td>
                      <td>Real-time</td>
                      <td>HTML, PDF</td>
                      <td>Web scraping</td>
                      <td>High</td>
                      <td>congress.gov/committee/house-ways-and-means</td>
                    </tr>
                    <tr>
                      <td>Senate Finance Committee</td>
                      <td>Federal</td>
                      <td>Legislative</td>
                      <td>Medicare/Medicaid oversight</td>
                      <td>Senate healthcare legislation, hearing transcripts, committee reports, policy proposals</td>
                      <td>Real-time</td>
                      <td>HTML, PDF</td>
                      <td>Web scraping</td>
                      <td>High</td>
                      <td>congress.gov/committee/senate-finance</td>
                    </tr>
                    <tr>
                      <td>House Energy & Commerce</td>
                      <td>Federal</td>
                      <td>Legislative</td>
                      <td>Healthcare policy</td>
                      <td>Quality and safety legislation, enforcement policy changes, nursing home regulations</td>
                      <td>Real-time</td>
                      <td>HTML, PDF</td>
                      <td>Web scraping</td>
                      <td>Medium</td>
                      <td>congress.gov/committee/house-energy-and-commerce</td>
                    </tr>
                    <tr>
                      <td>Federal Budget Documents</td>
                      <td>Federal</td>
                      <td>Legislative</td>
                      <td>Appropriations & funding</td>
                      <td>CMS payment rules, Medicare Trustees Report, CBO reports, budget proposals</td>
                      <td>Annual (Feb-Sept)</td>
                      <td>PDF, HTML</td>
                      <td>Manual review</td>
                      <td>Medium</td>
                      <td>Multiple sources</td>
                    </tr>
                    <tr className="federal-section">
                      <td colSpan="10"><strong>FEDERAL REGULATORY SOURCES</strong></td>
                    </tr>
                    <tr>
                      <td>CMS.gov - SNF PPS</td>
                      <td>Federal</td>
                      <td>Regulatory</td>
                      <td>Payment policy</td>
                      <td>SNF payment rules (proposed & final), rate updates, market basket, wage index, PDPM changes</td>
                      <td>Weekly</td>
                      <td>HTML, PDF, RSS</td>
                      <td>RSS + Web scraping</td>
                      <td>High</td>
                      <td>cms.gov/medicare/payment/prospective-payment-systems/skilled-nursing-facility-snf</td>
                    </tr>
                    <tr>
                      <td>CMS.gov - QSO Memos</td>
                      <td>Federal</td>
                      <td>Regulatory</td>
                      <td>Survey guidance</td>
                      <td>Quality/Safety/Oversight memos, surveyor guidance changes, implementation timelines, enforcement priorities</td>
                      <td>Monthly</td>
                      <td>PDF</td>
                      <td>PDF monitoring</td>
                      <td>High</td>
                      <td>cms.gov/medicare/health-safety-standards/quality-safety-oversight-general-information/policy-memos</td>
                    </tr>
                    <tr>
                      <td>State Operations Manual (Appendix PP)</td>
                      <td>Federal</td>
                      <td>Regulatory</td>
                      <td>Survey standards</td>
                      <td>F-tag interpretive guidelines, surveyor guidance, compliance requirements, regulatory interpretations</td>
                      <td>Quarterly</td>
                      <td>PDF</td>
                      <td>PDF monitoring</td>
                      <td>High</td>
                      <td>cms.gov/files/document/appendix-pp-state-operations-manual.pdf</td>
                    </tr>
                    <tr>
                      <td>Federal Register - SNF Rules</td>
                      <td>Federal</td>
                      <td>Regulatory</td>
                      <td>Rulemaking</td>
                      <td>Proposed rules (~April 11), final rules (~July 31), comment periods, implementation dates, payment updates</td>
                      <td>Daily/Annual cycle</td>
                      <td>XML, PDF, HTML</td>
                      <td>API + RSS</td>
                      <td>High</td>
                      <td>federalregister.gov</td>
                    </tr>
                    <tr>
                      <td>Federal Register - Other Rules</td>
                      <td>Federal</td>
                      <td>Regulatory</td>
                      <td>General rulemaking</td>
                      <td>Requirements of Participation updates, staffing mandates, quality measures, enforcement policy, emergency waivers</td>
                      <td>Daily</td>
                      <td>XML, PDF, HTML</td>
                      <td>API + RSS</td>
                      <td>High</td>
                      <td>federalregister.gov</td>
                    </tr>
                    <tr>
                      <td>Regulations.gov</td>
                      <td>Federal</td>
                      <td>Regulatory</td>
                      <td>Public comment tracking</td>
                      <td>Regulatory dockets, public comments, comment deadlines, agency responses, final decisions</td>
                      <td>Real-time</td>
                      <td>HTML, PDF</td>
                      <td>Web scraping</td>
                      <td>Medium</td>
                      <td>regulations.gov</td>
                    </tr>
                    <tr>
                      <td>CMS.gov - Consolidated Billing</td>
                      <td>Federal</td>
                      <td>Regulatory</td>
                      <td>Billing policy</td>
                      <td>Consolidated billing files, rate schedules, MAC matrices, billing requirements, policy updates</td>
                      <td>Monthly</td>
                      <td>HTML, PDF, Excel</td>
                      <td>Web scraping</td>
                      <td>Medium</td>
                      <td>cms.gov/medicare/coding-billing/skilled-nursing-facility-snf-consolidated-billing</td>
                    </tr>
                    <tr>
                      <td>Medicare Administrative Contractors (MACs)</td>
                      <td>Federal</td>
                      <td>Regulatory</td>
                      <td>Regional guidance</td>
                      <td>SNF billing bulletins, coding updates, appeals guidance, regional audit notices, claims processing changes</td>
                      <td>Monthly-Quarterly</td>
                      <td>HTML, PDF</td>
                      <td>Web scraping</td>
                      <td>Medium</td>
                      <td>Varies by region (e.g., med.noridianmedicare.com)</td>
                    </tr>
                    <tr className="federal-section">
                      <td colSpan="10"><strong>FEDERAL ENFORCEMENT & OVERSIGHT SOURCES</strong></td>
                    </tr>
                    <tr>
                      <td>CMS Recovery Audit Program (RAC)</td>
                      <td>Federal</td>
                      <td>Enforcement</td>
                      <td>Payment integrity</td>
                      <td>RAC audit targets, quarterly findings, common denials, appeal statistics, provider guidance, focus areas (RUG errors, therapy necessity, 3-day stay, MDS)</td>
                      <td>Quarterly</td>
                      <td>HTML, PDF</td>
                      <td>Web scraping</td>
                      <td>Medium</td>
                      <td>cms.gov/data-research/monitoring-programs/medicare-fee-service-compliance-programs/recovery-audit-program</td>
                    </tr>
                    <tr>
                      <td>Office of Inspector General (OIG)</td>
                      <td>Federal</td>
                      <td>Enforcement</td>
                      <td>Fraud & compliance</td>
                      <td>Work Plan, audit reports, fraud alerts, special investigations, compliance guidance, SNF-specific findings</td>
                      <td>Quarterly (Work Plan: Annual)</td>
                      <td>PDF, HTML</td>
                      <td>Web scraping</td>
                      <td>Medium</td>
                      <td>oig.hhs.gov</td>
                    </tr>
                    <tr>
                      <td>CMS Provider Data (data.cms.gov)</td>
                      <td>Federal</td>
                      <td>Oversight</td>
                      <td>Quality & utilization</td>
                      <td>Provider characteristics, payment/utilization files, quality ratings, audit statistics, facility data</td>
                      <td>Monthly</td>
                      <td>CSV, JSON</td>
                      <td>API</td>
                      <td>Medium</td>
                      <td>data.cms.gov/provider-data/search?theme=Nursing+homes</td>
                    </tr>
                    <tr>
                      <td>CMS Nursing Home Compare</td>
                      <td>Federal</td>
                      <td>Oversight</td>
                      <td>Quality transparency</td>
                      <td>Star ratings, health inspections, staffing levels, quality measures, facility comparisons</td>
                      <td>Monthly</td>
                      <td>CSV, JSON, HTML</td>
                      <td>API</td>
                      <td>Low</td>
                      <td>medicare.gov/care-compare/</td>
                    </tr>
                    <tr className="state-section">
                      <td colSpan="10"><strong>STATE LEGISLATIVE SOURCES</strong></td>
                    </tr>
                    <tr>
                      <td>State Legislature Websites</td>
                      <td>State</td>
                      <td>Legislative</td>
                      <td>Bill tracking</td>
                      <td>State bills, amendments, proposed laws affecting nursing facilities/Medicaid rates, committee hearings/reports, transcripts, status updates</td>
                      <td>Real-time (during session)</td>
                      <td>HTML, PDF</td>
                      <td>Web scraping + LegiScan API</td>
                      <td>High (during session)</td>
                      <td>Varies by state (e.g., legislature.idaho.gov)</td>
                    </tr>
                    <tr>
                      <td>State Health & Welfare Committees</td>
                      <td>State</td>
                      <td>Legislative</td>
                      <td>Healthcare oversight</td>
                      <td>Committee hearings, bill markups, testimony, legislative proposals, reform initiatives</td>
                      <td>Real-time (during session)</td>
                      <td>HTML, PDF</td>
                      <td>Web scraping</td>
                      <td>High (during session)</td>
                      <td>State legislature committee pages</td>
                    </tr>
                    <tr>
                      <td>State Budget/Appropriations Committees</td>
                      <td>State</td>
                      <td>Legislative</td>
                      <td>Fiscal policy</td>
                      <td>Medicaid appropriations, budget bills, fiscal impact statements, SNF rate updates, emergency funding</td>
                      <td>Annual (budget season)</td>
                      <td>PDF</td>
                      <td>PDF monitoring</td>
                      <td>High (budget season)</td>
                      <td>State legislature fiscal offices</td>
                    </tr>
                    <tr className="state-section">
                      <td colSpan="10"><strong>STATE REGULATORY SOURCES</strong></td>
                    </tr>
                    <tr>
                      <td>State Medicaid Agency Websites</td>
                      <td>State</td>
                      <td>Regulatory</td>
                      <td>Reimbursement policy</td>
                      <td>Official reimbursement rates, provider bulletins, fee schedules, State Plan Amendments (SPAs), emergency rate changes, policy memos</td>
                      <td>Weekly</td>
                      <td>PDF, HTML, Excel</td>
                      <td>Web scraping + Email monitoring</td>
                      <td>High</td>
                      <td>Varies by state (e.g., healthandwelfare.idaho.gov/providers)</td>
                    </tr>
                    <tr>
                      <td>State Provider Bulletins/Alerts</td>
                      <td>State</td>
                      <td>Regulatory</td>
                      <td>Policy updates</td>
                      <td>Email bulletins, RSS feeds, urgent announcements, rate changes, compliance updates, operational policies</td>
                      <td>As published</td>
                      <td>Email, RSS, HTML</td>
                      <td>Email subscriptions + RSS</td>
                      <td>High</td>
                      <td>State Medicaid agency news pages</td>
                    </tr>
                    <tr>
                      <td>State Budget Documents</td>
                      <td>State</td>
                      <td>Regulatory</td>
                      <td>Fiscal planning</td>
                      <td>Enacted budgets, appropriations reports, fiscal impact statements, rate-setting documents, legislative summaries</td>
                      <td>Annually</td>
                      <td>PDF</td>
                      <td>PDF monitoring</td>
                      <td>Medium</td>
                      <td>State fiscal offices, legislative budget documents</td>
                    </tr>
                    <tr className="state-section">
                      <td colSpan="10"><strong>STATE ENFORCEMENT & OVERSIGHT SOURCES</strong></td>
                    </tr>
                    <tr>
                      <td>State Survey Agencies (Health Depts)</td>
                      <td>State</td>
                      <td>Enforcement</td>
                      <td>Facility inspection</td>
                      <td>Survey/enforcement priorities, deficiency reports, sanctions, enforcement actions, inspection guidance, corrective action requirements</td>
                      <td>Monthly</td>
                      <td>PDF, HTML</td>
                      <td>Web scraping</td>
                      <td>Medium</td>
                      <td>State health department long-term care divisions</td>
                    </tr>
                    <tr>
                      <td>State Licensure/Certification Divisions</td>
                      <td>State</td>
                      <td>Oversight</td>
                      <td>Regulatory compliance</td>
                      <td>Licensing standards, certification requirements, complaint investigations, survey schedules, outcomes</td>
                      <td>As needed</td>
                      <td>HTML, PDF</td>
                      <td>Web scraping</td>
                      <td>Medium</td>
                      <td>State health departments</td>
                    </tr>
                    <tr>
                      <td>State Medicaid SPAs</td>
                      <td>State</td>
                      <td>Regulatory</td>
                      <td>Policy changes</td>
                      <td>State Plan Amendments, rate changes, policy modifications, federal approval process</td>
                      <td>As submitted</td>
                      <td>PDF</td>
                      <td>PDF monitoring</td>
                      <td>Medium</td>
                      <td>medicaid.gov/medicaid/spa/downloads/</td>
                    </tr>
                  </tbody>
                </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'development' && (
          <div className="development-tab">
            <div className="tasks-section">
              <h3>Development Tasks</h3>
              <div className="tasks-grid">
                {developmentTasks.map((task) => (
                  <div key={task.id} className="task-card">
                    <div className="task-header">
                      <div className="task-title">{task.title}</div>
                      <div className="task-priority">
                        <span 
                          className="priority-badge"
                          style={{ backgroundColor: getPriorityColor(task.priority) }}
                        >
                          {task.priority}
                        </span>
                      </div>
                    </div>
                    <div className="task-details">
                      <div className="task-category">{task.category}</div>
                      <div className="task-status">
                        <span 
                          className="status-dot" 
                          style={{ backgroundColor: getStatusColor(task.status) }}
                        ></span>
                        {task.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'issues' && (
          <div className="issues-tab">
            <div className="issues-section">
              <h3>Current Issues & Status</h3>
              <div className="issues-list">
                {projectStatus.issues.map((issue) => (
                  <div key={issue.id} className="issue-card">
                    <div className="issue-header">
                      <span className="issue-icon">{getIssueIcon(issue.type)}</span>
                      <div className="issue-message">{issue.message}</div>
                      <div className="issue-status">
                        <span 
                          className="status-dot" 
                          style={{ backgroundColor: getStatusColor(issue.status) }}
                        ></span>
                        {issue.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectTracker;
