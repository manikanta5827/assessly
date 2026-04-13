import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import unzipper from 'unzipper';

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
    const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/HEAD`;

    const response = await fetch(zipUrl, {
      headers: {
        Authorization: `token ${this.token}`,
        'User-Agent': 'Assessly-Backend',
        Accept: 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      const msg = await response.text();
      throw new Error(`GitHub fetch failed [${response.status}]: ${msg}`);
    }

    if (!response.body) throw new Error('GitHub response body is empty');
    const nodeStream = Readable.fromWeb(response.body as import('node:stream/web').ReadableStream);
    const contextLines: string[] = [];

    await pipeline(
      nodeStream,

      unzipper.Parse(),

      async function (this: GitHubService, source: AsyncIterable<unzipper.Entry>) {
        for await (const entry of source) {
          const rawPath: string = entry.path;
          const entryType: string = entry.type; // 'File' or 'Directory'

          if (entryType === 'Directory') {
            entry.autodrain(); // release the stream slot
            continue;
          }

          const cleanedPath = rawPath.split('/').slice(1).join('/');

          if (!this.isSourceFile(cleanedPath)) {
            entry.autodrain(); // ← skip, zero RAM cost
            continue;
          }

          const uncompressedSize: number = entry.extra?.uncompressedSize ?? 0;
          const MAX_FILE_BYTES = 100 * 1024; // 100 KB

          if (uncompressedSize > MAX_FILE_BYTES) {
            console.warn(
              `[GitHubService] Skipping large file: ${cleanedPath} (${(uncompressedSize / 1024).toFixed(1)} KB)`
            );
            entry.autodrain();
            continue;
          }

          const content = await entry.buffer();
          contextLines.push(`--- FILE: ${cleanedPath} ---\n${content.toString('utf8')}\n`);
        }
      }.bind(this)
    );

    return contextLines.join('\n');
  }

  private isSourceFile(filePath: string): boolean {
    return (
      /\.(ts|tsx|js|jsx|py|go|rs|java|c|cpp|h|css|html|md|yaml|yml|toml)$/i.test(filePath) &&
      !filePath.includes('node_modules/') &&
      !filePath.includes('dist/') &&
      !filePath.includes('.next/') &&
      !filePath.includes('__pycache__/') &&
      !filePath.includes('.git/') &&
      !filePath.includes('.vscode/') &&
      !filePath.includes('-lock.') && // package-lock.json, yarn.lock etc.
      !filePath.includes('prettier') &&
      !filePath.includes('esbuild.config') &&
      !filePath.includes('.json') && // all JSON files excluded
      !/\.(png|jpg|jpeg|gif|svg|webp|ico|pdf|zip|gz|tar|mp4|mov|mp3|woff|woff2|ttf|otf|bin|map|exe|dll|so|dylib)$/i.test(
        filePath
      )
    );
  }
}
