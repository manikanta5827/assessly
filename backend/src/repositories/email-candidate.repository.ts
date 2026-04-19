// import { db } from '../db/index';
// import { emailCandidates } from '../db/schema';
// import { eq } from 'drizzle-orm';


// export class EmailCandidateRepository {
//     async createEmailCandidate(data: any | any[]) {
//         const result = await db.insert(emailCandidates).values(data).returning();
//         return Array.isArray(data) ? result : result[0];
//     }

//     async getEmailCandidateByInviteToken(inviteToken: string) {
//         return await db.query.emailCandidates.findFirst({
//             where: eq(emailCandidates.inviteToken, inviteToken),
//         });
//     }
// }