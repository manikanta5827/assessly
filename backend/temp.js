import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';

const owner = 'manikanta5827';
const repo = 'Taskflow-Manikanta';
const filePath = 'tests/integration/api.test.ts'; // The relative path in the repo
const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

const response = await fetch(fileUrl, {
  headers: {
    Authorization: `token ${process.env.GITHUB_TOKEN}`,
    'User-Agent': 'Assessly-Backend',
    // This header tells GitHub to send the raw file content directly
    'Accept': 'application/vnd.github.v3.raw',
  },
});

if (!response.ok) {
  const msg = await response.text();
  throw new Error(`Failed to fetch file [${response.status}]: ${msg}`);
}

// Save the single file locally
const localDest = fs.createWriteStream('./downloaded-file.js');
await pipeline(response.body, localDest);

console.log('File downloaded successfully!');
