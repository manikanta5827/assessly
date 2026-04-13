import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

export class GitHubService {
  private readonly token?: string;

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN;
  }

  parseUrl(url: string) {
    const regex = /github\.com\/([^/]+)\/([^/]+)/;
    const match = url.match(regex);
    if (!match) throw new Error('Invalid GitHub URL');
    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, ''),
    };
  }

  async buildContext(owner: string, repo: string): Promise<string> {
    const stageId = Math.random().toString(36).substring(7);
    const tmpDir = `/tmp/assessly-${stageId}`;
    const zipPath = `${tmpDir}/repo.zip`;
    const extractDir = `${tmpDir}/extracted`;

    try {
      // 1. Setup directories
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      if (!fs.existsSync(extractDir)) fs.mkdirSync(extractDir, { recursive: true });

      // 2. Fetch zipball as a stream
      // We use the direct API URL to get a stream response
      const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/main`;
      const response = await fetch(zipUrl, {
        headers: {
          Authorization: `token ${this.token}`,
          'User-Agent': 'Assessly-Backend',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch zipball: ${response.statusText}`);
      }

      const fileStream = fs.createWriteStream(zipPath);
      // @ts-expect-error Node 18+
      await pipeline(Readable.fromWeb(response.body), fileStream);

      // 3. Unzip using native 'unzip' utility (efficient & memory safe)
      const unzipResult = spawnSync('unzip', ['-q', zipPath, '-d', extractDir]);
      if (unzipResult.status !== 0) {
        throw new Error(`Unzip failed: ${unzipResult.stderr.toString()}`);
      }

      const contextLines: string[] = [];

      // 4. Recursively walk the directory and process files
      const processDir = async (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            await processDir(fullPath);
          } else {
            const relPath = path.relative(extractDir, fullPath);

            if (this.isSourceFile(relPath)) {
              const content = fs.readFileSync(fullPath, 'utf8');

              // GitHub zip paths start with 'owner-repo-hash/' - we strip that
              const cleanedPath = relPath.split(path.sep).slice(1).join('/');

              contextLines.push(`--- FILE: ${cleanedPath} ---`);
              contextLines.push(content);
              contextLines.push(''); // Add newline for better separation
            }
          }
        }
      };

      await processDir(extractDir);

      return contextLines.join('\n');
    } finally {
      // 5. Cleanup
      try {
        if (fs.existsSync(tmpDir)) {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      } catch (err) {
        console.error('Failed to cleanup temp files:', err);
      }
    }
  }

  private isSourceFile(filePath: string): boolean {
    const isSource =
      /\.(ts|tsx|js|jsx|py|go|rs|java|c|cpp|h|css|html|md|yaml|yml|toml)$/i.test(filePath) &&
      !filePath.includes('node_modules/') &&
      !filePath.includes('dist/') &&
      !filePath.includes('.next/') &&
      !filePath.includes('__pycache__/') &&
      !filePath.includes('.git/') &&
      !filePath.includes('.vscode/') &&
      !filePath.includes('-lock.') &&
      !filePath.includes('prettier') &&
      !filePath.includes('esbuild.config') &&
      !filePath.includes('.json') && // Strictly exclude JSON
      !/\.(png|jpg|jpeg|gif|svg|webp|ico|pdf|zip|gz|tar|mp4|mov|mp3|woff|woff2|ttf|otf|bin|map|exe|dll|so|dylib)$/i.test(
        filePath
      );
    return isSource;
  }
}
