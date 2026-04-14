import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { prisma } from '../db/prisma';
import * as crypto from 'node:crypto';

const sqsClient = new SQSClient({});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('Processing Trigger: ', event);

    const body = JSON.parse(event.body || '{}');
    const { repoUrl, requirementsText, userId } = body;

    if (!repoUrl || !requirementsText) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing repoUrl or requirementsText' }),
      };
    }

    const ip = event.requestContext.identity.sourceIp || 'unknown';

    console.log('IP for user: ', userId, ' is ', ip);
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');

    // 1. Check IP Limits for guest users
    if (!userId) {
      console.log('Checking IP limits for guest user with ip: ', ip);
      try {
        const tracking = await prisma.ipTracking.findUnique({
          where: { ipHash },
        });
        console.log('Tracking for ip: ', ip, ' is ', tracking?.assessmentCount);

        if (tracking && tracking.assessmentCount >= 1) {
          console.log('Free limit reached for ip: ', ip);
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({
              error: 'Free limit reached',
              message:
                'You have already performed one free assessment. Please sign in with Google to continue.',
            }),
          };
        }
      } catch (dbError) {
        console.error('Database error checking IP limits:', dbError);
        // We continue anyway to not block users if DB is temporarily down
      }
    }

    // 2. Create Assessment record (PENDING)
    console.log('Creating assessment for ip: ', ip);
    const assessment = await prisma.assessment.create({
      data: {
        userId: userId || null,
        ipHash,
        repoUrl,
        requirementsText,
        status: 'PENDING',
      },
    });

    // 3. Send message to SQS queue
    const queueUrl = process.env.QUEUE_URL;
    console.log('Sending message to SQS queue for queueUrl: ', queueUrl);
    if (!queueUrl) {
      throw new Error('QUEUE_URL environment variable not set');
    }

    try {
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify({ assessmentId: assessment.id }),
        })
      );
    } catch (sqsError) {
      if (process.env.AWS_SAM_LOCAL) {
        console.warn('SQS send failed locally (this is expected):', sqsError);
      } else {
        throw sqsError;
      }
    }

    // 4. Update IP Tracking for guests
    if (!userId) {
      console.log('Updating IP Tracking for guest user with ip: ', ip);
      await prisma.ipTracking.upsert({
        where: { ipHash },
        update: { assessmentCount: { increment: 1 }, lastSeenAt: new Date() },
        create: { ipHash, assessmentCount: 1 },
      });
    }

    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({
        message: 'Assessment started',
        assessmentId: assessment.id,
      }),
    };
  } catch (error: unknown) {
    console.error('Trigger Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: errorMessage }),
    };
  }
};
