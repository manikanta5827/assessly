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

  async analyzeAssessment(repoSnapshot: string, instructions: string): Promise<{ analysis: any; usage: LLMUsageStats | null }> {
    const prompt = PromptTemplate.fromTemplate(`
      You are an expert senior software engineer and technical interviewer with 15+ years of experience reviewing candidate take-home assignments.

      Analyze the candidate's GitHub repository against the given assessment requirements.

      ### Assessment Requirements:
      {assessmentText}

      ### Candidate Repository Snapshot:
      {repoSnapshot}

      ### Instructions:
      - Be strict, fair, and objective.
      - Focus on how well the candidate fulfilled the actual requirements.
      - Consider code quality, structure, edge cases, security, and best practices.
      - Detect if the code looks heavily AI-generated (Cursor/Claude style) vs human-written.

      Return **ONLY** a valid JSON object with the following exact structure. Do not add any extra text or explanation.

      {{
        "score": number,                    // 0-100, be strict. 90+ only for excellent implementations
        "aiUsageDetection": {{
          "score": number,                  // 0-100 (0 = fully human, 100 = heavily AI-generated)
          "confidence": number,             // 0-100
          "reasoning": string               // short explanation
        }},
        "summary": string,                  // 2-4 sentence overall assessment
        "goods": [                          // max 6 items - what was done very well
          string
        ],
        "bads": [                           // max 8 items - missing, incomplete, or poor implementations
          string
        ],
        "interviewQuestions": [             // 2 to 4 high-quality, targeted questions
          {{
            "question": string,
            "rationale": string,            // why this question is important
            "focusArea": string             // e.g. "Authentication", "Error Handling", "Performance"
          }}
        ],
        "testDetection": {{
          "hasTests": boolean,
          "language": "node" | "python" | "go" | "unknown" | null,
          "framework": "jest" | "vitest" | "mocha" | "pytest" | "go test" | "unknown" | null,
          "command": string | null,         // exact command to run, e.g. "npm test", "pytest", "go test ./..."
          "path": string | null,            // folder where tests are located
          "reason": string                  // how you detected it
        }},
        "repoMap": {{                        // For future vectorless RAG - keep it lightweight
          "tree": string[],                 // array of all important file paths
          "files": {{
            "path/to/file.ts": {{
              "summary": string,            // one short sentence describing the file
              "size": number                // size in bytes
            }}
          }}
        }}
      }}
      `);

    const chain = prompt.pipe(this.model);
    const response = (await chain.invoke({
      assessmentText: instructions,
      repoSnapshot: repoSnapshot,
    })) as BaseMessage;

    // Extract usage and calculate cost
    const usage = this.calculateUsage(response);

    const content =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

    // Basic cleanup of JSON if LLM includes markdown blocks
    const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] || content;
    
    return {
      analysis: JSON.parse(jsonStr),
      usage
    };
  }

  private calculateUsage(response: BaseMessage): LLMUsageStats | null {
    const usage = (response as any).usage_metadata || (response as any).response_metadata?.tokenUsage;

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
      estimatedCost: totalCost
    };
  }
}
