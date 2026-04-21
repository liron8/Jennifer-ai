"use client";

/**
 * Support / Help Center Page
 * Provides FAQs, contact info, and helpful resources
 */

import { useState } from "react";
import {
  BookOpen02,
  HelpCircle,
  LifeBuoy01,
  Mail01,
  MessageChatCircle,
  Phone,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  SearchLg,
} from "@untitledui/icons";
import { InputBase } from "@/components/base/input/input";

const faqs = [
  {
    question: "How do I connect my calendar?",
    answer:
      "Go to Settings → Integrations and click on Google Calendar or Microsoft Outlook. Follow the OAuth flow to grant access. Once connected, your meetings will sync automatically.",
  },
  {
    question: "How do I add a new executive?",
    answer:
      'Navigate to Team (Executives) and click the "Add Executive" button. Follow the step-by-step onboarding flow to enter their profile information, preferences, and contact details.',
  },
  {
    question: "How do I create and assign tasks?",
    answer:
      'Go to Task Hub → To-Do and click "Add Task." Fill in the task details including title, description, priority, and due date. You can assign the task to a specific executive and team member.',
  },
  {
    question: "How do I manage approvals?",
    answer:
      "Approvals can be created from Task Hub → Approvals. Each approval request includes a title, description, priority, and can be assigned to an executive for review. The executive can then approve or reject the request.",
  },
  {
    question: "What are delegations?",
    answer:
      "Delegations allow you to assign tasks to other team members or EAs. Go to Task Hub → Delegations to view and manage delegated tasks. Each delegation tracks the assignee, status, and completion.",
  },
  {
    question: "How do I track key dates?",
    answer:
      "Use the Key Dates module to track birthdays, anniversaries, deadlines, and other important dates. You can set reminders and link dates to contacts or executive profiles.",
  },
  {
    question: "Can I customize task categories?",
    answer:
      "Yes! You can customize categories for tasks and delegations from the Task Hub. Click on the category management option to add, rename, or remove categories.",
  },
  {
    question: "How do I invite team members?",
    answer:
      'Go to Settings → Team and click "Invite Team Member." Enter their email address and select a role. They will receive an invitation email to join your organization.',
  },
  {
    question: "How does the AI assistant work?",
    answer:
      'Click "Ask Jenifer" in the sidebar to access the AI assistant. Jenifer can help you with scheduling, task management, writing emails, and more. Just type your request naturally.',
  },
  {
    question: "How do I change my password?",
    answer:
      "Go to Settings → My Profile and look for the Change Password section. Enter your current password and your new password to update it.",
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-secondary last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-4 text-left transition-colors hover:text-brand-600"
      >
        <span className="text-sm font-medium text-primary pr-4">{question}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-quaternary" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-quaternary" />
        )}
      </button>
      {isOpen && (
        <div className="pb-4">
          <p className="text-sm text-tertiary leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-4xl p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10">
          <LifeBuoy01 className="h-7 w-7 text-brand-600" />
        </div>
        <h1 className="text-2xl font-semibold text-primary lg:text-3xl">
          Help & Support
        </h1>
        <p className="mt-2 text-sm text-tertiary lg:text-base">
          Find answers to common questions or reach out to our support team.
        </p>
      </div>

      {/* Contact Cards */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <a
          href="mailto:support@tryjennifer.com"
          className="group flex flex-col items-center rounded-xl border border-secondary bg-primary p-6 text-center transition-all hover:border-brand-300 hover:shadow-md"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10">
            <Mail01 className="h-5 w-5 text-brand-600" />
          </div>
          <h3 className="text-sm font-semibold text-primary">Email Support</h3>
          <p className="mt-1 text-xs text-tertiary">support@tryjennifer.com</p>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 group-hover:underline">
            Send email <ArrowUpRight className="h-3 w-3" />
          </span>
        </a>

        <a
          href="https://tryjennifer.com/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center rounded-xl border border-secondary bg-primary p-6 text-center transition-all hover:border-brand-300 hover:shadow-md"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10">
            <BookOpen02 className="h-5 w-5 text-brand-600" />
          </div>
          <h3 className="text-sm font-semibold text-primary">Documentation</h3>
          <p className="mt-1 text-xs text-tertiary">Guides and tutorials</p>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 group-hover:underline">
            View docs <ArrowUpRight className="h-3 w-3" />
          </span>
        </a>

        <a
          href="mailto:support@tryjennifer.com?subject=Feature Request"
          className="group flex flex-col items-center rounded-xl border border-secondary bg-primary p-6 text-center transition-all hover:border-brand-300 hover:shadow-md"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10">
            <MessageChatCircle className="h-5 w-5 text-brand-600" />
          </div>
          <h3 className="text-sm font-semibold text-primary">Feature Request</h3>
          <p className="mt-1 text-xs text-tertiary">Suggest an improvement</p>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 group-hover:underline">
            Submit request <ArrowUpRight className="h-3 w-3" />
          </span>
        </a>
      </div>

      {/* FAQ Section */}
      <div className="rounded-xl border border-secondary bg-primary">
        <div className="border-b border-secondary px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-primary">
                Frequently Asked Questions
              </h2>
              <p className="text-xs text-tertiary">{filteredFaqs.length} questions</p>
            </div>
            <div className="w-full sm:w-64">
              <InputBase
                size="sm"
                type="search"
                aria-label="Search FAQs"
                placeholder="Search FAQs..."
                icon={SearchLg}
                value={searchQuery}
                onChange={(val: string) => setSearchQuery(val)}
              />
            </div>
          </div>
        </div>
        <div className="px-6">
          {filteredFaqs.length === 0 ? (
            <div className="py-12 text-center">
              <HelpCircle className="mx-auto mb-3 h-8 w-8 text-quaternary" />
              <p className="text-sm text-tertiary">
                No matching questions found. Try a different search term or{" "}
                <a
                  href="mailto:support@tryjennifer.com"
                  className="text-brand-600 hover:underline"
                >
                  contact support
                </a>
                .
              </p>
            </div>
          ) : (
            filteredFaqs.map((faq, index) => (
              <FAQItem key={index} question={faq.question} answer={faq.answer} />
            ))
          )}
        </div>
      </div>

      {/* Still need help section */}
      <div className="mt-8 rounded-xl bg-brand-50 dark:bg-brand-500/5 p-6 text-center">
        <h3 className="text-sm font-semibold text-primary">
          Still need help?
        </h3>
        <p className="mt-1 text-sm text-tertiary">
          Our support team is available Monday–Friday, 9am–6pm PT.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <a
            href="mailto:support@tryjennifer.com"
            className="inline-flex items-center gap-2 rounded-lg border border-secondary bg-primary px-4 py-2 text-sm font-medium text-primary shadow-xs transition-colors hover:bg-primary_hover"
          >
            <Mail01 className="h-4 w-4" />
            Email us
          </a>
          <a
            href="tel:+18001234567"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors hover:bg-brand-700"
          >
            <Phone className="h-4 w-4" />
            Call support
          </a>
        </div>
      </div>
    </div>
  );
}
