'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { OnboardingFormData } from '../OnboardingWizard';

interface RoleStepProps {
  data: OnboardingFormData;
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const ROLES = [
  { value: 'executive_assistant', label: 'Executive Assistant' },
  { value: 'chief_of_staff', label: 'Chief of Staff' },
  { value: 'office_manager', label: 'Office Manager' },
  { value: 'executive', label: 'Executive' },
  { value: 'other', label: 'Other' },
];

export function RoleStep({ data, onNext, onBack }: RoleStepProps) {
  const [formData, setFormData] = useState({
    fullName: data.role.fullName || '',
    jobTitle: data.role.jobTitle || '',
    role: data.role.role || '',
    phoneNumber: data.role.phoneNumber || '',
    timezone: data.role.timezone || '',
  });

  // Auto-detect timezone
  useEffect(() => {
    if (!formData.timezone) {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setFormData((prev) => ({ ...prev, timezone: detectedTimezone }));
    }
  }, [formData.timezone]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  const isValid = formData.fullName && formData.jobTitle && formData.role && formData.phoneNumber;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </button>

      {/* Heading */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">Tell us about yourself</h1>
        <p className="text-muted-foreground mt-2">
          Help us personalize your experience
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-medium">
            Full name <span className="text-red-500">*</span>
          </label>
          <input
            id="fullName"
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="Enter your full name"
            required
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="jobTitle" className="text-sm font-medium">
            Job title <span className="text-red-500">*</span>
          </label>
          <input
            id="jobTitle"
            type="text"
            value={formData.jobTitle}
            onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
            placeholder="e.g., Executive Assistant to CEO"
            required
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="role" className="text-sm font-medium">
            Your role <span className="text-red-500">*</span>
          </label>
          <select
            id="role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            required
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
          >
            <option value="">Select your role</option>
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="phoneNumber" className="text-sm font-medium">
            Phone number <span className="text-red-500">*</span>
          </label>
          <input
            id="phoneNumber"
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            placeholder="+1 (555) 000-0000"
            required
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground">Used for MFA verification</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="timezone" className="text-sm font-medium">
            Timezone <span className="text-red-500">*</span>
          </label>
          <input
            id="timezone"
            type="text"
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            placeholder="America/Los_Angeles"
            required
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground">Auto-detected from your browser</p>
        </div>

        <button
          type="submit"
          disabled={!isValid}
          className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
