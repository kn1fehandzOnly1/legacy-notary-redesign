const fs = require('fs');
const path = require('path');

const contentFile = 'C:\\Users\\Under\\.gemini\\antigravity\\brain\\cbb8433f-ff22-4932-a26f-e20e8305e8c0\\.system_generated\\steps\\7\\content.md';
const html = fs.readFileSync(contentFile, 'utf8');

// Extract images
const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
let match;
const images = new Set();
while ((match = imgRegex.exec(html)) !== null) {
  images.add(match[1]);
}

// Extract bg images
const bgRegex = /url\(["']?([^"')]+)["']?\)/gi;
while ((match = bgRegex.exec(html)) !== null) {
  if (match[1].startsWith('http') || match[1].startsWith('//')) {
    images.add(match[1]);
  }
}

console.log('=== IMAGES FOUND ===');
console.log(Array.from(images));

// Clean HTML tags to get raw text lines
const cleanText = html.replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<[^>]+>/g, '\n')
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.length > 2 && !line.includes('{') && !line.includes('}'));

// Remove duplicates while preserving order
const uniqueText = [];
const seen = new Set();
for (const t of cleanText) {
  if (!seen.has(t)) {
    seen.add(t);
    uniqueText.push(t);
  }
}

console.log('=== TEXT CONTENT EXTRACTED ===');
console.log(uniqueText.slice(0, 100).join('\n'));
