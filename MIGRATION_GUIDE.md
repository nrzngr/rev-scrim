# Google Sheets to Supabase Migration Guide

This guide will help you migrate the REV Scrim Management System from Google Sheets to Supabase.

## 📋 Overview

The migration involves:
1. Setting up a Supabase project
2. Creating database tables
3. Updating the application code
4. Migrating existing data
5. Testing the new system

## 🚀 Step-by-Step Migration

### Step 1: Set Up Supabase Project

1. **Create a Supabase account**
   - Go to [https://supabase.com](https://supabase.com)
   - Sign up for a new account
   - Create a new project

2. **Get your Supabase credentials**
   - Project URL: `https://your-project-id.supabase.co`
   - Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Service Role Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 2: Set Up Database Tables

1. **Run the SQL schema**
   - Copy the contents of `supabase-schema.sql`
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Paste and run the SQL script

   This will create:
   - `schedules` table
   - `attendance` table
   - `match_results` table
   - Indexes and constraints
   - Row Level Security policies

### Step 3: Update Environment Variables

1. **Update `.env.local`**
   ```bash
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

   # Legacy Google Sheets Configuration (keep for migration)
   GOOGLE_SHEETS_ID=1XS2vXdcW1wcpsWl-uEFQdq3uSwozndyG_3ZpGXjywZ4
   GOOGLE_SERVICE_ACCOUNT_EMAIL=rev-scrim@gen-lang-client-0807313776.iam.gserviceaccount.com
   GOOGLE_SERVICE_ACCOUNT_KEY="-----BEGIN PRIVATE KEY-----\n..."
   ```

2. **Install required dependencies**
   ```bash
   npm install @supabase/supabase-js dotenv
   ```

### Step 4: Run the Migration Script

1. **Prepare the migration script**
   - The `migrate-to-supabase.js` script is ready to use
   - Make sure all environment variables are set

2. **Run the migration**
   ```bash
   node migrate-to-supabase.js
   ```

   The script will:
   - Connect to both Google Sheets and Supabase
   - Extract data from Fraksi 1, Fraksi 2, Attendance, and MatchResults sheets
   - Transform and insert data into Supabase tables
   - Maintain the unique ID system (Fraksi 1: 1000+, Fraksi 2: 2000+)
   - Provide a summary of migrated records

### Step 5: Test the Application

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Test all functionality**
   - ✅ View schedules for both Fraksi 1 and Fraksi 2
   - ✅ Create new schedules
   - ✅ Update existing schedules
   - ✅ Delete schedules
   - ✅ Mark player attendance
   - ✅ Record match results
   - ✅ View statistics dashboards
   - ✅ Check data integrity

3. **Verify data integrity**
   - Visit `/api/admin/data-integrity` to run integrity checks
   - Check for any orphaned records or data inconsistencies

## 🔧 Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   ```
   Error: Missing Supabase configuration in environment variables
   ```
   **Solution**: Ensure all required environment variables are set in `.env.local`

2. **Database Connection Issues**
   ```
   Error: Could not connect to the database
   ```
   **Solution**: Verify your Supabase URL and service role key are correct

3. **Google Sheets API Quota**
   ```
   Error: Google Sheets API quota exceeded
   ```
   **Solution**: Wait for quota to reset or check API usage limits

4. **Migration Script Fails**
   ```
   Error: Failed to migrate [table] records
   ```
   **Solution**: Check the error message and verify data formats. Some manual cleanup may be needed.

### Data Validation

After migration, run these checks:

1. **Count Records**
   ```sql
   SELECT 'schedules' as table_name, COUNT(*) as record_count FROM schedules
   UNION ALL
   SELECT 'attendance' as table_name, COUNT(*) as record_count FROM attendance
   UNION ALL
   SELECT 'match_results' as table_name, COUNT(*) as record_count FROM match_results;
   ```

2. **Check for Orphaned Records**
   ```sql
   -- Orphaned attendance records
   SELECT COUNT(*) FROM attendance a 
   LEFT JOIN schedules s ON a.scheduleId = s.id 
   WHERE s.id IS NULL;

   -- Orphaned match results
   SELECT COUNT(*) FROM match_results mr 
   LEFT JOIN schedules s ON mr.scheduleId = s.id 
   WHERE s.id IS NULL;
   ```

3. **Verify ID System**
   ```sql
   -- Check Fraksi 1 IDs (should be 1000+)
   SELECT id, fraksi FROM schedules WHERE fraksi = 'Fraksi 1' AND id < 1000;

   -- Check Fraksi 2 IDs (should be 2000+)
   SELECT id, fraksi FROM schedules WHERE fraksi = 'Fraksi 2' AND id < 2000;
   ```

## 📊 Migration Benefits

### Performance Improvements
- **Faster queries**: Database indexing vs spreadsheet scanning
- **Real-time updates**: Instant data synchronization
- **Better caching**: Supabase's built-in caching mechanisms

### Enhanced Features
- **Data relationships**: Proper foreign key constraints
- **Data integrity**: Built-in validation and constraints
- **Scalability**: Handles growing data volumes efficiently
- **Security**: Row Level Security (RLS) policies

### Maintenance Benefits
- **Easier backups**: Automatic database backups
- **Better monitoring**: Built-in analytics and monitoring
- **Simpler deployments**: No Google Sheets API dependencies
- **Improved debugging**: Better error handling and logging

## 🔄 Rollback Plan

If you need to rollback to Google Sheets:

1. **Revert environment variables**
   ```bash
   # Remove Supabase variables
   # Uncomment Google Sheets variables
   ```

2. **Restore Google Sheets integration**
   - The original Google Sheets code is preserved in `src/lib/google-sheets.ts`
   - Revert API routes to use Google Sheets functions

3. **Test rollback**
   - Verify all functionality works with Google Sheets
   - Ensure no data was lost during the migration

## 📞 Support

If you encounter any issues during migration:

1. **Check the logs**: Both browser console and server logs
2. **Verify data**: Use Supabase dashboard to inspect migrated data
3. **Test incrementally**: Test one feature at a time
4. **Contact support**: Reach out if you need assistance

## 🎉 Success Criteria

The migration is successful when:

- ✅ All existing data is migrated correctly
- ✅ All CRUD operations work as expected
- ✅ Performance is improved or maintained
- ✅ Data integrity checks pass
- ✅ No data loss occurs
- ✅ All team members can use the new system

---

**Note**: This migration preserves all existing functionality while providing a more robust and scalable backend solution. The frontend components remain unchanged, ensuring a smooth transition for users.
