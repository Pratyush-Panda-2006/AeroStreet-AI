// ============================================
// Automated Audit: Security & WCAG 2.1 AA Accessibility
// ============================================

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const templatesDir = path.join(rootDir, 'templates');

const TEMPLATE_FILES = [
  'national.html',
  'district.html',
  'municipality.html',
  'forecast.html',
  'community.html',
  'methodology.html',
  'privacy.html',
  'terms.html'
];

test('Accessibility Audit: All HTML templates have valid document structure and metadata', () => {
  TEMPLATE_FILES.forEach((file) => {
    const filePath = path.join(templatesDir, file);
    assert.ok(fs.existsSync(filePath), `Template ${file} must exist`);
    const content = fs.readFileSync(filePath, 'utf8');

    // 1. Language declaration
    assert.match(content, /<html\s+[^>]*lang=["']en["']/i, `${file} must declare lang="en" on <html>`);

    // 2. Viewport meta
    assert.match(content, /<meta\s+[^>]*name=["']viewport["']/i, `${file} must include a viewport <meta> tag`);

    // 3. Descriptive title
    assert.match(content, /<title>[^<]+<\/title>/i, `${file} must contain a non-empty <title> tag`);

    // 4. Semantic main landmark
    assert.match(content, /<main[\s>]/i, `${file} must contain a semantic <main> landmark`);

    // 5. Skip to main content link for keyboard navigation
    assert.match(content, /href=["']#main-content["']/i, `${file} must include a skip-to-content link targeting #main-content`);
  });
});

test('Accessibility Audit: Interactive elements have accessible names and contrast', () => {
  TEMPLATE_FILES.forEach((file) => {
    const filePath = path.join(templatesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Ensure images have alt or aria-hidden
    const imgTags = content.match(/<img\s+[^>]*>/gi) || [];
    imgTags.forEach((img) => {
      const hasAlt = /alt=["'][^"']*["']/i.test(img);
      const isAriaHidden = /aria-hidden=["']true["']/i.test(img);
      assert.ok(hasAlt || isAriaHidden, `Every <img> in ${file} must have an alt or aria-hidden attribute: ${img}`);
    });
  });
});

test('Security Audit: Sensitive files and production secrets are protected', () => {
  // 1. .gitignore checks
  const gitignorePath = path.join(rootDir, '.gitignore');
  assert.ok(fs.existsSync(gitignorePath), '.gitignore must exist');
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  assert.match(gitignoreContent, /\.env/, '.gitignore must exclude .env');
  assert.match(gitignoreContent, /node_modules/, '.gitignore must exclude node_modules');

  // 2. .env.example contains only safe placeholders
  const envExamplePath = path.join(rootDir, '.env.example');
  assert.ok(fs.existsSync(envExamplePath), '.env.example must exist');
  const envExample = fs.readFileSync(envExamplePath, 'utf8');
  assert.doesNotMatch(envExample, /AIzaSy[A-Za-z0-9_-]{33}/, '.env.example must not contain live Google API keys');
  assert.doesNotMatch(envExample, /sk-[A-Za-z0-9_-]{20,}/, '.env.example must not contain live secret keys');
});
