import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the Excel file
const excelPath = path.join(__dirname, '../data/medicaid-policies.xlsx');
const workbook = XLSX.readFile(excelPath);

console.log('Sheet Names:', workbook.SheetNames);
console.log('\n--- First 5 rows of each sheet ---\n');

// Parse each sheet
const allData = {};

workbook.SheetNames.forEach(sheetName => {
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);

  console.log(`\n=== Sheet: ${sheetName} ===`);
  console.log('Total rows:', jsonData.length);
  console.log('Columns:', Object.keys(jsonData[0] || {}));
  console.log('First row sample:', JSON.stringify(jsonData[0], null, 2));

  allData[sheetName] = jsonData;
});

// Save to JSON
const outputPath = path.join(__dirname, '../data/medicaid-policies.json');
fs.writeFileSync(outputPath, JSON.stringify(allData, null, 2));

console.log(`\n✓ Data saved to: ${outputPath}`);
console.log(`Total sheets parsed: ${Object.keys(allData).length}`);
