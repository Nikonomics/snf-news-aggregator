// Script to add new fields to all tasks in ProjectData.js

const fs = require('fs');

// Read the current ProjectData.js file
const filePath = './src/data/ProjectData.js';
let content = fs.readFileSync(filePath, 'utf8');

// Helper function to create a task with all required fields
const createTask = (baseTask) => {
  return {
    ...baseTask,
    assignedTo: "Unassigned",
    dueDate: null,
    estimatedHours: null,
    actualHours: 0,
    dependencies: [],
    createdDate: "2025-01-16",
    lastUpdated: "2025-01-16",
    tags: []
  };
};

// Count tasks before update
const taskMatches = content.match(/\{\s*id:\s*'[^']*',[\s\S]*?\}/g);
const taskCount = taskMatches ? taskMatches.length : 0;

console.log(`Found ${taskCount} tasks to update`);

// Add the createTask helper function to the file
const helperFunction = `
// Helper function to create a task with all required fields
export const createTask = (baseTask) => {
  return {
    ...baseTask,
    assignedTo: "Unassigned",
    dueDate: null,
    estimatedHours: null,
    actualHours: 0,
    dependencies: [],
    createdDate: "2025-01-16",
    lastUpdated: "2025-01-16",
    tags: []
  };
};

`;

// Add the helper function after the imports
content = content.replace(
  '// Extracted from ProjectTracker.jsx for better organization',
  '// Extracted from ProjectTracker.jsx for better organization' + helperFunction
);

// Update each task object to include the new fields
content = content.replace(
  /\{\s*id:\s*'([^']*)',[\s\S]*?\}/g,
  (match) => {
    // Parse the existing task object (simplified approach)
    const lines = match.split('\n');
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      newLines.push(lines[i]);
      
      // If this is the last property before closing brace, add new fields
      if (lines[i].trim() === '}' && i > 0) {
        // Insert new fields before the closing brace
        newLines.splice(-1, 0, 
          '    assignedTo: "Unassigned",',
          '    dueDate: null,',
          '    estimatedHours: null,',
          '    actualHours: 0,',
          '    dependencies: [],',
          '    createdDate: "2025-01-16",',
          '    lastUpdated: "2025-01-16",',
          '    tags: []'
        );
      }
    }
    
    return newLines.join('\n');
  }
);

// Write the updated content back to the file
fs.writeFileSync(filePath, content);

console.log('Task fields updated successfully!');
console.log(`Updated ${taskCount} tasks with new fields`);
