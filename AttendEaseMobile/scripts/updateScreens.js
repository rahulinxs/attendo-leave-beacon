const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, '..', 'screens');
const screenWrapperImport = "import { ScreenWrapper } from '../src/components/ScreenWrapper';";

// Files to skip (already handled or special cases)
const FILES_TO_SKIP = [
  'HomeScreen.tsx', // Already updated
  'AuthScreen.tsx'  // Has custom layout
];

// Patterns to identify the main container view
const MAIN_CONTAINER_PATTERNS = [
  // Pattern 1: Standard container with flex: 1
  /<View\s+style\s*=\s*{[^{}]*{[^{}]*flex\s*:\s*1[^}]*}[^}]*}>(\s*<\/View>)?/,
  // Pattern 2: ScrollView with flex: 1
  /<ScrollView\s+[^>]*style\s*=\s*{[^{}]*{[^{}]*flex\s*:\s*1[^}]*}[^}]*}>/,
  // Pattern 3: View with container style
  /<View\s+style\s*=\s*{styles\.container}>/,
  // Pattern 4: Any View with flex: 1 in styles
  /<View\s+style\s*=\s*{[^{}]*{[^}]*flex:\s*1[^}]*}[^}]*}>/
];

// Patterns to identify the closing tag
const CLOSING_TAG_PATTERNS = [
  // Pattern 1: Standard View closing
  /<\/View>\s*<\/View>\s*[^<]*$/,
  // Pattern 2: ScrollView closing
  /<\/ScrollView>\s*<\/View>\s*[^<]*$/,
  // Pattern 3: Any closing tag at the end
  /<\/View>\s*[^<]*$/
];

// Get all screen files
try {
  const files = fs.readdirSync(screensDir);
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  files.forEach(file => {
    try {
      if (!file.endsWith('.tsx') || FILES_TO_SKIP.includes(file)) {
        console.log(`Skipping ${file} - excluded`);
        skippedCount++;
        return;
      }
      
      const filePath = path.join(screensDir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Skip if already has ScreenWrapper
      if (content.includes('ScreenWrapper')) {
        console.log(`Skipping ${file} - already uses ScreenWrapper`);
        skippedCount++;
        return;
      }
      
      // Add import if not present
      if (!content.includes("import { ScreenWrapper }")) {
        // Find the last import statement
        const importMatches = content.match(/import\s+.*\s+from\s+['"].*['"];?/g);
        if (importMatches && importMatches.length > 0) {
          const lastImport = importMatches[importMatches.length - 1];
          content = content.replace(lastImport, `${lastImport}\n${screenWrapperImport}`);
        } else {
          // If no imports found, add after React import or at the top
          content = content.replace(
            /import React[^;]+;/,
            match => `${match}\n${screenWrapperImport}`
          ) || `${screenWrapperImport}\n${content}`;
        }
      }
      
      let updatedContent = content;
      let patternMatched = false;
      
      // Try different patterns to find the main container
      for (const pattern of MAIN_CONTAINER_PATTERNS) {
        if (pattern.test(updatedContent)) {
          // Replace the opening tag with ScreenWrapper
          updatedContent = updatedContent.replace(
            pattern,
            match => `<ScreenWrapper>\n      ${match}`
          );
          
          // Find and replace the corresponding closing tag
          for (const closingPattern of CLOSING_TAG_PATTERNS) {
            if (closingPattern.test(updatedContent)) {
              updatedContent = updatedContent.replace(
                closingPattern,
                match => `\n    ${match.replace(/\/\s*$/, '')}</ScreenWrapper>\n`
              );
              patternMatched = true;
              break;
            }
          }
          
          if (patternMatched) break;
        }
      }
      
      if (!patternMatched) {
        console.warn(`Warning: Could not find suitable container in ${file} - manual review needed`);
        errorCount++;
        return;
      }
      
      // Write the updated content back to the file
      fs.writeFileSync(filePath, updatedContent);
      console.log(`✅ Updated ${file}`);
      updatedCount++;
      
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
      errorCount++;
    }
  });
  
  // Print summary
  console.log('\n🎉 Screen updates completed!');
  console.log(`✅ Updated: ${updatedCount} screens`);
  console.log(`⏭️  Skipped: ${skippedCount} screens`);
  console.log(`❌ Errors: ${errorCount} screens`);
  
  if (errorCount > 0) {
    console.log('\n⚠️  Some screens may need manual review. Check the logs above for details.');
  }
  
} catch (error) {
  console.error('❌ Error updating screens:', error);
  process.exit(1);
}
