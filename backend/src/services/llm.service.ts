import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { PromptTemplate } from '@langchain/core/prompts';
import { BaseMessage } from '@langchain/core/messages';

export type LLMProvider = 'openai' | 'anthropic';

export interface LLMUsageStats {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  cachedTokens?: number;
}

export class LLMService {
  private readonly model: ChatOpenAI | ChatAnthropic;
  private readonly provider: LLMProvider;
  private readonly modelName: string;

  private readonly PRICING = {
    openai: {
      'gpt-4o': { input: 2.5, output: 10.0 }, // per 1M tokens
      'gpt-4o-mini': { input: 0.15, output: 0.6 },
    },
    anthropic: {
      'claude-3-5-sonnet-latest': { input: 3.0, output: 15.0 },
      'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
      'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    },
  };

  constructor(provider: LLMProvider = 'openai', apiKey: string, modelName?: string) {
    this.provider = provider;
    if (provider === 'openai') {
      this.modelName = modelName || 'gpt-4o';
      this.model = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: this.modelName,
        temperature: 0,
      });
    } else {
      this.modelName = modelName || 'claude-3-5-sonnet-latest';
      this.model = new ChatAnthropic({
        anthropicApiKey: apiKey,
        modelName: this.modelName,
        temperature: 0,
      });
    }
  }

  async extractRequirements(
    instructions: string
  ): Promise<{ requirements: any[]; usage: LLMUsageStats | null }> {
    console.log(`[LLMService] Starting extractRequirements...`);
    const prompt = PromptTemplate.fromTemplate(`
You are an expert requirement engineer. Your task is to extract clear, testable, and atomic requirements from the provided assignment text.

### Extraction Rules:
- **Atomic Requirements**: Each item must represent a single, specific functionality or technical constraint.
- **Classification**: Assign a category (Feature, Technical, Security, Documentation, etc.) and an importance score (1-10, where 10 is critical).
- **Suggested Files**: Based on typical project structures, suggest 1-2 files or directories where this requirement would likely be implemented.
- **No Duplicates**: Ensure no overlapping or redundant requirements.
- **Objectivity**: Use professional, technical language.

### Output JSON Format:
[
  {{
    "id": "REQ_1",
    "text": "User authentication - Implement secure sign-in/up using JWT.",
    "category": "Feature",
    "suggestedFiles": ["src/services/auth.service.ts", "src/controllers/auth.controller.ts"]
  }},
  {{
    "id": "REQ_2",
    "text": "API Documentation - Provide Swagger or README endpoints guide.",
    "category": "Documentation",
    "suggestedFiles": ["README.md", "openapi.yaml"]
  }}
]

### Assignment Text:
{instructions}
`);

    const chain = prompt.pipe(this.model);
    const response = (await chain.invoke({ instructions })) as BaseMessage;
    const usage = this.calculateUsage(response);

    const content =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const jsonStr = content.match(/\[[\s\S]*\]/)?.[0] || content;

    return {
      requirements: JSON.parse(jsonStr),
      usage,
    };
  }

  async generateRepoMap(
    fileNames: string[],
    repoSnapshot: string
  ): Promise<{ repoMap: any; usage: LLMUsageStats | null }> {
    console.log(`[LLMService] Starting generateRepoMap... (${fileNames.length} files)`);
    const prompt = PromptTemplate.fromTemplate(`
### Candidate's Code Snapshot:
{repoSnapshot}

---

You are a senior developer analyzing a codebase. Generate a JSON map of filenames to summaries.

### Rules:
- For each file provided, write a 1-3 sentence summary explaining its purpose in the project.
- Return ONLY the requested JSON structure.

### Output JSON Format:
{{
  "tree": [
    ${fileNames.map((f) => `"${f}"`).join(',')}
  ],
  "files": {{
    "path/to/file.ts": {{
      "summary": "2-3 sentences describing what this file does"
    }}
  }}
}}
`);

    const chain = prompt.pipe(this.model);
    const response = (await chain.invoke({ repoSnapshot })) as BaseMessage;
    const usage = this.calculateUsage(response);

    const content =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] || content;

    return {
      repoMap: JSON.parse(jsonStr),
      usage,
    };
  }

  async analyzeCodeQuality(
    repoSnapshot: string
  ): Promise<{ analysis: any; usage: LLMUsageStats | null }> {
    console.log(`[LLMService] Starting analyzeCodeQuality...`);
    const prompt = PromptTemplate.fromTemplate(`
You are an expert code auditor. Analyze the provided codebase snapshot for quality, readability, and best practices.

### Candidate's Code Snapshot:
{repoSnapshot}

### Output JSON Format:
{{
  "score": 0-100,
  "breakdown": {{
    "readability": number,
    "structure": number,
    "naming": number,
    "bestPractices": number
  }},
  "summary": "Concise summary of code quality",
  "issues": ["Issue 1", "Issue 2"]
}}
`);

    const chain = prompt.pipe(this.model);
    const response = (await chain.invoke({ repoSnapshot })) as BaseMessage;
    const usage = this.calculateUsage(response);

    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] || content;

    return { analysis: JSON.parse(jsonStr), usage };
  }

  async analyzeRunnability(
    repoSnapshot: string
  ): Promise<{ analysis: any; usage: LLMUsageStats | null }> {
    console.log(`[LLMService] Starting analyzeRunnability...`);
    const prompt = PromptTemplate.fromTemplate(`
You are a DevOps expert. Analyze the codebase snapshot for setup clarity and "runnability" (Docker, scripts, CI, env files, tests).

### Candidate's Code Snapshot:
{repoSnapshot}

### Output JSON Format:
{{
  "score": 0-100,
  "hasDocker": boolean,
  "hasEnvExample": boolean,
  "hasScripts": boolean,
  "ciDetected": boolean,
  "testDetection": {{
    "hasTests": boolean,
    "language": "node | python | go | unknown",
    "framework": "jest | vitest | mocha | pytest | go test | unknown",
    "command": "exact command string to run tests",
    "path": "folder path where tests are located",
    "reason": "how you detected the test setup"
  }},
  "summary": "Summary of setup quality",
  "issues": ["Issue 1", "Issue 2"]
}}
`);

    const chain = prompt.pipe(this.model);
    const response = (await chain.invoke({ repoSnapshot })) as BaseMessage;
    const usage = this.calculateUsage(response);

    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] || content;

    return { analysis: JSON.parse(jsonStr), usage };
  }

  async analyzeAIPatterns(
    repoSnapshot: string
  ): Promise<{ analysis: any; usage: LLMUsageStats | null }> {
    console.log(`[LLMService] Starting analyzeAIPatterns...`);
    const prompt = PromptTemplate.fromTemplate(`
You are an expert at detecting AI-generated code patterns. Analyze the code style consistency, repetition, and commit behavior.

### Candidate's Code Snapshot:
{repoSnapshot}

### Output JSON Format:
{{
  "score": 0-100,
  "confidence": 0-100,
  "signals": {{
    "uniformStyle": boolean,
    "lowIterationEvidence": boolean,
    "genericPatterns": boolean,
    "commitMismatch": boolean
  }},
  "summary": "Brief summary",
  "reasoning": "Detailed reasoning"
}}
`);

    const chain = prompt.pipe(this.model);
    const response = (await chain.invoke({ repoSnapshot })) as BaseMessage;
    const usage = this.calculateUsage(response);

    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] || content;

    return { analysis: JSON.parse(jsonStr), usage };
  }

  async evaluateRequirements(
    repoSnapshot: string,
    requirements: any[]
  ): Promise<{ evaluation: any[]; usage: LLMUsageStats | null }> {
    console.log(`[LLMService] Starting evaluateRequirements...`);
    const prompt = PromptTemplate.fromTemplate(`
Evaluate the candidate's implementation against specific requirements.

### Candidate's Code Snapshot:
{repoSnapshot}

### Requirements:
{requirementsList}

### Output JSON Format (Array):
[
  {{
    "id": "REQ_X",
    "text": "...",
    "status": "MET | PARTIAL | NOT_MET",
    "confidence": 0-1,
    "evidence": {{ "file": "...", "snippet": "..." }},
    "reasoning": "..."
  }}
]
`);

    const requirementsList = requirements
      .map((r) => `- [${r.id}] ${r.text}`)
      .join('\n');

    const chain = prompt.pipe(this.model);
    const response = (await chain.invoke({ repoSnapshot, requirementsList })) as BaseMessage;
    const usage = this.calculateUsage(response);

    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const jsonStr = content.match(/\[[\s\S]*\]/)?.[0] || content;

    return { evaluation: JSON.parse(jsonStr), usage };
  }

  async generateFinalReport(
    inputs: {
      requirementsEvaluation: any[];
      codeQuality: any;
      runnability: any;
      commitAnalysis: any;
      aiAnalysis: any;
      score: number;
    }
  ): Promise<{ report: any; usage: LLMUsageStats | null }> {
    console.log(`[LLMService] Starting generateFinalReport...`);
    const prompt = PromptTemplate.fromTemplate(`
You are a senior engineer writing a hiring evaluation report. Use the provided inputs as ground truth.
DO NOT recompute scores or re-evaluate requirements.

### Evaluation Data:
Score: {score}
Requirements Evaluation: {requirementsEvaluation}
Code Quality: {codeQuality}
Runnability: {runnability}
Commit Analysis: {commitAnalysis}
AI Analysis: {aiAnalysis}

### Output JSON Format:
{{
  "score": {score},
  "summary": "2-3 lines overall summary",
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "hiringRecommendation": "STRONG_HIRE | HIRE | NO_HIRE",
  "interviewQuestions": [
    {{
      "question": "...",
      "focusArea": "..."
    }}
  ]
}}
`);

    const chain = prompt.pipe(this.model);
    const response = (await chain.invoke({
      score: inputs.score,
      requirementsEvaluation: JSON.stringify(inputs.requirementsEvaluation),
      codeQuality: JSON.stringify(inputs.codeQuality),
      runnability: JSON.stringify(inputs.runnability),
      commitAnalysis: JSON.stringify(inputs.commitAnalysis),
      aiAnalysis: JSON.stringify(inputs.aiAnalysis),
    })) as BaseMessage;
    const usage = this.calculateUsage(response);

    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] || content;

    return { report: JSON.parse(jsonStr), usage };
  }

  async analyzeAssessment(
    repoSnapshot: string,
    _instructions: string,
    requirements: any[]
  ): Promise<{ analysis: any; usage: LLMUsageStats | null }> {
    // This method is now redundant or can be removed if not used elsewhere.
    // Keeping a stub if needed for backwards compatibility during migration.
    return this.evaluateRequirements(repoSnapshot, requirements).then(res => ({
      analysis: { requirementsEvaluation: res.evaluation },
      usage: res.usage
    }));
  }


  async analyzeCommits(
    commitMessages: string[]
  ): Promise<{ analysis: any; usage: LLMUsageStats | null }> {
    console.log(`[LLMService] Starting analyzeCommits... (${commitMessages.length} messages)`);
    if (commitMessages.length === 0) {
      return {
        analysis: {
          qualityScore: 0,
          summary: "No commits found to analyze.",
          pattern: "NONE",
          reasoning: "The repository has no commits or they could not be fetched."
        },
        usage: null
      };
    }

    const prompt = PromptTemplate.fromTemplate(`
You are an expert developer and technical lead. Your task is to analyze the commit history of a repository.
Evaluate the quality of the commit messages, look for patterns (like Conventional Commits), and determine if the messages are descriptive or random.

### Commit Messages:
{commitMessages}

---

### Analysis Rules:
1. **Quality Score**: 0-100 (high score for descriptive, clear, and consistent messages).
2. **Pattern Detection**: Identify the predominant pattern:
   - "CONVENTIONAL": Following Conventional Commits spec.
   - "DESCRIPTIVE": Clear messages, even if not following a strict spec.
   - "RANDOM": Messages like "fix", "update", "asdf", or very short/vague ones.
   - "MIXED": A mix of different styles.
3. **Summary**: A concise narrative of the findings.
4. **Reasoning**: Detailed explanation of why you gave the score and pattern.

---

### Output JSON Format:
{{
  "qualityScore": <number 0-100>,
  "pattern": "CONVENTIONAL | DESCRIPTIVE | RANDOM | MIXED",
  "summary": "<1-2 sentences overall assessment>",
  "reasoning": "<explanation regarding clarity, consistency, and professional standards>"
}}
`);

    const commitList = commitMessages.map((m) => `- ${m}`).join('\n');

    const chain = prompt.pipe(this.model);
    const response = (await chain.invoke({
      commitMessages: commitList,
    })) as BaseMessage;

    const usage = this.calculateUsage(response);
    const content =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] || content;

    return {
      analysis: JSON.parse(jsonStr),
      usage,
    };
  }

  private calculateUsage(response: BaseMessage): LLMUsageStats | null {
    // Try to get standardized usage first, then fall back to response_metadata
    const usageMetadata = (response as any).usage_metadata;
    const tokenUsage = (response as any).response_metadata?.tokenUsage;
    const usage = usageMetadata || tokenUsage;

    if (!usage) {
      console.log('[LLMService] No usage metadata found in response.');
      return null;
    }

    // Input and Output tokens extraction
    const inputTokens =
      usage.input_tokens || usage.prompt_tokens || usage.promptTokens || 0;
    const outputTokens =
      usage.output_tokens || usage.completion_tokens || usage.completionTokens || 0;

    // Extract cached tokens - supporting multiple paths for OpenAI/Anthropic and LangChain versions
    const cachedTokens =
      usage.input_token_details?.cache_read ||
      usageMetadata?.input_token_details?.cache_read_input_tokens ||
      usage.prompt_tokens_details?.cached_tokens ||
      usage.promptTokensDetails?.cachedTokens || // As reported by user
      tokenUsage?.prompt_tokens_details?.cached_tokens ||
      tokenUsage?.promptTokensDetails?.cachedTokens ||
      usage.cache_read_input_tokens ||
      0;

    // Get pricing
    const providerPricing = (this.PRICING as any)[this.provider];
    const modelPricing =
      providerPricing?.[this.modelName] || { input: 0, output: 0 };

    const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
    const outputCost = (outputTokens / 1_000_000) * modelPricing.output;
    const totalCost = inputCost + outputCost;

    console.log('--------------------------------------------------');
    console.log(
      `[LLMService] Usage - Provider: ${this.provider}, Model: ${this.modelName}`
    );
    console.log(`[LLMService] Input Tokens:  ${inputTokens}`);
    if (cachedTokens > 0) {
      console.log(
        `[LLMService] Cached Tokens: ${cachedTokens} (SAVED $${((cachedTokens / 1_000_000) * modelPricing.input * 0.5).toFixed(4)})`
      );
    }
    console.log(`[LLMService] Output Tokens: ${outputTokens}`);
    console.log(`[LLMService] Total Tokens:  ${inputTokens + outputTokens}`);
    console.log(`[LLMService] Estimated Cost: $${totalCost.toFixed(4)} USD`);
    console.log('--------------------------------------------------');

    return {
      inputTokens,
      outputTokens,
      cachedTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedCost: totalCost,
    };
  }
}
