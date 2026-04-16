import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SQSClient, SendMessageBatchCommand } from '@aws-sdk/client-sqs';

import { AssessmentRepository } from '../repositories/assessment.repository';

const sqsClient = new SQSClient({});
const assessmentRepo = new AssessmentRepository();

const queueUrl = process.env.QUEUE_URL;
if (!queueUrl) {
  throw new Error('QUEUE_URL environment variable not set');
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === 'OPTIONS') {
    return response(200, {});
  }

  try {
    console.log('Processing Trigger');

    const body = JSON.parse(event.body || '{}');
    const { channelId, repoUrls } = body as { channelId: string; repoUrls: string[] };

    if (!channelId || !repoUrls) {
      return response(400, { error: 'Missing channelId or repoUrls' });
    }

    if (repoUrls.length > 10) {
      return response(400, { error: 'Too many repositories' });
    }

    // remove duplicates
    const uniqueRepoUrls = [...new Set(repoUrls)];
    console.log(`Processing ${uniqueRepoUrls.length} unique repositories`);

    if(uniqueRepoUrls.length === 0) {
      return response(400, { error: 'No repositories provided' });
    }

    // 2. Fetch all candidate names in parallel
    const assessmentInputs = await Promise.all(
      uniqueRepoUrls.map(async (repoUrl) => {
        const candidateName = await getCandidateName(repoUrl);
        return {
          repoUrl,
          status: 'PENDING',
          channelId,
          candidateName,
        };
      })
    );

    // 3. Bulk Create Assessment records
    const createdAssessments = (await assessmentRepo.createAssessment(assessmentInputs)) as any[];
    const assessmentIds = createdAssessments.map((a) => a.id);

    // 4. Send messages to SQS queue in batch
    await sqsClient.send(
      new SendMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: createdAssessments.map((a, index) => ({
          Id: `msg_${index}`,
          MessageBody: JSON.stringify({ assessmentId: a.id }),
        })),
      })
    );

    return response(202, {
      message: 'Assessments started',
      assessmentIds,
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

async function getCandidateName(repoUrl: string): Promise<string> {
  // extract account name from url
  // https://github.com/manikanta5827/assessly
  // manikanta5827
  const accountName = repoUrl.split('/')[3];
  const res = await fetch(`https://api.github.com/users/${accountName}`);
  if (!res.ok) {
    return accountName;
  }
  const data = (await res.json()) as { name: string };
  return data.name;
}
