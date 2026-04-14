import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { prisma } from '../db/prisma';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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
    const assessment = await prisma.assessment.findUnique({
      where: { id },
    });

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
        ...assessment,
        // Ensure some defaults for frontend safety if needed
        score: assessment.score ?? 0,
        summaryText: assessment.summaryText ?? '',
        codeReview: assessment.codeReview ?? { goods: [], bads: [] },
        interviewQuestions: assessment.interviewQuestions ?? [],
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
