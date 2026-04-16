import { db } from '../db/index';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export class UserRepository {
  async getUserByEmail(email: string) {
    return await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });
  }

  async createUser(data: { email: string; name?: string }) {
    const result = await db
      .insert(users)
      .values({
        email: data.email.toLowerCase(),
        name: data.name,
      })
      .returning();
    return result[0];
  }
}
