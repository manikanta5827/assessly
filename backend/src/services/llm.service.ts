import { ChatOpenAI } from '@langchain/openai';
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
  private readonly model: ChatOpenAI;
  private readonly provider: LLMProvider;
  private readonly modelName: string;

  private readonly PRICING = {
    openai: {
      'gpt-4o': { input: 2.5, output: 10.0 }, // per 1M tokens
      'gpt-4o-mini': { input: 0.15, output: 0.6 },
    },
  };

  constructor(provider: LLMProvider = 'openai', apiKey: string, modelName?: string) {
    this.provider = provider;
    this.modelName = modelName || 'gpt-4o';
    this.model = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: this.modelName,
      temperature: 0,
    });
  }

  async extractRequirements(
    instructions: string
  ): Promise<{ requirements: any[]; usage: LLMUsageStats | null }> {
    console.log(`[LLMService] Starting extractRequirements...`);
    const prompt = PromptTemplate.fromTemplate(`
You are a Principal Requirement Engineer and Technical Architect.
Your mission is to decompose the provided assignment text into a set of atomic, testable, and unambiguous technical requirements.

### **Extraction Rules:**
1. **Atomaticity**: Each requirement must represent exactly one pass/fail condition.
2. **Unambiguity**: Use definitive, technical language (avoid "efficient," "fast," "good"). Use "The system must..."
3. **Domain Classification**: Categorize correctly (Feature, Technical, Security, Reliability, Documentation).
4. **Implementation Hints**: Based on the context, suggest specific directories/files where these should logically reside to guide the codebase auditor.

### **Output JSON Format:**
[
  {{
    "id": "REQ_01",
    "text": "Implementation of JWT-based Authentication middleware with 1-hour expiration.",
    "category": "Security",
    "suggestedFiles": ["src/middleware/auth.ts", "src/services/token.service.ts"]
  }}
]

### **Assignment Text:**
{instructions}
`);

    const chain = prompt.pipe(this.model);
    const response = (await chain.invoke({ instructions })) as BaseMessage;
    const usage = this.calculateUsage(response, 'extractRequirements');

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
You are a Staff Software Engineer analyzing a new repository structure.
Generate a high-fidelity map of the codebase to help the auditing pipeline understand the project context.

### **Auditing Rules:**
1. **Contextual Summary**: For each file, do NOT just say what it is ("This is a controller"). Say what it *does* for the business logic ("Handles user registration and validation logic").
2. **Depth**: Focus on core business logic files.
3. **Strict JSON**: Return ONLY valid JSON.

### **Output JSON Format:**
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

### Candidate's Code Snapshot:
{repoSnapshot}
`);

    const chain = prompt.pipe(this.model);
    const response = (await chain.invoke({ repoSnapshot })) as BaseMessage;
    const usage = this.calculateUsage(response, 'generateRepoMap');

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
You are a Senior Technical Auditor and Lead Software Architect.
Perform a deep-dive analysis of the codebase's health, focusing on long-term maintainability and production readiness.

### **Core Auditing Signals:**
1. **Readability & Intent**: Is the code "self-documenting" and does it clearly express its intent?
2. **Structural Integrity**: Does it follow SOLID principles, or is it a "Big Ball of Mud"?
3. **Error Resilience**: How robustly does it handle failure? Look for 'naked' try-catches or missing error propagates.
4. **Type Safety / Strictness**: Especially in TypeScript, check for 'any' types and proper interface usage.

### **Scoring (0-100):**
- **0-40**: Junior / Prototype level (Hard to maintain, chaotic).
- **41-75**: Mid-level / Functional (Works well, standard patterns, minor flaws).
- **76-100**: Senior / Production grade (Scalable, elegant, robust).

### Candidate's Code Snapshot:
{repoSnapshot}

### Output JSON Format:
{{
  "score": 0-100,
  "breakdown": {{
    "readability": 0-100,
    "structure": 0-100,
    "naming": 0-100,
    "bestPractices": 0-100
  }},
  "summary": "Executive summary of technical health",
  "issues": ["Concrete issue 1 (e.g., Circular dependency in X)", "Concrete issue 2"]
}}
`);

    const chain = prompt.pipe(this.model);
    const response = (await chain.invoke({ repoSnapshot })) as BaseMessage;
    const usage = this.calculateUsage(response, 'analyzeCodeQuality');

    const content =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] || content;

    return { analysis: JSON.parse(jsonStr), usage };
  }

  async analyzeRunnability(
    repoSnapshot: string
  ): Promise<{ analysis: any; usage: LLMUsageStats | null }> {
    console.log(`[LLMService] Starting analyzeRunnability...`);
    const prompt = PromptTemplate.fromTemplate(`
You are a Senior DevOps and Site Reliability Engineer (SRE).
Evaluate the codebase for "Production Readiness" and "Ease of Deployment."

### **Infrastructure Audit Signals:**
1. **Environment Maturity**: Are secrets handled via env examples? Is there a clear separation of config?
2. **Containerization Depth**: If Docker exists, is it production-ready? (Multi-stage builds, non-root users, explicit versioning?)
3. **Execution Clarity**: Is the README sufficient to start the project from zero in 5 minutes?
4. **Testability Awareness**: Are tests just present, or are they integrated into a CI philosophy?

### **Scoring (0-100):**
- **0-40**: Manual / Fragile (No automation, high barrier to entry).
- **41-80**: Standard (Dockerized, has basic scripts).
- **81-100**: Cloud Native (CI/CD ready, hardened Docker, optimized setup).

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
  }},
  "summary": "SRE assessment of deployability",
  "issues": ["Specific infrastructure flaw..."]
}}
`);

    const chain = prompt.pipe(this.model);
    const response = (await chain.invoke({ repoSnapshot })) as BaseMessage;
    const usage = this.calculateUsage(response, 'analyzeRunnability');

    const content =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] || content;

    return { analysis: JSON.parse(jsonStr), usage };
  }

  async analyzeAIPatterns(
    repoSnapshot: string
  ): Promise<{ analysis: any; usage: LLMUsageStats | null }> {
    console.log(`[LLMService] Starting analyzeAIPatterns...`);
    const prompt = PromptTemplate.fromTemplate(`
You are a highly specialized forensic code analyst and expert at detecting "AI fingerprints" and LLM-generated code.
Your goal is to determine the probability that the provided code was generated by an AI assistant (like ChatGPT, Claude, or Copilot).

### **Detection Signals to Look For:**

1. **"Sterile" Consistency**: Overly perfect, textbook structure across different layers (Controllers, Services, Repos) that lacks the slight idiosyncratic variations typically found in human implementation.
2. **LLM-style Comments**: Presence of comments that explain "how" the code works in a mechanical way (e.g., "Assigning the user id to the variable"), or overly verbose, polite, and sterile documentation.
3. **Machine Boilerplate**: Use of specific standard patterns that GPT/Claude frequently output by default (e.g., a specific way of wrapping try/catch, generic error message strings, or textbook implementation of middleware).
4. **Generic Naming**: Overuse of textbook variable names like 'data', 'result', 'item', 'input' in places where a human would typically use more context-specific names.
5. **Logic Gap / Hallucination**: Comments describing logic that isn't quite there, or code that is technically perfect but contextually slightly "off."

### **Scoring Rule:**
- **0-30**: Likely Human (Messy, idiosyncratic, context-specific).
- **31-70**: Mixed / Assisted (Human-led but with clear AI-assisted chunks).
- **71-100**: Highly Likely AI (Sterile, textbook, generic, or perfectly consistent signature).

### Candidate's Code Snapshot:
{repoSnapshot}

### Output JSON Format:
{{
  "score": 0-100, // Probability of being AI-generated (High = Likely AI)
  "confidence": 0-100, // Your confidence in this detection
  "summary": "1-sentence verdict on AI presence",
}}
`);

    const chain = prompt.pipe(this.model);
    const response = (await chain.invoke({ repoSnapshot })) as BaseMessage;
    const usage = this.calculateUsage(response, 'analyzeAIPatterns');

    const content =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] || content;

    return { analysis: JSON.parse(jsonStr), usage };
  }

  async evaluateRequirements(
    repoSnapshot: string,
    requirements: any[]
  ): Promise<{ evaluation: any[]; usage: LLMUsageStats | null }> {
    console.log(`[LLMService] Starting evaluateRequirements...`);
    const prompt = PromptTemplate.fromTemplate(`
You are a Chief QA Auditor. You must cross-reference the candidate's implementation against the extracted requirements.
Do NOT be lenient. If a feature is present but missing a critical edge case defined in the requirement, mark it PARTIAL.

### **Validation Rules:**
1. **Functional Evidence**: You must find the specific file and line logic that satisfies the requirement.
2. **Confidence Level**: 0.0 to 1.0. High confidence means you found the specific logic; Low means it might be there but is obscured.
3. **Status Definitions**: 
   - MET: Feature is fully implemented as requested.
   - PARTIAL: Feature exists but has bugs, missing sub-tasks, or edge cases.
   - NOT_MET: No evidence of implementation.

### Candidate's Code Snapshot:
{repoSnapshot}

### Requirements list to check:
{requirementsList}

### Output JSON Format (Array):
[
  {{
    "id": "REQ_X",
    "status": "MET | PARTIAL | NOT_MET",
    "evidence": {{ "file": "path/to/file.ts", "snippet": "actual code snippet" }},
    "reasoning": "Technical explanation of the find"
  }}
]
`);

    const requirementsList = requirements.map((r) => `- [${r.id}] ${r.text}`).join('\n');

    const chain = prompt.pipe(this.model);
    const response = (await chain.invoke({ repoSnapshot, requirementsList })) as BaseMessage;
    const usage = this.calculateUsage(response, 'evaluateRequirements');

    const content =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const jsonStr = content.match(/\[[\s\S]*\]/)?.[0] || content;

    return { evaluation: JSON.parse(jsonStr), usage };
  }

  async generateFinalReport(inputs: {
    requirementsEvaluation: any[];
    codeQuality: any;
    runnability: any;
    commitAnalysis: any;
    aiAnalysis: any;
    score: number;
  }): Promise<{ report: any; usage: LLMUsageStats | null }> {
    console.log(`[LLMService] Starting generateFinalReport...`);
    const prompt = PromptTemplate.fromTemplate(`
You are a Chief Technology Officer (CTO). You are performing the final review of a candidate's technical assessment.
Your goal is to synthesize multiple analysis signals into a final verdict. Be objective and critical.

### **CTO's Ground Truth (Provided Inputs):**
Score: {score}
Requirements: {requirementsEvaluation}
Quality Analysis: {codeQuality}
DevOps Status: {runnability}
History: {commitAnalysis}
AI Forensic Scan: {aiAnalysis}

### **Report Directives:**
1. **Veritable Summary**: Synthesize the "soul" of the candidate's work. Are they a "Careful Architect" or an "LLM Copy-Paster"?
2. **Hireability Status**:
   - **STRONG_HIRE**: Exceeded expectations in architectural depth and infrastructure.
   - **HIRE**: Solid implementation, met most requirements, standard quality.
   - **NO_HIRE**: Significant logic gaps, failed critical requirements, or high AI-copying probability.
3. **The "Pressure Test"**: Generate 3-4 interview questions that specifically probe the candidate's WEAKEST areas or "Suspicious" AI patterns.

### Output JSON Format:
{{
  "score": {score},
  "summary": "Executive summary of the candidate's profile.",
  "strengths": ["Strategic strengths..."],
  "weaknesses": ["Specific technical gaps..."],
  "hiringRecommendation": "STRONG_HIRE | HIRE | NO_HIRE",
  "interviewQuestions": [
    {{
      "question": "Probing question about X...",
      "focusArea": "Reasoning for asking"
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
    const usage = this.calculateUsage(response, 'generateFinalReport');

    const content =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] || content;

    return { report: JSON.parse(jsonStr), usage };
  }

  async analyzeCommits(
    commitMessages: string[]
  ): Promise<{ analysis: any; usage: LLMUsageStats | null }> {
    console.log(`[LLMService] Starting analyzeCommits... (${commitMessages.length} messages)`);
    if (commitMessages.length === 0) {
      return {
        analysis: {
          qualityScore: 0,
          summary: 'No commits found to analyze.',
          pattern: 'NONE',
          reasoning: 'The repository has no commits or they could not be fetched.',
        },
        usage: null,
      };
    }

    const prompt = PromptTemplate.fromTemplate(`
You are a Technical Lead analyzing the "Development Narrative" through Git commit history.
Determine how the developer solves problems: step-by-step evolution or giant, unexplained dumps of code?

### **Development Signals:**
1. **Incrementalism**: Are changes staged in logical blocks, or are they "Save Points"?
2. **Standardization**: Do they respect professional standards (Conventional Commits, explicit titles)?
3. **Clarity**: Could another developer understand the PR just by reading the subject lines?

### **Pattern Definitions:**
- "CONVENTIONAL": Professional, spec-compliant.
- "DESCRIPTIVE": Human-clear narrative.
- "RANDOM": "fix", "updated", "asdf" - Low signal messages.
- "MIXED": Inconsistency between different days or tasks.

### Commit Messages:
{commitMessages}

### Output JSON Format:
{{
  "qualityScore": 0-100, // High = Professional and descriptive
  "pattern": "CONVENTIONAL | DESCRIPTIVE | RANDOM | MIXED",
  "summary": "1-sentence narrative of the history",
}}
`);

    const commitList = commitMessages.map((m) => `- ${m}`).join('\n');

    const chain = prompt.pipe(this.model);
    const response = (await chain.invoke({
      commitMessages: commitList,
    })) as BaseMessage;

    const usage = this.calculateUsage(response, 'commitAnalysis');
    const content =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] || content;

    return {
      analysis: JSON.parse(jsonStr),
      usage,
    };
  }

  private calculateUsage(response: BaseMessage, service: string): LLMUsageStats | null {
    // Try to get standardized usage first, then fall back to response_metadata
    const usageMetadata = (response as any).usage_metadata;
    const tokenUsage = (response as any).response_metadata?.tokenUsage;
    const usage = usageMetadata || tokenUsage;

    if (!usage) {
      console.log('[LLMService] No usage metadata found in response.');
      return null;
    }

    // Input and Output tokens extraction
    const inputTokens = usage.input_tokens || usage.prompt_tokens || usage.promptTokens || 0;
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
    const modelPricing = providerPricing?.[this.modelName] || { input: 0, output: 0 };

    const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
    const outputCost = (outputTokens / 1_000_000) * modelPricing.output;
    const totalCost = inputCost + outputCost;

    console.log('--------------------------------------------------');
    console.log(`[${service}] Usage - Provider: ${this.provider}, Model: ${this.modelName}`);
    console.log(`[${service}] Input Tokens:  ${inputTokens}`);
    if (cachedTokens > 0) {
      console.log(
        `[${service}] Cached Tokens: ${cachedTokens} (SAVED $${((cachedTokens / 1_000_000) * modelPricing.input * 0.5).toFixed(4)})`
      );
    }
    console.log(`[${service}] Output Tokens: ${outputTokens}`);
    console.log(`[${service}] Total Tokens:  ${inputTokens + outputTokens}`);
    console.log(`[${service}] Estimated Cost: $${totalCost.toFixed(4)} USD`);
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
