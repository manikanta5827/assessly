import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AssessmentRepository } from '../repositories/assessment.repository';
const assessmentRepo = new AssessmentRepository();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log(`processing get assessment`);

  if (event.httpMethod === 'OPTIONS') {
    return response(200, {});
  }

  const id = event.queryStringParameters?.id;

  if (!id) {
    return response(400, { error: 'Missing assessment ID' });
  }

  try {
    console.time('db');
    const assessment = await assessmentRepo.getAssessmentById(id);
    console.timeEnd('db');

    if (!assessment) {
      return response(404, { error: 'Assessment not found' });
    }

    return response(200, {
      assessmentId: assessment.id,
      userId: assessment.userId,
      repoUrl: assessment.repoUrl,
      status: assessment.status,
      score: assessment.score ?? 0,
      summary: assessment.summary ?? '',
      requirementsEvaluation: assessment.requirements || [],

      codeQuality: assessment.codeQuality,
      runnability: assessment.runnability,
      aiAnalysis: assessment.aiAnalysis,
      commitAnalysis: assessment.commitAnalysis,

      requirementScore: assessment.requirementScore ?? 0,
      codeQualityScore: assessment.codeQualityScore ?? 0,
      runnabilityScore: assessment.runnabilityScore ?? 0,
      aiAnalysisScore: assessment.aiAnalysisScore ?? 0,

      finalReport: assessment.finalReport,
      interviewQuestions: assessment.interviewQuestions || [],

      testDetection: assessment.runnability
        ? {
            hasTests: assessment.runnability.hasTests,
            language: assessment.runnability.testLanguage,
            framework: assessment.runnability.testFramework,
            command: assessment.runnability.testCommand,
            path: assessment.runnability.testPath,
          }
        : { hasTests: false },

      testExecuted: assessment.testExecuted,
      testResults: assessment.testResults,
      inputTokens: assessment.inputTokens,
      outputTokens: assessment.outputTokens,
      totalTokens: assessment.totalTokens,
      estimatedCost: assessment.estimatedCost,
      createdAt: assessment.createdAt,
      updatedAt: assessment.updatedAt,
    });
  } catch (error: unknown) {
    console.error('Get Assessment Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return response(500, { error: errorMessage });
  }
};

function response(statusCode: number, body: any): APIGatewayProxyResult {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  };
}
