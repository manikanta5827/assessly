import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AssessmentRepository } from '../repositories/assessment.repository';
const assessmentRepo = new AssessmentRepository();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log(`processing get assessment`);
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const id = event.queryStringParameters?.id;

  if (!id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing assessment ID' }),
    };
  }

  try {
    console.time('db');
    const assessment = await assessmentRepo.getAssessmentById(id);
    console.timeEnd('db');

    if (!assessment) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Assessment not found' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        assessmentId: assessment.id,
        userId: assessment.userId,
        repoUrl: assessment.repoUrl,
        requirementsText: assessment.requirementsText,
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
        
        // Re-mapping testDetection structure backwards-compatibly
        testDetection: assessment.runnability ? {
          hasTests: assessment.runnability.hasTests,
          language: assessment.runnability.testLanguage,
          framework: assessment.runnability.testFramework,
          command: assessment.runnability.testCommand,
          path: assessment.runnability.testPath,
          reason: assessment.runnability.testReason,
        } : { hasTests: false },
        
        testExecuted: assessment.testExecuted,
        testResults: assessment.testResults,
        inputTokens: assessment.inputTokens,
        outputTokens: assessment.outputTokens,
        totalTokens: assessment.totalTokens,
        estimatedCost: assessment.estimatedCost,
        createdAt: assessment.createdAt,
        updatedAt: assessment.updatedAt,
      }),
    };
  } catch (error: unknown) {
    console.error('Get Assessment Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: errorMessage }),
    };
  }
};
