'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export interface OnboardingData {
  // Step 1: Company Details
  companyName: string;
  companySize: string;
  industry: string;
  website?: string;
  
  // Step 2: User Role
  fullName: string;
  jobTitle: string;
  role: string;
  phone?: string;
  
  // Step 3: Executives
  executives: Array<{
    fullName: string;
    title: string;
    email?: string;
  }>;
  
  // Step 4: Integrations (tracked separately)
  connectedIntegrations: string[];
}

const initialData: OnboardingData = {
  companyName: '',
  companySize: '',
  industry: '',
  website: '',
  fullName: '',
  jobTitle: '',
  role: '',
  phone: '',
  executives: [{ fullName: '', title: '', email: '' }],
  connectedIntegrations: [],
};

export function useOnboarding() {
  const router = useRouter();
  const [data, setData] = useState<OnboardingData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInvitedUser, setIsInvitedUser] = useState(false);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Check if user is invited (already has org_id)
  useEffect(() => {
    async function checkInvitedStatus() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('org_id, organizations:org_id(name)')
          .eq('id', user.id)
          .single();
        
        if (profile?.org_id) {
          setIsInvitedUser(true);
          // @ts-ignore - Supabase returns nested object
          setOrganizationName(profile.organizations?.name || null);
        }
      }
      setIsCheckingStatus(false);
    }
    
    checkInvitedStatus();
  }, []);

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const addExecutive = useCallback(() => {
    setData(prev => ({
      ...prev,
      executives: [...prev.executives, { fullName: '', title: '', email: '' }],
    }));
  }, []);

  const updateExecutive = useCallback((index: number, updates: Partial<OnboardingData['executives'][0]>) => {
    setData(prev => ({
      ...prev,
      executives: prev.executives.map((exec, i) => 
        i === index ? { ...exec, ...updates } : exec
      ),
    }));
  }, []);

  const removeExecutive = useCallback((index: number) => {
    setData(prev => ({
      ...prev,
      executives: prev.executives.filter((_, i) => i !== index),
    }));
  }, []);

  const completeOnboarding = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Not authenticated. Please sign in again.');
      }

      // Check if user already has an org (invited user)
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id, org_id, role')
        .eq('id', user.id)
        .single();

      const isInvitedUser = existingProfile?.org_id != null;
      let orgId: string;

      if (isInvitedUser) {
        // Invited user - just update their profile
        orgId = existingProfile.org_id;

        const { error: updateError } = await supabase
          .from('users')
          .update({
            full_name: data.fullName,
            job_title: data.jobTitle,
            phone: data.phone || null,
            onboarding_completed: true,
            onboarding_step: 6,
            onboarding_data: data,
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('User update error:', updateError);
          throw new Error('Failed to update profile: ' + updateError.message);
        }
      } else {
        // New user - create organization and profile
        const slug = data.companyName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

        // 1. Create organization
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: data.companyName,
            slug,
            size: data.companySize,
            industry: data.industry,
            website: data.website || null,
            subscription_tier: 'trial',
            subscription_status: 'active',
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single();

        if (orgError) {
          console.error('Org creation error:', orgError);
          throw new Error('Failed to create organization: ' + orgError.message);
        }

        orgId = org.id;

        // 2. Create user profile
        const { error: userProfileError } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            org_id: orgId,
            email: user.email!,
            full_name: data.fullName,
            job_title: data.jobTitle,
            phone: data.phone || null,
            role: 'admin',
            onboarding_completed: true,
            onboarding_step: 6,
            onboarding_data: data,
          });

        if (userProfileError) {
          console.error('User profile error:', userProfileError);
          throw new Error('Failed to create user profile: ' + userProfileError.message);
        }
      }

      // 3. Create executive profiles (for both new and invited users)
      const validExecutives = data.executives.filter(exec => exec.fullName.trim());

      if (validExecutives.length > 0) {
        const executivesToInsert = validExecutives.map(exec => ({
          org_id: orgId,
          full_name: exec.fullName,
          title: exec.title || null,
          email: exec.email || null,
          is_active: true,
        }));

        const { data: createdExecutives, error: execError } = await supabase
          .from('executive_profiles')
          .insert(executivesToInsert)
          .select();

        if (execError) {
          console.error('Executive creation error:', execError);
        }

        // 4. Create user-executive assignments
        if (createdExecutives && createdExecutives.length > 0) {
          const assignments = createdExecutives.map((exec, index) => ({
            user_id: user.id,
            executive_id: exec.id,
            is_primary: index === 0,
            role: 'assistant',
          }));

          const { error: assignmentError } = await supabase
            .from('user_executive_assignments')
            .insert(assignments);

          if (assignmentError) {
            console.error('Assignment error:', assignmentError);
          }
        }
      }

      // Success! Use replace so browser back-button won't return to onboarding
      setIsLoading(false);
      router.replace('/dashboard');
      return true;

    } catch (err) {
      console.error('Onboarding error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsLoading(false);
      return false;
    }
  }, [data, router]);

  return {
    data,
    updateData,
    addExecutive,
    updateExecutive,
    removeExecutive,
    completeOnboarding,
    isLoading,
    error,
    isInvitedUser,
    organizationName,
    isCheckingStatus,
  };
}
