import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../services/auth.service';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(`JWT_SECRET is not passed in env`);
}

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  try {
    console.log('Auth Token Verifier Triggered', JSON.stringify(event));

    const token = event.authorizationToken.replace('Bearer ', '');
    const decoded = verifyJWT(token);
    console.log(`${JSON.stringify(decoded)}`);

    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn,
          },
        ],
      },
      context: { 
        userId: decoded.userId,
        email: decoded.email
      },
    };
  } catch (error) {
    console.log(error);
    throw new Error('Unauthorized');
  }
};

function verifyJWT(token: string): JWTPayload {
  try {
    // We use type assertion since we checked for existence at the top level
    return jwt.verify(token, JWT_SECRET as string) as JWTPayload;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid or expired token';
    console.log(errorMessage);
    throw error;
  }
}
