import {
  pgTable,
  text,
  timestamp,
  integer,
  doublePrecision,
  numeric,
  boolean,
  uuid,
  pgEnum,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// --- Enums ---
export const assessmentStatusEnum = pgEnum('assessment_status', [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
]);

export const requirementStatusEnum = pgEnum('requirement_status', [
  'MET',
  'PARTIAL',
  'NOT_MET',
  'PENDING',
]);

// --- Tables ---
export const users = pgTable('users', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name'),
  email: text('email').unique().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});


export const assessments = pgTable('assessments', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id),
  ipHash: text('ip_hash').notNull(),
  repoUrl: text('repo_url').notNull(),
  requirementsText: text('requirements_text').notNull(),
  status: assessmentStatusEnum('status').default('PENDING').notNull(),
  score: integer('score'),
  summary: text('summary'),
  requirementScore: doublePrecision('requirement_score'),
  codeQualityScore: doublePrecision('code_quality_score'),
  runnabilityScore: doublePrecision('runnability_score'),
  aiAnalysisScore: doublePrecision('ai_analysis_score'),
  testExecuted: boolean('test_executed').default(false).notNull(),
  testResults: jsonb('test_results'),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  totalTokens: integer('total_tokens'),
  estimatedCost: numeric('estimated_cost', { precision: 10, scale: 6 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return [
    index('repo_url_idx').on(table.repoUrl),
    index('user_id_idx').on(table.userId),
    index('ip_hash_idx').on(table.ipHash),
    index('status_idx').on(table.status),
  ];
});

export const ipTracking = pgTable('ip_tracking', {
  ipHash: text('ip_hash').primaryKey(),
  assessmentCount: integer('assessment_count').default(0).notNull(),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
});

export const projectRequirements = pgTable('project_requirements', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  assessmentId: uuid('assessment_id')
    .notNull()
    .references(() => assessments.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  category: text('category'),
  status: requirementStatusEnum('status').default('PENDING').notNull(),
  evidenceFile: text('evidence_file'),
  evidenceSnippet: text('evidence_snippet'),
  reasoning: text('reasoning'),
}, (table) => {
  return [
    index('pr_assessment_id_idx').on(table.assessmentId),
  ];
});

export const codeQuality = pgTable('code_quality', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  assessmentId: uuid('assessment_id')
    .notNull()
    .unique()
    .references(() => assessments.id, { onDelete: 'cascade' }),
  score: doublePrecision('score').notNull(),
  readability: doublePrecision('readability').notNull(),
  structure: doublePrecision('structure').notNull(),
  naming: doublePrecision('naming').notNull(),
  bestPractices: doublePrecision('best_practices').notNull(),
  summary: text('summary').notNull(),
  issues: text('issues').array(),
});

export const runnability = pgTable('runnability', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  assessmentId: uuid('assessment_id')
    .notNull()
    .unique()
    .references(() => assessments.id, { onDelete: 'cascade' }),
  score: doublePrecision('score').notNull(),
  hasDocker: boolean('has_docker').notNull(),
  hasEnvExample: boolean('has_env_example').notNull(),
  hasScripts: boolean('has_scripts').notNull(),
  ciDetected: boolean('ci_detected').notNull(),
  summary: text('summary').notNull(),
  issues: text('issues').array(),
  hasTests: boolean('has_tests'),
  testLanguage: text('test_language'),
  testFramework: text('test_framework'),
  testCommand: text('test_command'),
  testPath: text('test_path'),
});

export const aiAnalysis = pgTable('ai_analysis', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  assessmentId: uuid('assessment_id')
    .notNull()
    .unique()
    .references(() => assessments.id, { onDelete: 'cascade' }),
  score: doublePrecision('score').notNull(),
  confidence: doublePrecision('confidence').notNull(),
  summary: text('summary').notNull(),
});

export const commitAnalysis = pgTable('commit_analysis', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  assessmentId: uuid('assessment_id')
    .notNull()
    .unique()
    .references(() => assessments.id, { onDelete: 'cascade' }),
  qualityScore: doublePrecision('quality_score').notNull(),
  pattern: text('pattern').notNull(),
  summary: text('summary').notNull(),
});

export const finalReport = pgTable('final_report', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  assessmentId: uuid('assessment_id')
    .notNull()
    .unique()
    .references(() => assessments.id, { onDelete: 'cascade' }),
  score: doublePrecision('score').notNull(),
  summary: text('summary').notNull(),
  strengths: text('strengths').array(),
  weaknesses: text('weaknesses').array(),
  hiringRecommendation: text('hiring_recommendation').notNull(),
});

export const interviewQuestions = pgTable('interview_questions', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  assessmentId: uuid('assessment_id')
    .notNull()
    .references(() => assessments.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  focusArea: text('focus_area').notNull(),
}, (table) => {
  return [
    index('iq_assessment_id_idx').on(table.assessmentId),
  ];
});

// --- Relations ---

export const assessmentsRelations = relations(assessments, ({ many, one }) => ({
  requirements: many(projectRequirements),
  codeQuality: one(codeQuality, {
    fields: [assessments.id],
    references: [codeQuality.assessmentId],
  }),
  runnability: one(runnability, {
    fields: [assessments.id],
    references: [runnability.assessmentId],
  }),
  aiAnalysis: one(aiAnalysis, {
    fields: [assessments.id],
    references: [aiAnalysis.assessmentId],
  }),
  commitAnalysis: one(commitAnalysis, {
    fields: [assessments.id],
    references: [commitAnalysis.assessmentId],
  }),
  finalReport: one(finalReport, {
    fields: [assessments.id],
    references: [finalReport.assessmentId],
  }),
  interviewQuestions: many(interviewQuestions),
  user: one(users, {
    fields: [assessments.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  assessments: many(assessments),
}));


export const projectRequirementsRelations = relations(projectRequirements, ({ one }) => ({
  assessment: one(assessments, {
    fields: [projectRequirements.assessmentId],
    references: [assessments.id],
  }),
}));

export const codeQualityRelations = relations(codeQuality, ({ one }) => ({
  assessment: one(assessments, {
    fields: [codeQuality.assessmentId],
    references: [assessments.id],
  }),
}));

export const runnabilityRelations = relations(runnability, ({ one }) => ({
  assessment: one(assessments, {
    fields: [runnability.assessmentId],
    references: [assessments.id],
  }),
}));

export const aiAnalysisRelations = relations(aiAnalysis, ({ one }) => ({
  assessment: one(assessments, {
    fields: [aiAnalysis.assessmentId],
    references: [assessments.id],
  }),
}));

export const commitAnalysisRelations = relations(commitAnalysis, ({ one }) => ({
  assessment: one(assessments, {
    fields: [commitAnalysis.assessmentId],
    references: [assessments.id],
  }),
}));

export const finalReportRelations = relations(finalReport, ({ one }) => ({
  assessment: one(assessments, {
    fields: [finalReport.assessmentId],
    references: [assessments.id],
  }),
}));

export const interviewQuestionsRelations = relations(interviewQuestions, ({ one }) => ({
  assessment: one(assessments, {
    fields: [interviewQuestions.assessmentId],
    references: [assessments.id],
  }),
}));
