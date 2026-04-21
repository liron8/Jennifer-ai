"use client";

/**
 * Simple Pie Chart Component
 * Visual pie chart using CSS conic-gradient
 */

interface PieData {
  label: string;
  value: number;
  color: string;
}

interface SimplePieChartProps {
  data: PieData[];
  size?: number;
}

export function SimplePieChart({ data, size = 160 }: SimplePieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-tertiary">
        No data available
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  // Build conic gradient
  let currentAngle = 0;
  const gradientStops = data.map((item) => {
    const startAngle = currentAngle;
    const percentage = (item.value / total) * 100;
    currentAngle += percentage;
    return `${item.color} ${startAngle}% ${currentAngle}%`;
  });

  return (
    <div className="flex items-center gap-6">
      <div
        className="rounded-full flex-shrink-0"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${gradientStops.join(", ")})`,
        }}
      />
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-tertiary">{item.label}</span>
            <span className="text-xs font-medium text-primary">
              {Math.round((item.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
