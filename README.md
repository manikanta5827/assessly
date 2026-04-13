# Assessly — AI GitHub Assessment Reviewer

Assessly is a modern, serverless web app that helps hiring teams review GitHub coding assessments in seconds.

## Core Features
- **AI Summary**: Score (0-100), "The Goods", and "The Bads".
- **Interview Questions**: Targetted questions based on the candidate's code.
- **Test Detection**: Automatically finds and runs tests in an E2B sandbox.
- **RAG Chat**: Ask anything about the repository.

## Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS v4, shadcn/ui, Zustand.
- **Backend**: AWS SAM (Node.js 24), TypeScript, LangChain, Octokit.
- **Services**: Supabase (Postgres + Storage), E2B (Code Sandbox).

## Setup & Deployment

### Prerequisites
- AWS Account + SAM CLI
- Supabase Project
- GitHub Personal Access Token (PAT)
- E2B API Key
- OpenAI or Anthropic API Key

### 1. Backend Deployment (AWS SAM)
Before deploying, ensure you have set the following secrets in **AWS SSM Parameter Store**:
- `/assessly/SUPABASE_URL`
- `/assessly/SUPABASE_SERVICE_ROLE_KEY`
- `/assessly/GITHUB_PAT`
- `/assessly/E2B_API_KEY`
- `/assessly/OPENAI_API_KEY` (or ANTHROPIC_API_KEY)

```bash
cd backend
npm install
sam build
sam deploy --guided
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Database Schema (Supabase)
Run the following SQL in your Supabase SQL Editor:
```sql
CREATE TABLE free_tries (
  ip_hash TEXT PRIMARY KEY,
  tries INT DEFAULT 1,
  last_try TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_url TEXT,
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Authors
- Built with Antigravity
