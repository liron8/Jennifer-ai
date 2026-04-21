'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { OnboardingFormData } from '../OnboardingWizard';

interface CompanyStepProps {
  data: OnboardingFormData;
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

const INDUSTRIES = [
  'Technology',
  'Finance',
  'Healthcare',
  'Legal',
  'Real Estate',
  'Manufacturing',
  'Consulting',
  'Non-Profit',
  'Government',
  'Other',
];

export function CompanyStep({ data, onNext, onBack, isFirstStep }: CompanyStepProps) {
  const [formData, setFormData] = useState({
    companyName: data.company.companyName || '',
    companySize: data.company.companySize || '',
    industry: data.company.industry || '',
    companyWebsite: data.company.companyWebsite || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  const isValid = formData.companyName && formData.companySize && formData.industry;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      {!isFirstStep && (
        <button
          onClick={onBack}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
      )}

      {/* Heading */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">Tell us about your company</h1>
        <p className="text-muted-foreground mt-2">
          This helps us customize your experience
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="companyName" className="text-sm font-medium">
            Company name <span className="text-red-500">*</span>
          </label>
          <input
            id="companyName"
            type="text"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            placeholder="Enter your company name"
            required
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="companySize" className="text-sm font-medium">
            Company size <span className="text-red-500">*</span>
          </label>
          <select
            id="companySize"
            value={formData.companySize}
            onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
            required
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
          >
            <option value="">Select company size</option>
            {COMPANY_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} employees
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="industry" className="text-sm font-medium">
            Industry <span className="text-red-500">*</span>
          </label>
          <select
            id="industry"
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            required
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
          >
            <option value="">Select industry</option>
            {INDUSTRIES.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="companyWebsite" className="text-sm font-medium">
            Company website <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            id="companyWebsite"
            type="url"
            value={formData.companyWebsite}
            onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value })}
            placeholder="https://example.com"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
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
