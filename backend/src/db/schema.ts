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

export const candidateStatusEnum = pgEnum('candidate_status', [
  'INVITED',
  'VIEWED',
  'SUBMITTED',
  'PROCESSING',
  'COMPLETED',
  'EXPIRED',
]);

export const assessmentTemplates = pgTable(
  'assessment_templates',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: text('title'),
    description: text('description'),
    assessmentText: text('assessment_text'),
    createdBy: uuid('created_by').references(() => guestUsage.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    return [index('assessment_templates_created_by_idx').on(table.createdBy)];
  }
);

export const submissions = pgTable(
  'submissions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    githubRepoUrl: text('github_repo_url').notNull(),
    assessmentTemplateId: uuid('assessment_template_id')
      .notNull()
      .references(() => assessmentTemplates.id),
    status: assessmentStatusEnum('status').default('PENDING').notNull(),
    score: integer('score'),
    summary: text('summary'),
    requirementScore: doublePrecision('requirement_score'),
    codeQualityScore: doublePrecision('code_quality_score'),
    runnabilityScore: doublePrecision('runnability_score'),
    aiAnalysisScore: doublePrecision('ai_analysis_score'),
    fullReport: jsonb('full_report'),

    testExecuted: boolean('test_executed').default(false).notNull(),
    testResults: jsonb('test_results'),

    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    totalTokens: integer('total_tokens'),
    estimatedCost: numeric('estimated_cost', { precision: 10, scale: 6 }),

    candidateName: text('candidate_name'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    return [
      index('github_repo_url_idx').on(table.githubRepoUrl),
      index('status_idx').on(table.status),
      index('assessment_template_id_idx').on(table.assessmentTemplateId),
    ];
  }
);

export const guestUsage = pgTable('guest_usage', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  ipAddress: text('ip_address').notNull(),
  count: integer('count').default(0).notNull(),
  lastResetAt: timestamp('last_reset_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return [
    index('guest_usage_ip_address_idx').on(table.ipAddress),
  ];
});

export const guestUsageRelations = relations(guestUsage, ({ many }) => ({
  templates: many(assessmentTemplates),
}));

// --- Relations ---

export const submissionsRelations = relations(submissions, ({ one }) => ({
  template: one(assessmentTemplates, {
    fields: [submissions.assessmentTemplateId],
    references: [assessmentTemplates.id],
  }),
}));

export const assessmentTemplatesRelations = relations(assessmentTemplates, ({ one, many }) => ({
  guest: one(guestUsage, {
    fields: [assessmentTemplates.createdBy],
    references: [guestUsage.id],
  }),
  submissions: many(submissions),
}));
