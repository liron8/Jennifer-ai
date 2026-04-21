/**
 * Intelligence Modules — Barrel Export
 */

export {
  detectMeetingConflicts,
  detectTaskDuplicates,
  type ConflictResult,
  type Meeting,
} from './conflict-detector';

export {
  predictTravelTime,
  checkTravelTimeBetweenMeetings,
  type TravelEstimate,
  type TravelConflict,
} from './traffic-predictor';

export {
  generateBrief,
  type BriefResult,
} from './meeting-brief-generator';
