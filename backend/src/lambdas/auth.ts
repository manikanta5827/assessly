import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UserRepository } from '../repositories/user.repository';
import { AuthService } from '../services/auth.service';
import { EmailService } from '../services/email.service';

const userRepository = new UserRepository();
const authService = new AuthService();
const emailService = new EmailService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event));

  const path = event.path;
  const method = event.httpMethod;

  try {
    // --- SIGNUP / SIGNIN ---
    if (path.includes('/auth/signup') || path.includes('/auth/signin')) {
      if (method !== 'POST') {
        return response(405, { message: 'Method Not Allowed' });
      }

      const body = JSON.parse(event.body || '{}');
      const { email, name } = body;

      if (!email) {
        return response(400, { message: 'Email is required' });
      }

      // 1. Check if user exists
      let user = await userRepository.getUserByEmail(email);

      // 2. If signup and user doesn't exist, create user
      if (path.includes('/auth/signup') && !user) {
        await userRepository.createUser({ email, name });
        console.log('Created new user during signup:', email);
      } else if (path.includes('/auth/signup') && user) {
        return response(200, {
          message: 'User already exists. Please verify your email via the link sent to your inbox.',
        });
      }

      // 3. Generate stateless magic link
      const ts = Date.now();
      const hash = authService.generateMagicLinkHash(email, ts);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const magicLink = `${frontendUrl}/auth/verify?email=${encodeURIComponent(email)}&ts=${ts}&hash=${hash}`;

      // 4. Send email
      await emailService.sendMagicLink(email, magicLink);

      return response(200, { message: 'Magic link sent successfully' });
    }

    // --- VERIFY ---
    if (path.includes('/auth/verify')) {
      if (method !== 'POST') {
        return response(405, { message: 'Method Not Allowed' });
      }

      const body = JSON.parse(event.body || '{}');
      const { email, ts, hash } = body;

      if (!email || !ts || !hash) {
        return response(400, { message: 'Missing parameters for verification' });
      }

      // 1. Verify stateless token integrity and expiry
      const isValid = authService.verifyMagicLinkHash(email, ts, hash);
      if (!isValid) {
        return response(401, { message: 'Invalid or expired magic link' });
      }

      // 2. Get user
      const user = await userRepository.getUserByEmail(email);
      if (!user) {
        return response(404, { message: 'User not found' });
      }

      // 3. Generate JWT
      const jwt = authService.generateJWT({
        userId: user.id,
        email: user.email,
      });

      return response(200, {
        message: 'Authentication successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token: jwt,
      });
    }

    return response(404, { message: 'Not Found' });

  } catch (error: any) {
    console.error('Error in auth handler:', error);
    return response(500, { message: 'Internal Server Error', error: error.message });
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
