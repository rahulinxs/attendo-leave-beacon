const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, '..', 'screens');
const screenWrapperPath = 'src/components/ScreenWrapper';

// Files to skip (already handled or special cases)
const FILES_TO_SKIP = [
  'AuthScreen.tsx',  // Has custom layout
  'HomeScreen.tsx'   // Already updated
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
      
      // Check if the file already has ScreenWrapper
      if (content.includes('ScreenWrapper')) {
        // Update the import path if it's using the old path
        content = content.replace(
          /import\s+\{\s*ScreenWrapper\s*\}\s+from\s+['"]\.\.\/components\/ScreenWrapper['"]/,
          `import { ScreenWrapper } from '${screenWrapperPath}';`
        );
        
        // Ensure the ScreenWrapper is used correctly
        if (!content.match(/<ScreenWrapper[^>]*>[\s\S]*<\/ScreenWrapper>/m)) {
          // If ScreenWrapper is imported but not used, wrap the content
          const componentMatch = content.match(/export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{([\s\S]*?)\n\s*return\s*\(/);
          if (componentMatch) {
            const returnStatement = componentMatch[0];
            const returnContent = content.substring(
              content.indexOf(returnStatement) + returnStatement.length,
              content.lastIndexOf(');') + 1
            );
            
            content = content.replace(
              returnContent,
              `
        <ScreenWrapper>${returnContent.trim()}\n        </ScreenWrapper>\n      );
  `
            );
            
            console.log(`✅ Updated ${file} with proper ScreenWrapper usage`);
            updatedCount++;
          } else {
            console.warn(`⚠️  Could not find component structure in ${file} - manual review needed`);
            errorCount++;
          }
        } else {
          console.log(`✓ ${file} already has proper ScreenWrapper usage`);
          skippedCount++;
        }
      } else {
        // Add ScreenWrapper import and wrap the content
        const importStatement = `import { ScreenWrapper } from '${screenWrapperPath}';`;
        
        // Add import after the last import statement
        const importMatches = content.match(/import\s+.*\s+from\s+['"].*['"];?/g);
        if (importMatches && importMatches.length > 0) {
          const lastImport = importMatches[importMatches.length - 1];
          content = content.replace(lastImport, `${lastImport}\n${importStatement}`);
        } else {
          // If no imports found, add after React import or at the top
          content = content.replace(
            /import React[^;]+;/,
            match => `${match}\n${importStatement}`
          ) || `${importStatement}\n${content}`;
        }
        
        // Find the main component's return statement and wrap it with ScreenWrapper
        const componentMatch = content.match(/export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{([\s\S]*?)\n\s*return\s*\(/);
        if (componentMatch) {
          const returnStatement = componentMatch[0];
          const returnContent = content.substring(
            content.indexOf(returnStatement) + returnStatement.length,
            content.lastIndexOf(');') + 1
          );
          
          content = content.replace(
            returnContent,
            `
        <ScreenWrapper>${returnContent.trim()}\n        </ScreenWrapper>\n      );
  `
          );
          
          console.log(`✅ Added ScreenWrapper to ${file}`);
          updatedCount++;
        } else {
          console.warn(`⚠️  Could not find component structure in ${file} - manual review needed`);
          errorCount++;
        }
      }
      
      // Write the updated content back to the file
      fs.writeFileSync(filePath, content);
      
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
      errorCount++;
    }
  });
  
  // Print summary
  console.log('\n🎉 ScreenWrapper updates completed!');
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
