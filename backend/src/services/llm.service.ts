import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { PromptTemplate } from '@langchain/core/prompts';
import { BaseMessage } from '@langchain/core/messages';

export type LLMProvider = 'openai' | 'anthropic';

export class LLMService {
  private model: ChatOpenAI | ChatAnthropic;

  constructor(provider: LLMProvider = 'openai', apiKey: string, modelName?: string) {
    if (provider === 'openai') {
      this.model = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: modelName || 'gpt-4o',
        temperature: 0,
      });
    } else {
      this.model = new ChatAnthropic({
        anthropicApiKey: apiKey,
        modelName: modelName || 'claude-3-5-sonnet-latest',
        temperature: 0,
      });
    }
  }

  async analyzeAssessment(repoSnapshot: string, instructions: string) {
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

    const content =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

    // Basic cleanup of JSON if LLM includes markdown blocks
    const jsonStr = content.match(/\{[\s\S]*\}/)?.[0] || content;
    return JSON.parse(jsonStr);
  }
}
