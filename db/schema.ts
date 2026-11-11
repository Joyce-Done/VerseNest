import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
export const familyDocuments=sqliteTable('family_documents',{
  ownerId:text('owner_id').primaryKey(),
  content:text('content').notNull(),
  revision:integer('revision').notNull().default(0),
  updatedAt:text('updated_at').notNull(),
});
export const familyHistory=sqliteTable('family_history',{
  ownerId:text('owner_id').notNull(),
  revision:integer('revision').notNull(),
  content:text('content').notNull(),
  savedAt:text('saved_at').notNull(),
},table=>[primaryKey({columns:[table.ownerId,table.revision]})]);
export const parentProfiles=sqliteTable('parent_profiles',{
 userId:text('user_id').primaryKey(),name:text('name').notNull(),email:text('email').notNull(),
 marketingOptIn:integer('marketing_opt_in').notNull().default(0),consentAt:text('consent_at'),consentVersion:text('consent_version'),
 createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
});
export const parentConsentEvents=sqliteTable('parent_consent_events',{
 id:text('id').primaryKey(),userId:text('user_id').notNull(),email:text('email').notNull(),optedIn:integer('opted_in').notNull(),
 consentText:text('consent_text').notNull(),consentVersion:text('consent_version').notNull(),recordedAt:text('recorded_at').notNull(),
});
