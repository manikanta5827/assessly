import { Octokit } from 'octokit';
import { unzipSync } from 'fflate';

export class GitHubService {
  private readonly octokit: Octokit;

  constructor(token?: string) {
    this.octokit = new Octokit({ auth: token || process.env.GITHUB_TOKEN });
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
    // 1. Fetch zip as a Buffer
    const { data } = await this.octokit.rest.repos.downloadZipballArchive({
      owner,
      repo,
      ref: 'main', // Default to main
    });

    const zipBuffer = new Uint8Array(data as ArrayBuffer);
    const contextLines: string[] = [];

    // 2. Unzip everything
    const decompressed = unzipSync(zipBuffer);

    for (const [path, content] of Object.entries(decompressed)) {
      const isSource =
        /\.(ts|tsx|js|jsx|py|go|rs|java|c|cpp|h|css|html|md|yaml|yml|toml)$/i.test(path) &&
        !path.includes('node_modules/') &&
        !path.includes('dist/') &&
        !path.includes('.next/') &&
        !path.includes('__pycache__/') &&
        !path.includes('.git/') &&
        !path.includes('.vscode/') &&
        !path.includes('-lock.') &&
        !path.includes('prettier') &&
        !path.includes('esbuild.config') &&
        !path.includes('.json') && // Strictly exclude JSON
        !/\.(png|jpg|jpeg|gif|svg|webp|ico|pdf|zip|gz|tar|mp4|mov|mp3|woff|woff2|ttf|otf|bin|map|exe|dll|so|dylib)$/i.test(
          path
        );

      // Skip directories (empty content) or non-source files
      if (content.length === 0 || !isSource) continue;

      // Decode only the files we actually want to keep
      const text = new TextDecoder().decode(content);

      // GitHub zip paths start with 'owner-repo-hash/' - we strip that
      const cleanedPath = path.split('/').slice(1).join('/');

      contextLines.push(`--- FILE: ${cleanedPath} ---`);
      contextLines.push(text);
      contextLines.push(''); // Add newline for better separation
    }

    return contextLines.join('\n');
  }
}
