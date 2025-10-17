import fs from 'fs';

// Read the ProjectData.js file
const filePath = './src/data/ProjectData.js';
let content = fs.readFileSync(filePath, 'utf8');

// Count tasks before update
const taskMatches = content.match(/\{\s*id:\s*'[^']*',[\s\S]*?\}/g);
const taskCount = taskMatches ? taskMatches.length : 0;

console.log(`Found ${taskCount} tasks to update`);

// Function to add new fields to a task object
const addNewFieldsToTask = (taskMatch) => {
  // Check if the task already has the new fields
  if (taskMatch.includes('assignedTo:')) {
    return taskMatch; // Already updated
  }
  
  // Add new fields before the closing brace
  const newFields = [
    '    assignedTo: "Unassigned",',
    '    dueDate: null,',
    '    estimatedHours: null,',
    '    actualHours: 0,',
    '    dependencies: [],',
    '    createdDate: "2025-01-16",',
    '    lastUpdated: "2025-01-16",',
    '    tags: []'
  ].join('\n');
  
  // Insert new fields before the closing brace
  return taskMatch.replace(/\s*\}/, `\n${newFields}\n  }`);
};

// Update all task objects
let updatedCount = 0;
content = content.replace(/\{\s*id:\s*'[^']*',[\s\S]*?\}/g, (match) => {
  const updated = addNewFieldsToTask(match);
  if (updated !== match) {
    updatedCount++;
  }
  return updated;
});

// Write the updated content back to the file
fs.writeFileSync(filePath, content);

console.log(`Successfully updated ${updatedCount} tasks with new fields`);
console.log(`Total tasks processed: ${taskCount}`);
