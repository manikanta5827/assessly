import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { AssessmentRepository } from '../repositories/assessment.repository';
import * as crypto from 'node:crypto';

const sqsClient = new SQSClient({});
const assessmentRepo = new AssessmentRepository();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === 'OPTIONS') {
    return response(200, {});
  }

  try {
    console.log('Processing Trigger');

    const body = JSON.parse(event.body || '{}');
    const { repoUrl, requirementsText, userId } = body;

    if (!repoUrl || !requirementsText) {
      return response(400, { error: 'Missing repoUrl or requirementsText' });
    }

    const ip = event.requestContext.identity.sourceIp || 'unknown';

    // 1. Check if assessment for this repo already exists
    const existingAssessment = await assessmentRepo.getAssessmentByRepoUrl(repoUrl);
    if (existingAssessment) {
      console.log('Assessment already exists for repoUrl: ', repoUrl);
      return response(409, {
        error: 'Already exists',
        message: 'An assessment for this repository already exists.',
        assessmentId: existingAssessment.id,
      });
    }

    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');

    // 2. Create Assessment record (PENDING)
    const assessment = await assessmentRepo.createAssessment({
      userId: userId || null,
      ipHash,
      repoUrl,
      requirementsText,
      status: 'PENDING',
    });

    // 3. Send message to SQS queue
    const queueUrl = process.env.QUEUE_URL;
    if (!queueUrl) {
      throw new Error('QUEUE_URL environment variable not set');
    }

    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({ assessmentId: assessment.id }),
      })
    );

    return response(202, {
      message: 'Assessment started',
      assessmentId: assessment.id,
    });
  } catch (error: unknown) {
    console.error('Trigger Error:', error);
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
