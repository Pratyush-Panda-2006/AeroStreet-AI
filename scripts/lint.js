// ============================================
// Cross-Platform Lint / Syntax Checker
// ============================================

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const targetDirs = ['server', 'api', 'tests'];
let checkedCount = 0;
let errorCount = 0;

function checkFile(filePath) {
  try {
    execFileSync(process.execPath, ['--check', filePath], { stdio: 'pipe' });
    checkedCount++;
  } catch (err) {
    console.error(`Syntax error in ${filePath}:`, err.stderr?.toString() || err.message);
    errorCount++;
  }
}

function walkDir(dir) {
  const fullPath = path.join(rootDir, dir);
  if (!fs.existsSync(fullPath)) return;

  const entries = fs.readdirSync(fullPath, { withFileTypes: true });
  for (const entry of entries) {
    const resPath = path.join(fullPath, entry.name);
    if (entry.isDirectory()) {
      walkDir(path.join(dir, entry.name));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      checkFile(resPath);
    }
  }
}

console.log('Running syntax checks across codebase...');
targetDirs.forEach(walkDir);

if (errorCount > 0) {
  console.error(`Lint check failed with ${errorCount} errors.`);
  process.exit(1);
} else {
  console.log(`Lint check passed! Successfully validated ${checkedCount} JavaScript files.`);
  process.exit(0);
}
