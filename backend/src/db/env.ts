interface Env {
  DATABASE_URL: string;
  GITHUB_TOKEN?: string;
  OPENAI_API_KEY?: string;
}

const getEnv = (): Env => {
  const { DATABASE_URL, GITHUB_TOKEN, OPENAI_API_KEY } = process.env;

  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is missing in environment variables');
  }

  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN is missing in environment variables');
  }

  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing in environment variables');
  }

  return {
    DATABASE_URL,
    GITHUB_TOKEN,
    OPENAI_API_KEY,
  };
};

export const env = getEnv();

