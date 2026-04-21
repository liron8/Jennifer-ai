'use client';

import { useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import type { OnboardingFormData } from '../OnboardingWizard';

interface ExecutivesStepProps {
  data: OnboardingFormData;
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

interface Executive {
  id: string;
  fullName: string;
  title: string;
  email?: string;
  phone?: string;
}

export function ExecutivesStep({ data, onNext, onBack }: ExecutivesStepProps) {
  const [executives, setExecutives] = useState<Executive[]>(
    data.executives.length > 0
      ? data.executives.map((exec, i) => ({ ...exec, id: `exec-${i}` }))
      : [{ id: 'exec-0', fullName: '', title: '', email: '', phone: '' }]
  );

  const addExecutive = () => {
    setExecutives([
      ...executives,
      { id: `exec-${Date.now()}`, fullName: '', title: '', email: '', phone: '' },
    ]);
  };

  const removeExecutive = (id: string) => {
    if (executives.length > 1) {
      setExecutives(executives.filter((exec) => exec.id !== id));
    }
  };

  const updateExecutive = (id: string, field: keyof Executive, value: string) => {
    setExecutives(
      executives.map((exec) =>
        exec.id === id ? { ...exec, [field]: value } : exec
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Remove the id field before saving
    const cleanedExecutives = executives.map(({ fullName, title, email, phone }) => ({
      fullName,
      title,
      email,
      phone,
    }));
    onNext({ executives: cleanedExecutives });
  };

  const isValid = executives.every((exec) => exec.fullName && exec.title);

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
        <h1 className="text-2xl font-bold">Add your executives</h1>
        <p className="text-muted-foreground mt-2">
          Who do you support? You can add more later.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {executives.map((exec, index) => (
          <div key={exec.id} className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Executive {index + 1}</h3>
              {executives.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeExecutive(exec.id)}
                  className="text-muted-foreground hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Full name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={exec.fullName}
                  onChange={(e) => updateExecutive(exec.id, 'fullName', e.target.value)}
                  placeholder="John Smith"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={exec.title}
                  onChange={(e) => updateExecutive(exec.id, 'title', e.target.value)}
                  placeholder="CEO"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={exec.email}
                  onChange={(e) => updateExecutive(exec.id, 'email', e.target.value)}
                  placeholder="john@company.com"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <input
                  type="tel"
                  value={exec.phone}
                  onChange={(e) => updateExecutive(exec.id, 'phone', e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addExecutive}
          className="w-full py-2 px-4 border border-dashed rounded-lg text-muted-foreground hover:text-foreground hover:border-foreground flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add another executive
        </button>

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
