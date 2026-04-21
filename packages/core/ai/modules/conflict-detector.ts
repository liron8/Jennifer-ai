/**
 * Conflict Detector
 * Pure logic module for detecting scheduling conflicts, buffer violations,
 * and travel time issues between meetings. No AI model calls needed.
 */

export interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string | null;
  location_type?: string | null;
  status?: string | null;
}

export interface ConflictResult {
  type: 'overlap' | 'buffer_violation' | 'travel_conflict' | 'overbooked_day';
  severity: 'low' | 'medium' | 'high';
  description: string;
  meetings: Array<{ id: string; title: string }>;
  suggestion?: string;
}

/**
 * Detect all scheduling conflicts in a list of meetings.
 */
export function detectMeetingConflicts(
  meetings: Meeting[],
  options: {
    minBufferMinutes?: number;
    maxMeetingsPerDay?: number;
  } = {}
): ConflictResult[] {
  const { minBufferMinutes = 15, maxMeetingsPerDay = 6 } = options;
  const conflicts: ConflictResult[] = [];

  // Filter to active meetings and sort by start time
  const active = meetings
    .filter(m => m.status !== 'cancelled')
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  // Check for time overlaps
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      const aEnd = new Date(a.end_time).getTime();
      const bStart = new Date(b.start_time).getTime();

      if (aEnd > bStart) {
        conflicts.push({
          type: 'overlap',
          severity: 'high',
          description: `"${a.title}" (ends ${formatTime(a.end_time)}) overlaps with "${b.title}" (starts ${formatTime(b.start_time)})`,
          meetings: [
            { id: a.id, title: a.title },
            { id: b.id, title: b.title },
          ],
          suggestion: `Reschedule one of these meetings to eliminate the overlap.`,
        });
      }
    }
  }

  // Check buffer violations between consecutive non-overlapping meetings
  for (let i = 0; i < active.length - 1; i++) {
    const current = active[i];
    const next = active[i + 1];
    const gap = new Date(next.start_time).getTime() - new Date(current.end_time).getTime();
    const gapMinutes = gap / (1000 * 60);

    // Only check if they don't overlap (overlaps caught above)
    if (gap > 0 && gapMinutes < minBufferMinutes) {
      conflicts.push({
        type: 'buffer_violation',
        severity: 'medium',
        description: `Only ${Math.round(gapMinutes)} minutes between "${current.title}" and "${next.title}" (recommended: ${minBufferMinutes} min)`,
        meetings: [
          { id: current.id, title: current.title },
          { id: next.id, title: next.title },
        ],
        suggestion: `Add a ${minBufferMinutes}-minute buffer between meetings for transition time.`,
      });
    }
  }

  // Check travel conflicts between consecutive in-person meetings
  for (let i = 0; i < active.length - 1; i++) {
    const current = active[i];
    const next = active[i + 1];
    const gap = new Date(next.start_time).getTime() - new Date(current.end_time).getTime();
    const gapMinutes = gap / (1000 * 60);

    if (
      current.location_type === 'in_person' &&
      next.location_type === 'in_person' &&
      current.location &&
      next.location &&
      current.location !== next.location &&
      gapMinutes < 45 // Less than 45 min between different in-person locations
    ) {
      conflicts.push({
        type: 'travel_conflict',
        severity: 'high',
        description: `Only ${Math.round(gapMinutes)} minutes to travel from "${current.location}" to "${next.location}" between "${current.title}" and "${next.title}"`,
        meetings: [
          { id: current.id, title: current.title },
          { id: next.id, title: next.title },
        ],
        suggestion: `Check travel time between locations. Consider making one meeting virtual or rescheduling.`,
      });
    }
  }

  // Check for overbooked days
  if (active.length > maxMeetingsPerDay) {
    conflicts.push({
      type: 'overbooked_day',
      severity: 'medium',
      description: `${active.length} meetings scheduled (recommended max: ${maxMeetingsPerDay})`,
      meetings: active.map(m => ({ id: m.id, title: m.title })),
      suggestion: `Consider rescheduling ${active.length - maxMeetingsPerDay} meeting(s) to another day.`,
    });
  }

  return conflicts;
}

/**
 * Detect duplicate or near-duplicate tasks using simple word overlap.
 */
export function detectTaskDuplicates(
  tasks: Array<{ id: string; title: string; status: string }>
): Array<{ taskA: string; taskB: string; similarity: number; titleA: string; titleB: string }> {
  const duplicates: Array<{ taskA: string; taskB: string; similarity: number; titleA: string; titleB: string }> = [];
  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');

  for (let i = 0; i < activeTasks.length; i++) {
    for (let j = i + 1; j < activeTasks.length; j++) {
      const similarity = wordOverlapSimilarity(activeTasks[i].title, activeTasks[j].title);
      if (similarity > 0.6) {
        duplicates.push({
          taskA: activeTasks[i].id,
          taskB: activeTasks[j].id,
          similarity,
          titleA: activeTasks[i].title,
          titleB: activeTasks[j].title,
        });
      }
    }
  }

  return duplicates.sort((a, b) => b.similarity - a.similarity);
}

function wordOverlapSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }

  return (2 * overlap) / (wordsA.size + wordsB.size);
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
