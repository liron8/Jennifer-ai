/**
 * Test script to verify the complete signup → onboarding → dashboard flow
 * Run with: npx tsx scripts/test-full-flow.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://clanqzmeqgdkahejsxbx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsYW5xem1lcWdka2FoZWpzeGJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODEwOTcsImV4cCI6MjA3OTc1NzA5N30.fl8z7N0tVxcQkb9X0Z75CpXM-iJyBpEudMokOfgHMlY';

// Create client - we'll set the session after signup
let supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function testFullFlow() {
  console.log('🚀 Testing complete signup → onboarding → dashboard flow\n');
  console.log('='.repeat(60));

  // Generate unique test data
  const timestamp = Date.now();
  const testEmail = `test-${timestamp}@jeniferai-test.com`;
  const testPassword = 'TestPassword123!';
  const testName = 'Test User';

  // Step 1: Sign up
  console.log('\n📝 STEP 1: Sign up');
  console.log('-'.repeat(40));
  console.log(`Email: ${testEmail}`);
  console.log(`Password: ${testPassword}`);

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        full_name: testName,
      },
    },
  });

  if (signUpError) {
    console.error('❌ Signup failed:', signUpError.message);
    return;
  }

  if (!signUpData.user) {
    console.error('❌ No user returned from signup');
    return;
  }

  console.log('✅ Signup successful!');
  console.log(`   User ID: ${signUpData.user.id}`);
  console.log(`   Session: ${signUpData.session ? 'Created' : 'Pending email confirmation'}`);
  console.log(`   Access Token: ${signUpData.session?.access_token ? 'Present' : 'Missing'}`);

  // If no session, we need to sign in (email confirmation might be disabled)
  let session = signUpData.session;
  if (!session) {
    console.log('\n⏳ No session - attempting to sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message);
      console.log('   (This might be because email confirmation is required)');
      return;
    }

    session = signInData.session;
    console.log('✅ Sign in successful!');
  }

  // Verify the session is active
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  console.log(`   Current auth.uid(): ${currentUser?.id || 'NULL'}`);

  if (!currentUser) {
    console.error('❌ No authenticated user after signup/signin');
    return;
  }

  const userId = signUpData.user.id;

  // Step 2: Simulate onboarding - Create organization
  console.log('\n🏢 STEP 2: Create Organization (Onboarding)');
  console.log('-'.repeat(40));

  const orgData = {
    name: `Test Company ${timestamp}`,
    slug: `test-company-${timestamp}`,
    size: '11-50',
    industry: 'Technology',
    website: 'https://test-company.com',
    subscription_tier: 'trial',
    subscription_status: 'active',
    trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  };

  console.log(`   Company: ${orgData.name}`);
  console.log(`   Industry: ${orgData.industry}`);
  console.log(`   Size: ${orgData.size}`);

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert(orgData)
    .select()
    .single();

  if (orgError) {
    console.error('❌ Organization creation failed:', orgError.message);
    console.error('   Code:', orgError.code);
    console.error('   Details:', orgError.details);
    console.error('   Hint:', orgError.hint);
    return;
  }

  console.log('✅ Organization created!');
  console.log(`   Org ID: ${org.id}`);

  // Step 3: Create user profile
  console.log('\n👤 STEP 3: Create User Profile');
  console.log('-'.repeat(40));

  const userProfileData = {
    id: userId,
    org_id: org.id,
    email: testEmail,
    full_name: testName,
    job_title: 'Executive Assistant',
    role: 'admin',
    onboarding_completed: false,
    onboarding_step: 3,
  };

  console.log(`   Name: ${userProfileData.full_name}`);
  console.log(`   Job Title: ${userProfileData.job_title}`);
  console.log(`   Role: ${userProfileData.role}`);

  const { error: userProfileError } = await supabase
    .from('users')
    .upsert(userProfileData);

  if (userProfileError) {
    console.error('❌ User profile creation failed:', userProfileError.message);
    console.error('   Code:', userProfileError.code);
    console.error('   Details:', userProfileError.details);
    console.error('   Hint:', userProfileError.hint);
    return;
  }

  console.log('✅ User profile created!');

  // Step 4: Create executive profile
  console.log('\n👔 STEP 4: Create Executive Profile');
  console.log('-'.repeat(40));

  const executiveData = {
    org_id: org.id,
    full_name: 'John Executive',
    title: 'CEO',
    email: 'john.executive@test-company.com',
    is_active: true,
  };

  console.log(`   Executive: ${executiveData.full_name}`);
  console.log(`   Title: ${executiveData.title}`);

  const { data: executive, error: execError } = await supabase
    .from('executive_profiles')
    .insert(executiveData)
    .select()
    .single();

  if (execError) {
    console.error('❌ Executive profile creation failed:', execError.message);
    console.error('   Code:', execError.code);
    console.error('   Details:', execError.details);
    console.error('   Hint:', execError.hint);
    return;
  }

  console.log('✅ Executive profile created!');
  console.log(`   Executive ID: ${executive.id}`);

  // Step 5: Create user-executive assignment
  console.log('\n🔗 STEP 5: Create User-Executive Assignment');
  console.log('-'.repeat(40));

  const assignmentData = {
    user_id: userId,
    executive_id: executive.id,
    is_primary: true,
    role: 'assistant',
  };

  const { error: assignmentError } = await supabase
    .from('user_executive_assignments')
    .insert(assignmentData);

  if (assignmentError) {
    console.error('❌ Assignment creation failed:', assignmentError.message);
    console.error('   Code:', assignmentError.code);
    console.error('   Details:', assignmentError.details);
    console.error('   Hint:', assignmentError.hint);
    return;
  }

  console.log('✅ User-Executive assignment created!');

  // Step 6: Complete onboarding
  console.log('\n🎉 STEP 6: Complete Onboarding');
  console.log('-'.repeat(40));

  const { error: completeError } = await supabase
    .from('users')
    .update({
      onboarding_completed: true,
      onboarding_step: 6,
    })
    .eq('id', userId);

  if (completeError) {
    console.error('❌ Onboarding completion failed:', completeError.message);
    return;
  }

  console.log('✅ Onboarding marked as complete!');

  // Step 7: Verify the data
  console.log('\n🔍 STEP 7: Verify Data');
  console.log('-'.repeat(40));

  // Check user profile
  const { data: verifyUser, error: verifyUserError } = await supabase
    .from('users')
    .select('id, email, full_name, org_id, role, onboarding_completed')
    .eq('id', userId)
    .single();

  if (verifyUserError) {
    console.error('❌ Could not verify user:', verifyUserError.message);
  } else {
    console.log('✅ User verified:');
    console.log(`   ID: ${verifyUser.id}`);
    console.log(`   Email: ${verifyUser.email}`);
    console.log(`   Org ID: ${verifyUser.org_id}`);
    console.log(`   Onboarding Complete: ${verifyUser.onboarding_completed}`);
  }

  // Check organization
  const { data: verifyOrg, error: verifyOrgError } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('id', org.id)
    .single();

  if (verifyOrgError) {
    console.error('❌ Could not verify organization:', verifyOrgError.message);
  } else {
    console.log('✅ Organization verified:');
    console.log(`   ID: ${verifyOrg.id}`);
    console.log(`   Name: ${verifyOrg.name}`);
  }

  // Check executive
  const { data: verifyExec, error: verifyExecError } = await supabase
    .from('executive_profiles')
    .select('id, full_name, title')
    .eq('id', executive.id)
    .single();

  if (verifyExecError) {
    console.error('❌ Could not verify executive:', verifyExecError.message);
  } else {
    console.log('✅ Executive verified:');
    console.log(`   ID: ${verifyExec.id}`);
    console.log(`   Name: ${verifyExec.full_name}`);
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('🎊 FULL FLOW TEST COMPLETE!');
  console.log('='.repeat(60));
  console.log('\nSummary:');
  console.log(`  ✅ User created and authenticated`);
  console.log(`  ✅ Organization created`);
  console.log(`  ✅ User profile created with org_id`);
  console.log(`  ✅ Executive profile created`);
  console.log(`  ✅ User-Executive assignment created`);
  console.log(`  ✅ Onboarding marked complete`);
  console.log('\nThe user should now be able to access /dashboard');
  console.log(`\nTest credentials:`);
  console.log(`  Email: ${testEmail}`);
  console.log(`  Password: ${testPassword}`);
}

testFullFlow().catch(console.error);
