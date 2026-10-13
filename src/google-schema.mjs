import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
const timestamp=name=>integer(name,{mode:'timestamp_ms'}).notNull();
export const user=sqliteTable('google_auth_user',{
  id:text('id').primaryKey(),name:text('name').notNull(),email:text('email').notNull().unique(),
  emailVerified:integer('email_verified',{mode:'boolean'}).notNull().default(false),image:text('image'),
  createdAt:timestamp('created_at'),updatedAt:timestamp('updated_at'),
});
export const session=sqliteTable('google_auth_session',{
  id:text('id').primaryKey(),token:text('token').notNull().unique(),expiresAt:timestamp('expires_at'),
  createdAt:timestamp('created_at'),updatedAt:timestamp('updated_at'),ipAddress:text('ip_address'),userAgent:text('user_agent'),
  userId:text('user_id').notNull().references(()=>user.id,{onDelete:'cascade'}),
});
export const account=sqliteTable('google_auth_account',{
  id:text('id').primaryKey(),accountId:text('account_id').notNull(),providerId:text('provider_id').notNull(),
  userId:text('user_id').notNull().references(()=>user.id,{onDelete:'cascade'}),accessToken:text('access_token'),refreshToken:text('refresh_token'),idToken:text('id_token'),
  accessTokenExpiresAt:integer('access_token_expires_at',{mode:'timestamp_ms'}),refreshTokenExpiresAt:integer('refresh_token_expires_at',{mode:'timestamp_ms'}),
  scope:text('scope'),password:text('password'),createdAt:timestamp('created_at'),updatedAt:timestamp('updated_at'),
});
export const verification=sqliteTable('google_auth_verification',{
  id:text('id').primaryKey(),identifier:text('identifier').notNull(),value:text('value').notNull(),expiresAt:timestamp('expires_at'),createdAt:timestamp('created_at'),updatedAt:timestamp('updated_at'),
});
