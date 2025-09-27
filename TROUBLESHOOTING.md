# Troubleshooting Guide: Supabase Migration Issues

## 🚨 Common Issue: Schema Cache Error

### Error Message
```
Error creating schedule: {
  code: 'PGRST204',
  details: null,
  hint: null,
  message: "Could not find the 'startMatch' column of 'schedules' in the schema cache"
}
```

### Root Cause
This error occurs when Supabase's PostgREST schema cache doesn't recognize the table columns. This typically happens when:

1. **SQL schema hasn't been executed yet** in the Supabase database
2. **Case sensitivity issues** between column names in code vs database
3. **Schema cache needs to be refreshed** after table creation

### 🔧 Solutions

#### Solution 1: Execute the SQL Schema (Most Common)

1. **Go to your Supabase project dashboard**
2. **Navigate to SQL Editor** in the left sidebar
3. **Copy the entire content** of `supabase-schema.sql`
4. **Paste and run** the SQL script
5. **Wait for completion** (should show "Query executed successfully")

#### Solution 2: Refresh Schema Cache

1. **Go to Supabase Dashboard**
2. **Navigate to Settings** → **API**
3. **Click "Reset project schema cache"**
4. **Wait 1-2 minutes** for the cache to rebuild
5. **Try your operation again**

#### Solution 3: Verify Table Creation

1. **Go to Supabase Dashboard**
2. **Navigate to Table Editor**
3. **Check if tables exist**:
   - `schedules`
   - `attendance`
   - `match_results`
4. **Verify column names** match exactly (case-sensitive):
   - `tanggalScrim`
   - `lawan`
   - `map`
   - `startMatch`
   - `fraksi`

#### Solution 4: Manual Table Recreation (If Needed)

If tables exist but have wrong column names:

```sql
-- Drop existing tables (WARNING: This will delete all data)
DROP TABLE IF EXISTS match_results;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS schedules;

-- Re-run the complete schema from supabase-schema.sql
```

#### Solution 5: Case Sensitivity Issues (PostgreSQL Specific)

If you're getting errors like `column "tanggalscrim" does not exist` but you created `"tanggalScrim"`:

```sql
-- The issue is that PostgreSQL is case-sensitive and some references
-- in indexes, constraints, or views might not use double quotes

-- Solution: Drop and recreate the entire schema with proper quoting
DROP TABLE IF EXISTS match_results CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;

-- Then re-run the complete supabase-schema.sql script
```

**Important**: All column references in PostgreSQL must use double quotes when the column name was created with double quotes. This includes:
- Table definitions
- Indexes
- Constraints
- Views
- Foreign key references
- JOIN conditions

### 📋 Verification Steps

After applying the solution, verify the fix:

1. **Check Table Structure**:
   ```sql
   -- In Supabase SQL Editor
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'schedules' 
   ORDER BY ordinal_position;
   ```

2. **Test Simple Query**:
   ```sql
   -- Test basic table access
   SELECT COUNT(*) FROM schedules;
   ```

3. **Test API Call**:
   - Try creating a simple schedule through the application
   - Check browser console for any remaining errors

### 🛠️ Prevention Tips

#### For Future Development:
1. **Always use double quotes** for column names in PostgreSQL
2. **Execute schema changes** before testing API calls
3. **Refresh schema cache** after structural changes
4. **Verify column names** match between code and database

#### Environment Setup:
1. **Set up Supabase project first**
2. **Execute SQL schema immediately**
3. **Test with simple operations first**
4. **Monitor for schema cache issues**

### 🔍 Debug Commands

#### Check Table Existence:
```sql
-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';
```

#### Check Column Names:
```sql
-- For schedules table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'schedules' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- For attendance table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'attendance' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- For match_results table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'match_results' 
AND table_schema = 'public'
ORDER BY ordinal_position;
```

#### Test Data Insertion:
```sql
-- Test inserting a sample schedule
INSERT INTO schedules (id, "tanggalScrim", "lawan", "map", "startMatch", "fraksi")
VALUES (1001, '2024-01-15', 'Test Team', 'Test Map', '19:00', 'Fraksi 1');

-- Verify insertion
SELECT * FROM schedules WHERE id = 1001;

-- Clean up test data
DELETE FROM schedules WHERE id = 1001;
```

### 📞 Additional Support

If the issue persists after trying all solutions:

1. **Check Supabase Logs**:
   - Go to Logs → Database in Supabase dashboard
   - Look for any error messages or warnings

2. **Verify Environment Variables**:
   ```bash
   # Check if variables are set correctly
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```

3. **Test Database Connection**:
   ```javascript
   // In browser console
   const { createClient } = supabase;
   const supabase = createClient(YOUR_URL, YOUR_ANON_KEY);
   const { data, error } = await supabase.from('schedules').select('*');
   console.log('Connection test:', { data, error });
   ```

4. **Contact Support**:
   - Check Supabase status page: https://status.supabase.com
   - Review Supabase documentation: https://supabase.com/docs
   - Submit support ticket through Supabase dashboard

---

## 🎯 Success Criteria

The issue is resolved when:
- ✅ Schema cache error no longer appears
- ✅ Tables are visible in Supabase Table Editor
- ✅ Column names match exactly between code and database
- ✅ Simple API calls (like creating a schedule) work correctly
- ✅ No schema-related errors in browser console or server logs

Remember: **Always execute the SQL schema first** before testing any database operations!
