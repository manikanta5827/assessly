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

  async buildContext(owner: string, repo: string): Promise<{ context: string; fileNames: string[] }> {
    const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/HEAD`;

    console.log('Fetching zipUrl: ', zipUrl);
    const response = await fetch(zipUrl, {
      headers: {
        Authorization: `token ${this.token}`,
        'User-Agent': 'Assessly-Backend',
        Accept: 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      const msg = await response.text();
      console.log(`GitHub fetch failed [${response.status}]: ${msg}`);
      throw new Error(`GitHub fetch failed [${response.status}]: ${msg}`);
    }

    if (!response.body) {
      console.log('GitHub response body is empty');
      throw new Error('GitHub response body is empty');
    }

    const contextLines: string[] = [];
    const fileNames: string[] = [];
    console.log('Processing zip content...');

    try {
      const buffer = Buffer.from(await response.arrayBuffer());
      const directory = await unzipper.Open.buffer(buffer);

      let filesProcessed = 0;
      for (const entry of directory.files) {
        const rawPath: string = entry.path;
        const entryType: string = entry.type;

        if (entryType === 'Directory') continue;

        const parts = rawPath.split('/');
        if (parts.length <= 1) continue;

        const cleanedPath = parts.slice(1).join('/');
        if (!cleanedPath) continue;

        if (!this.isSourceFile(cleanedPath)) continue;

        // check file size
        const MAX_FILE_BYTES = 1 * 1024 * 1024; // 1MB safely
        if (entry.uncompressedSize > MAX_FILE_BYTES) {
          console.warn(
            `[GitHubService] Skipping large file: ${cleanedPath} (${(entry.uncompressedSize / 1024).toFixed(1)} KB)`
          );
          continue;
        }

        filesProcessed++;
        fileNames.push(cleanedPath);
        console.log(`Extracting: ${cleanedPath} (${entry.uncompressedSize} bytes)`);

        const content = await entry.buffer();
        contextLines.push(`--- FILE: ${cleanedPath} ---\n${content.toString('utf8')}\n`);
      }

      console.log(`Done. Processed ${filesProcessed} source files.`);
      return { context: contextLines.join('\n'), fileNames };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('Error processing zip content: ', errorMessage);
      throw error;
    }
  }

  async getCommits(owner: string, repo: string): Promise<string[]> {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`;
    console.log(`[GitHubService] Fetching commits: ${url}`);

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `token ${this.token}`,
          'User-Agent': 'Assessly-Backend',
          Accept: 'application/vnd.github+json',
        },
      });

      if (!response.ok) {
        const msg = await response.text();
        console.error(`[GitHubService] Commit fetch failed [${response.status}]: ${msg}`);
        return [];
      }

      const commits = (await response.json()) as any[];
      return commits.map((c) => c.commit.message);
    } catch (error) {
      console.error('[GitHubService] Error fetching commits:', error);
      return [];
    }
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
