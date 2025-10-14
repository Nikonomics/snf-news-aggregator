import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Medicaid policies data
const policiesPath = path.join(__dirname, '../data/medicaid-policies-structured.json');
const medicaidPolicies = JSON.parse(fs.readFileSync(policiesPath, 'utf8'));

// Extract all unique URLs
const urlsMap = new Map();

Object.entries(medicaidPolicies).forEach(([state, stateData]) => {
  stateData.policies.forEach(policy => {
    if (policy.sources && policy.sources !== 'See notes below' && policy.sources !== 'None found') {
      // Extract URLs from the sources field
      const urlMatches = policy.sources.match(/https?:\/\/[^\s]+/g);

      if (urlMatches) {
        urlMatches.forEach(url => {
          // Clean up URL (remove trailing punctuation)
          const cleanUrl = url.replace(/[.,;:)]$/, '');

          if (!urlsMap.has(cleanUrl)) {
            urlsMap.set(cleanUrl, {
              url: cleanUrl,
              states: [state],
              policies: [{
                state,
                category: policy.category,
                policyName: policy.policyName
              }]
            });
          } else {
            const existing = urlsMap.get(cleanUrl);
            if (!existing.states.includes(state)) {
              existing.states.push(state);
            }
            existing.policies.push({
              state,
              category: policy.category,
              policyName: policy.policyName
            });
          }
        });
      }
    }
  });
});

// Convert to array and sort by state count
const urlsArray = Array.from(urlsMap.values()).sort((a, b) => b.states.length - a.states.length);

// Create catalog
const catalog = {
  totalUrls: urlsArray.length,
  totalStates: Object.keys(medicaidPolicies).length,
  generatedAt: new Date().toISOString(),
  urls: urlsArray
};

// Save catalog
const outputPath = path.join(__dirname, '../data/medicaid-source-urls.json');
fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 2));

console.log(`✓ Extracted ${catalog.totalUrls} unique source URLs`);
console.log(`✓ Covering ${catalog.totalStates} states`);
console.log(`✓ Saved to: ${outputPath}`);

// Show top domains
const domainCounts = new Map();
urlsArray.forEach(item => {
  try {
    const domain = new URL(item.url).hostname;
    domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
  } catch (e) {
    // Invalid URL
  }
});

const topDomains = Array.from(domainCounts.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

console.log('\nTop 10 domains:');
topDomains.forEach(([domain, count]) => {
  console.log(`  ${domain}: ${count} URLs`);
});
