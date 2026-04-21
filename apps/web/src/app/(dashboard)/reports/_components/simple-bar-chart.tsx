"use client";

/**
 * Simple Bar Chart Component
 * Visual bar chart without external dependencies
 */

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: BarData[];
  maxValue?: number;
}

export function SimpleBarChart({ data, maxValue }: SimpleBarChartProps) {
  const allZero = !data || data.length === 0 || data.every((d) => d.value === 0);
  if (allZero) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-tertiary">
        No data available
      </div>
    );
  }

  const max = maxValue || Math.max(...data.map((d) => d.value));

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          <span className="w-20 text-xs text-tertiary truncate">{item.label}</span>
          <div className="flex-1 h-6 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color || "var(--color-brand-500)",
              }}
            />
          </div>
          <span className="w-12 text-xs font-medium text-primary text-right">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
