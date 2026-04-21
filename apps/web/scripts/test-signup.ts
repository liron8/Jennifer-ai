/**
 * Test script to verify Supabase signup works correctly
 * Run with: npx tsx scripts/test-signup.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://clanqzmeqgdkahejsxbx.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsYW5xem1lcWdka2FoZWpzeGJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODEwOTcsImV4cCI6MjA3OTc1NzA5N30.fl8z7N0tVxcQkb9X0Z75CpXM-iJyBpEudMokOfgHMlY';

async function testSignup() {
  console.log('Testing Supabase signup...');
  console.log('Supabase URL:', supabaseUrl);
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = 'Test User';
  
  console.log('\nAttempting signup with:');
  console.log('  Email:', testEmail);
  console.log('  Password:', testPassword);
  console.log('  Name:', testName);
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: testName,
        },
      },
    });
    
    if (error) {
      console.error('\n❌ Signup failed with error:');
      console.error('  Message:', error.message);
      console.error('  Status:', error.status);
      console.error('  Full error:', JSON.stringify(error, null, 2));
      return;
    }
    
    console.log('\n✅ Signup successful!');
    console.log('  User ID:', data.user?.id);
    console.log('  Email:', data.user?.email);
    console.log('  Session:', data.session ? 'Created' : 'Not created (email confirmation required)');
    console.log('  Identities:', data.user?.identities?.length || 0);
    
    if (!data.session) {
      console.log('\n📧 Email confirmation is enabled in Supabase.');
      console.log('   User needs to confirm their email before they can sign in.');
    }
    
  } catch (err) {
    console.error('\n❌ Unexpected error:');
    console.error(err);
  }
}

testSignup();
