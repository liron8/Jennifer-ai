/**
 * Inbox Insights Hook
 * Fetch inbox/communication analytics from the API
 */

import { useState, useEffect, useCallback } from 'react';

export interface InboxInsightsData {
  date_range: {
    start: string;
    end: string;
    days: number;
  };
  metrics: {
    emails_received: number;
    emails_sent: number;
    avg_response_time: string;
    reply_rate: string;
    received_change: string;
    sent_change: string;
    response_time_change: string;
    reply_rate_change: string;
  };
  charts: {
    email_volume: { label: string; value: number; color: string }[];
    email_categories: { label: string; value: number; color: string }[];
    top_contacts: { name: string; role: string; count: number }[];
    response_time: { label: string; value: number; color: string }[];
  };
}

interface UseInboxInsightsReturn {
  data: InboxInsightsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useInboxInsights(range: number = 30): UseInboxInsightsReturn {
  const [data, setData] = useState<InboxInsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reports/inbox-insights?range=${range}`);

      if (!response.ok) {
        throw new Error('Failed to fetch inbox insights');
      }

      const result = await response.json();
      const insights = result.data?.data ?? result.data;
      setData(insights);
    } catch (err) {
      console.error('Error fetching inbox insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch inbox insights');
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchInsights,
  };
}
