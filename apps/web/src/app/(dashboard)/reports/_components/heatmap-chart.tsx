"use client";

/**
 * Heatmap Chart Component
 * Shows meeting density by day/hour
 */

interface HeatmapChartProps {
  data: number[][]; // 7 days x 12 hours (8am-8pm)
}

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = ["8am", "9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm", "4pm", "5pm", "6pm", "7pm"];

const getHeatColor = (value: number, max: number) => {
  if (value === 0) return "bg-secondary";
  const intensity = value / max;
  if (intensity < 0.25) return "bg-brand-100";
  if (intensity < 0.5) return "bg-brand-200";
  if (intensity < 0.75) return "bg-brand-400";
  return "bg-brand-600";
};

export function HeatmapChart({ data }: HeatmapChartProps) {
  const max = Math.max(...data.flat());

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[500px]">
        {/* Hour labels */}
        <div className="flex mb-1">
          <div className="w-10" />
          {hours.map((hour) => (
            <div key={hour} className="flex-1 text-center text-[10px] text-tertiary">
              {hour}
            </div>
          ))}
        </div>

        {/* Grid */}
        {days.map((day, dayIndex) => (
          <div key={day} className="flex items-center gap-1 mb-1">
            <div className="w-10 text-xs text-tertiary">{day}</div>
            {hours.map((_, hourIndex) => (
              <div
                key={hourIndex}
                className={`flex-1 h-6 rounded ${getHeatColor(data[dayIndex]?.[hourIndex] || 0, max)}`}
                title={`${data[dayIndex]?.[hourIndex] || 0} meetings`}
              />
            ))}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-3">
          <span className="text-[10px] text-tertiary">Less</span>
          <div className="flex gap-0.5">
            <div className="w-4 h-4 rounded bg-secondary" />
            <div className="w-4 h-4 rounded bg-brand-100" />
            <div className="w-4 h-4 rounded bg-brand-200" />
            <div className="w-4 h-4 rounded bg-brand-400" />
            <div className="w-4 h-4 rounded bg-brand-600" />
          </div>
          <span className="text-[10px] text-tertiary">More</span>
        </div>
      </div>
    </div>
  );
}
