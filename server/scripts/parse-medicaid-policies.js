import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the Excel file
const excelPath = path.join(__dirname, '../data/medicaid-policies.xlsx');
const workbook = XLSX.readFile(excelPath);

// Function to parse state sheet properly
function parseStateSheet(sheetName, worksheet) {
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  const policies = [];
  let currentCategory = null;
  let currentPolicy = null;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const firstCell = row[0] ? String(row[0]).trim() : '';

    // Skip empty rows and header rows
    if (!firstCell || firstCell === 'Back to Summary') continue;

    // Detect category headers (usually bold/styled differently, check if it's a known category)
    const categoryKeywords = ['General', 'Primary cost centers', 'Adjustments', 'Supplement payments', 'Incentive payments',
                              'Occupancy-based adjustments', 'Case-mix adjustments', 'Other adjustments'];

    if (categoryKeywords.some(keyword => firstCell.includes(keyword))) {
      currentCategory = firstCell;
      continue;
    }

    // Detect policy rows (have actual content)
    if (firstCell && currentCategory) {
      // Look for policy name in first column
      const policyName = firstCell;
      const summary = row[1] ? String(row[1]).trim() : '';
      const sourceLanguage = row[2] ? String(row[2]).trim() : '';
      const sources = row[3] ? String(row[3]).trim() : '';
      const dates = row[4] ? String(row[4]).trim() : '';

      if (summary || sourceLanguage || sources) {
        policies.push({
          category: currentCategory,
          policyName: policyName,
          summary: summary,
          sourceLanguage: sourceLanguage,
          sources: sources,
          dates: dates
        });
      }
    }
  }

  return policies;
}

// Parse all state sheets
const medicaidPolicies = {};

workbook.SheetNames.forEach(sheetName => {
  // Skip Introduction and Summary sheets
  if (sheetName === 'Introduction' || sheetName === 'Summary') return;

  const worksheet = workbook.Sheets[sheetName];
  const policies = parseStateSheet(sheetName, worksheet);

  if (policies.length > 0) {
    medicaidPolicies[sheetName] = {
      stateName: sheetName,
      policies: policies,
      totalPolicies: policies.length
    };
  }
});

// Save to JSON
const outputPath = path.join(__dirname, '../data/medicaid-policies-structured.json');
fs.writeFileSync(outputPath, JSON.stringify(medicaidPolicies, null, 2));

console.log(`✓ Parsed ${Object.keys(medicaidPolicies).length} states`);
console.log(`✓ Data saved to: ${outputPath}`);

// Print sample
const sampleState = Object.keys(medicaidPolicies)[0];
console.log(`\nSample (${sampleState}):`, JSON.stringify(medicaidPolicies[sampleState], null, 2).substring(0, 500) + '...');
