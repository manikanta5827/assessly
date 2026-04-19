// import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
// import { randomUUID } from 'crypto';

// import { candidateStatusEnum } from '../db/schema';
// import { EmailCandidateRepository } from '../repositories/email-candidate.repository';
// import { EmailService } from '../services/email.service';
// import { ChannelRepository } from '../repositories/channel.repository';

// const emailCandidates = new EmailCandidateRepository();
// const emailService = new EmailService();
// const channelRepo = new ChannelRepository();

// export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
//   if (event.httpMethod === 'OPTIONS') {
//     return response(200, {});
//   }

//   try {
//     const body = JSON.parse(event.body || '{}');

//     const { channelId, emails } = body as { channelId: string; emails: string[] };

//     if (!channelId || !emails) {
//       return response(400, { error: 'Missing channelId or emails' });
//     }

//     if (emails.length > 10) {
//       return response(400, { error: 'Too many emails' });
//     }

//     // remove duplicates
//     const uniqueEmails = [...new Set(emails)];
//     console.log(`Processing ${uniqueEmails.length} unique emails`);

//     if (uniqueEmails.length === 0) {
//       return response(400, { error: 'No emails provided' });
//     }

//     const assessmentDocsLink = await channelRepo.getAssessmentDocsUrlByChannelId(channelId);

//     // Use Promise.all so the Lambda waits for all database/email operations to finish
//     await Promise.all(
//       uniqueEmails.map(async (email) => {
//         const inviteToken = randomUUID(); // Generate the token required by schema
        
//         const candidate = (await emailCandidates.createEmailCandidate({
//           email,
//           channelId,
//           inviteToken,
//           status: 'INVITED',
//           invitedAt: new Date(),
//         })) as any;

//         if (!candidate) {
//           throw new Error(`Failed to create candidate for ${email}`);
//         }

//         const submissionLink = `${process.env.FRONTEND_URL}/candidate/${candidate.inviteToken}`;
//         await emailService.sendAssessmentEmail(email, submissionLink, assessmentDocsLink);
//       })
//     );

//     return response(202, {
//       message: 'Invitations sent successfully',
//     });
//   } catch (error) {
//     console.error('Trigger Error:', error);
//     const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
//     return response(500, { error: errorMessage });
//   }
// };

// function response(statusCode: number, body: any): APIGatewayProxyResult {
//   return {
//     statusCode,
//     body: JSON.stringify(body),
//     headers: {
//       'Access-Control-Allow-Origin': '*',
//       'Content-Type': 'application/json',
//       'Access-Control-Allow-Methods': 'POST, OPTIONS',
//       'Access-Control-Allow-Headers': 'Content-Type, Authorization',
//     },
//   };
// }
