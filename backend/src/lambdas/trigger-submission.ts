import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SQSClient, SendMessageBatchCommand } from '@aws-sdk/client-sqs';

import { SubmissionRepository } from '../repositories/submission.repository';
import { GuestUsageRepository } from '../repositories/guest-usage.repository';
import { AssessmentTemplateRepository } from '../repositories/assessment-template.repository';

const sqsClient = new SQSClient({});
const submissionRepo = new SubmissionRepository();
const guestUsageRepo = new GuestUsageRepository();
const assessmentTemplateRepo = new AssessmentTemplateRepository();

const MAX_REPOS_PER_SUBMISSION = 10;
const MAX_ASSESSMENTS_PER_DAY = 3;

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

    const sourceIp = event.requestContext.identity?.sourceIp;

    if (!sourceIp) {
      return response(400, { error: 'Could not identify guest user' });
    }

    // get userid from the ip address else create one
    const userId = await guestUsageRepo.getOrCreateUser(sourceIp);

    const usage = await guestUsageRepo.getUsage(userId);
    if (usage && usage.count >= MAX_ASSESSMENTS_PER_DAY) {
      return response(429, {
        error: 'Daily quota reached',
        message:
          'Guest users are limited to 3 assessments per day. Please sign in for unlimited access.',
      });
    }

    const body = JSON.parse(event.body || '{}');
    const { assessmentDocsText, repoUrls } = body as {
      assessmentDocsText: string;
      repoUrls: string[];
    };

    if (!assessmentDocsText || !repoUrls) {
      return response(400, { error: 'Missing assessmentDocsText or repoUrls' });
    }

    if (repoUrls.length > MAX_REPOS_PER_SUBMISSION) {
      return response(400, { error: 'Too many repositories' });
    }

    // remove duplicates
    const uniqueRepoUrls = [...new Set(repoUrls)];
    console.log(`Processing ${uniqueRepoUrls.length} unique repositories`);

    if (uniqueRepoUrls.length === 0) {
      return response(400, { error: 'No repositories provided' });
    }

    // store assessmentDocsText in assessment templates table
    const assessmentTemplate = await assessmentTemplateRepo.createAssessmentTemplate(
      assessmentDocsText,
      userId
    );

    // 2. Fetch all candidate names in parallel
    const submissionInputs = await Promise.all(
      uniqueRepoUrls.map(async (githubRepoUrl) => {
        const candidateName = await getCandidateName(githubRepoUrl);
        return {
          githubRepoUrl,
          status: 'PENDING',
          assessmentTemplateId: assessmentTemplate.id,
          candidateName,
        };
      })
    );

    // 3. Bulk Create Submission records
    const createdSubmissions = (await submissionRepo.createSubmission(submissionInputs)) as any[];
    const submissionIds = createdSubmissions.map((s) => s.id);

    // increment usage
    await guestUsageRepo.incrementUsage(userId);

    // 4. Send messages to SQS queue in batch
    await sqsClient.send(
      new SendMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: createdSubmissions.map((s, index) => ({
          Id: `msg_${index}`,
          MessageBody: JSON.stringify({ submissionId: s.id }),
        })),
      })
    );

    return response(202, {
      message: 'Submissions started',
      submissionIds,
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
  const accountName = repoUrl.split('/')[3];
  try {
    const res = await fetch(`https://api.github.com/users/${accountName}`);
    if (!res.ok) {
      return accountName;
    }
    const data = (await res.json()) as { name: string };
    return data.name || accountName;
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Internal Server Error';
    console.error(`Error fetching candidate name for ${repoUrl}:`, errorMessage);

    return accountName;
  }
}
