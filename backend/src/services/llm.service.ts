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
}

export class LLMService {
  private readonly model: ChatOpenAI | ChatAnthropic;
  private readonly provider: LLMProvider;
  private readonly modelName: string;

  private readonly PRICING = {
    openai: {
      'gpt-4o': { input: 5.0, output: 15.0 }, // per 1M tokens
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
    const prompt = PromptTemplate.fromTemplate(`
Extract clear, testable requirements from this assignment.

### Rules:
- Break into atomic requirements
- No vague items
- No duplicates

### Output JSON:
[
  {{ "id": "REQ_1", "text": "User registration" }},
  {{ "id": "REQ_2", "text": "User login" }},
  {{ "id": "REQ_3", "text": "Create project" }}
]

### Assignment Text:
{instructions}
`);

    const chain = prompt.pipe(this.model);
    const response = (await chain.invoke({ instructions })) as BaseMessage;
    const usage = this.calculateUsage(response);

    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
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
      "summary": "1-3 sentences describing what this file does"
    }}
  }}
}}
`);

    const chain = prompt.pipe(this.model);
    const response = (await chain.invoke({ repoSnapshot })) as BaseMessage;
    const usage = this.calculateUsage(response);

    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] || content;

    return {
      repoMap: JSON.parse(jsonStr),
      usage,
    };
  }

  async analyzeAssessment(
    repoSnapshot: string,
    instructions: string,
    requirements: any[],
  ): Promise<{ analysis: any; usage: LLMUsageStats | null }> {
    const prompt = PromptTemplate.fromTemplate(`
### Candidate's Code Snapshot:
{repoSnapshot}

---

You are a senior software engineer and technical interviewer with 15+ years of experience.
Your job is to evaluate a candidate's take-home assignment submission.

### Assessment Requirements:
{assessmentText}

---

### Evaluation Rules:
- Be strict and objective. Score 90+ only for genuinely excellent work.
- Judge how well the candidate fulfilled the SPECIFIC requirements above.
- Consider: code quality, architecture, security, edge cases, and best practices.
- For AI detection: look for generic comments, uniform style, cookie-cutter patterns, and lack of personal problem-solving traces.
For each requirement below, check if it is implemented in the codebase.

### Requirements:
{requirementsList}

---

### Evaluation Rules:
- Be strict and objective. 
- For each requirement, return:
  - status: MET | PARTIAL | NOT_MET
  - confidence: 0–1
  - evidence: The exact file path and a representative code snippet
  - reasoning: Why you gave this status
---

### CRITICAL OUTPUT RULES:
- Return ONLY a raw JSON object. 
- Do NOT wrap it in markdown, backticks, or code fences.
- Do NOT add any explanation before or after the JSON.
- Every field below is REQUIRED. Do not skip any field.

---

Return this exact JSON structure:

{{
  "score": <number 0-100, strict>,
  "summary": "<1-2 sentences narrative overall assessment including code quality and requirement fulfillment>",

  "requirementsEvaluation": [
    {{
      "id": "REQ_X",
      "text": "...",
      "status": "MET | PARTIAL | NOT_MET",
      "confidence": 0-1,
      "evidence": {{ "file": "...", "snippet": "..." }},
      "reasoning": "..."
    }}

  "aiUsageDetection": {{
    "score": <number 0-100, where 0 = fully human, 100 = fully AI-generated>,
    "confidence": <number 0-100>,
    "reasoning": "<one short sentence explaining why>"
  }},

  // 2-4 questions
  "interviewQuestions": [
    {{
      "question": "<specific question to ask the candidate>",
      "focusArea": "<e.g. Authentication, Error Handling, Performance>",
      "rationale": "<one sentence: why this question matters for this candidate>"
    }}
  ],

  "testDetection": {{
    "hasTests": <true or false>,
    "language": "<one of: node, python, go, unknown>",
    "framework": "<one of: jest, vitest, mocha, pytest, go test, unknown>",
    "command": "<exact command string to run tests, e.g. npm test>",
    "path": "<folder path where tests are located, e.g. tests/ or __tests__>",
    "reason": "<one sentence: how you detected the test setup>"
  }}
}}
`);

    const requirementsList = requirements.map(r => `- ${r.id}: ${r.text}`).join('\n');

    const chain = prompt.pipe(this.model);
    const response = (await chain.invoke({
      assessmentText: instructions,
      repoSnapshot,
      requirementsList,
    })) as BaseMessage;

    const usage = this.calculateUsage(response);
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] || content;

    return {
      analysis: JSON.parse(jsonStr),
      usage,
    };
  }

  private calculateUsage(response: BaseMessage): LLMUsageStats | null {
    const usage =
      (response as any).usage_metadata || (response as any).response_metadata?.tokenUsage;

    if (!usage) {
      console.log('[LLMService] No usage metadata found in response.');
      return null;
    }

    const inputTokens = usage.input_tokens || usage.promptTokens || 0;
    const outputTokens = usage.output_tokens || usage.completionTokens || 0;

    // Get pricing
    const providerPricing = (this.PRICING as any)[this.provider];
    const modelPricing = providerPricing?.[this.modelName] || { input: 0, output: 0 };

    const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
    const outputCost = (outputTokens / 1_000_000) * modelPricing.output;
    const totalCost = inputCost + outputCost;

    console.log('--------------------------------------------------');
    console.log(`[LLMService] Usage - Provider: ${this.provider}, Model: ${this.modelName}`);
    console.log(`[LLMService] Input Tokens:  ${inputTokens}`);
    console.log(`[LLMService] Output Tokens: ${outputTokens}`);
    console.log(`[LLMService] Total Tokens:  ${inputTokens + outputTokens}`);
    console.log(`[LLMService] Estimated Cost: $${totalCost.toFixed(4)} USD`);
    console.log('--------------------------------------------------');

    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedCost: totalCost,
    };
  }
}
