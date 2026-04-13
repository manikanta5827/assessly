# Assessly Backend

Assessly is an AI-powered GitHub repository assessment tool. The backend is built using **AWS SAM**, **Node.js 24**, and **Prisma 7**, utilizing an asynchronous event-driven architecture to handle repository analysis.

## Architecture Highlights

- **Event-Driven**: Uses Amazon SQS to decouple API triggers from heavy LLM processing.
- **Memory Efficient**: Implements a streaming GitHub context builder that processes repositories using ephemeral storage (`/tmp`), preventing RAM crashes even with large codebases.
- **ORM & Database**: Powered by Prisma with a Supabase (PostgreSQL) backend.
- **AI Stack**: Integrated with LangChain for OpenAI and Anthropic models.

---

## 🛠 Prerequisites

Ensure you have the following installed:
- [AWS CLI](https://aws.amazon.com/cli/)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- [Node.js 24.x](https://nodejs.org/)
- [Docker](https://www.docker.com/) (for local testing with `sam local`)

---

## ⚙️ Configuration

The backend uses **AWS Systems Manager (SSM) Parameter Store** for environment variables. Run the following commands to set up your environment:

### Development Environment
```bash
aws ssm put-parameter --name "/assessly/dev/DATABASE_URL" --value "YOUR_DATABASE_URL" --type "String" --overwrite
aws ssm put-parameter --name "/assessly/dev/GITHUB_TOKEN" --value "YOUR_GITHUB_TOKEN" --type "String" --overwrite
aws ssm put-parameter --name "/assessly/dev/OPENAI_API_KEY" --value "YOUR_OPENAI_API_KEY" --type "String" --overwrite
```

### Production Environment
```bash
aws ssm put-parameter --name "/assessly/prod/DATABASE_URL" --value "YOUR_DATABASE_URL" --type "String" --overwrite
aws ssm put-parameter --name "/assessly/prod/GITHUB_TOKEN" --value "YOUR_GITHUB_TOKEN" --type "String" --overwrite
aws ssm put-parameter --name "/assessly/prod/OPENAI_API_KEY" --value "YOUR_OPENAI_API_KEY" --type "String" --overwrite
```

---

## 🚀 Development Scripts

Available commands in the `backend` directory:

| Command | Description |
| :--- | :--- |
| `npm run build` | Validate template and build SAM application |
| `npm run lambda` | Start API Gateway locally with warm containers |
| `npm run deploy` | Deploy to AWS without confirmation prompts |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Run Prisma development migrations |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run format` | Format code with Prettier |

---

## 🧪 Local Testing

To start the API locally and simulate the AWS environment:
```bash
npm run lambda
```
*Note: This will use the SSM parameters from your AWS account for the selected stage (defaults to `dev` in `template.yaml`).*

---

## 📦 Deployment

Deploy the stack to AWS:
```bash
npm run build
npm run deploy
```
