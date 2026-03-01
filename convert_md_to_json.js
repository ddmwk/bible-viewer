import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RAW_DIR = path.join(__dirname, 'src/data/raw');
const JSON_DIR = path.join(__dirname, 'src/data/json');

// Ensure JSON directory exists
if (!fs.existsSync(JSON_DIR)) {
  fs.mkdirSync(JSON_DIR, { recursive: true });
}

function convertMarkdownToJson(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const verses = [];
  let currentVerse = null;
  
  // Regex to match "###### {number}"
  const verseHeaderRegex = /^#{6}\s+(\d+)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip Metadata or empty lines at start if needed, but our logic below handles verse extraction well.
    // We only care about content AFTER a verse header.
    
    const match = line.match(verseHeaderRegex);
    if (match) {
      // Found a new verse header
      currentVerse = parseInt(match[1], 10);
      // Determine array index (0-based)
      // Verse 1 -> index 0
      verses[currentVerse - 1] = ""; 
    } else if (currentVerse !== null && line.length > 0) {
       // Append content to current verse
       // Skip lines with navigation links like "|| [[창세기]] | [[창2]] ▷" or stars "***"
       if (line.includes('[[') || line.includes('***')) continue;
       
       if (verses[currentVerse - 1]) {
         verses[currentVerse - 1] += " " + line;
       } else {
         verses[currentVerse - 1] = line;
       }
    }
  }

  // Clean empty/null slots if any verses were skipped (rare in Bible)
  // But we want to preserve index=verse-1 relation.
  // Replace undefined with empty string
  for(let i=0; i<verses.length; i++) {
    if(verses[i] === undefined) verses[i] = "";
  }

  return verses;
}

function processDirectory(directory) {
  const items = fs.readdirSync(directory);

  items.forEach(item => {
    const fullPath = path.join(directory, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Replicate directory structure in JSON folder
      // But maybe we want flattened or renamed structure? 
      // User asked for "창세기_01.json". 
      // The current structure is "src/data/json/01창세기/..."
      // Let's keep the folder structure for now but rename the files inside.
      
      const relativePath = path.relative(RAW_DIR, fullPath);
      const targetDir = path.join(JSON_DIR, relativePath);
      
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      processDirectory(fullPath);
    } else if (item.endsWith('.md')) {
      // console.log(`Processing: ${fullPath}`);
      const jsonContent = convertMarkdownToJson(fullPath);
      
      // Filename logic
      // Input: "창1.md" in folder "01창세기"
      // Desired Output: "창세기_01.json"
      
      // 1. Get Book Name from parent directory
      const parentDirName = path.basename(directory); // e.g., "01창세기"
      // Remove leading digits if present? "01창세기" -> "창세기"
      // Assuming pattern is 2 digits + Name
      const bookName = parentDirName.replace(/^\d+/, ''); 

      // 2. Get Chapter Number from filename
      // Input: "창1.md" -> 1
      // Regex: Non-digits + digits + .md
      const filenameMatch = item.match(/(\d+)\.md$/);
      
      if (filenameMatch) {
          const chapterNum = parseInt(filenameMatch[1], 10);
          const chapterPad = String(chapterNum).padStart(2, '0');
          
          const newFileName = `${bookName}_${chapterPad}.json`;
          
          const relativePath = path.relative(RAW_DIR, directory);
          const targetPath = path.join(JSON_DIR, relativePath, newFileName);
          
          const output = {
            verses: jsonContent
          };
          
          fs.writeFileSync(targetPath, JSON.stringify(output, null, 2), 'utf-8');
          console.log(`Converted: ${item} -> ${newFileName}`);
      } else {
          // Fallback for files that don't match strict "NameNumber.md" pattern
          // e.g., "창세기.md" (Intro file?)
           const newFileName = item.replace('.md', '.json');
           const relativePath = path.relative(RAW_DIR, directory);
           const targetPath = path.join(JSON_DIR, relativePath, newFileName);
           
           const output = {
            verses: jsonContent
           };
           fs.writeFileSync(targetPath, JSON.stringify(output, null, 2), 'utf-8');
           console.log(`Converted (Fallback): ${item} -> ${newFileName}`);
      }
    }
  });
}

console.log("Starting conversion...");
try {
  processDirectory(RAW_DIR);
  console.log("Conversion complete!");
} catch (error) {
  console.error("Conversion failed:", error);
}
