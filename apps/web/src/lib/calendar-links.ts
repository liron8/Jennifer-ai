/**
 * Calendar Link Generators
 * Generate URLs to add events to Google Calendar, Outlook, and other calendar apps
 * These use redirect-based URLs that don't require API keys
 */

export interface CalendarEventData {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  isAllDay?: boolean;
}

/**
 * Generate Google Calendar "Add Event" URL
 * Opens Google Calendar with pre-filled event details
 */
export function generateGoogleCalendarUrl(event: CalendarEventData): string {
  const params = new URLSearchParams();
  
  params.append('action', 'TEMPLATE');
  params.append('text', event.title);
  
  if (event.description) {
    params.append('details', event.description);
  }
  
  if (event.location) {
    params.append('location', event.location);
  }
  
  // Format dates for Google Calendar (YYYYMMDDTHHmmssZ for specific times, YYYYMMDD for all-day)
  if (event.isAllDay) {
    const startDate = formatDateForGoogle(event.startTime, true);
    const endDate = formatDateForGoogle(event.endTime, true);
    params.append('dates', `${startDate}/${endDate}`);
  } else {
    const startDate = formatDateForGoogle(event.startTime, false);
    const endDate = formatDateForGoogle(event.endTime, false);
    params.append('dates', `${startDate}/${endDate}`);
  }
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook Calendar "Add Event" URL (Outlook.com / Office 365)
 * Opens Outlook Calendar with pre-filled event details
 */
export function generateOutlookCalendarUrl(event: CalendarEventData): string {
  const params = new URLSearchParams();
  
  params.append('path', '/calendar/action/compose');
  params.append('rru', 'addevent');
  params.append('subject', event.title);
  
  if (event.description) {
    params.append('body', event.description);
  }
  
  if (event.location) {
    params.append('location', event.location);
  }
  
  // Format dates for Outlook (ISO 8601)
  params.append('startdt', event.startTime.toISOString());
  params.append('enddt', event.endTime.toISOString());
  
  if (event.isAllDay) {
    params.append('allday', 'true');
  }
  
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate Office 365 Calendar "Add Event" URL
 * For corporate Office 365 accounts
 */
export function generateOffice365CalendarUrl(event: CalendarEventData): string {
  const params = new URLSearchParams();
  
  params.append('path', '/calendar/action/compose');
  params.append('rru', 'addevent');
  params.append('subject', event.title);
  
  if (event.description) {
    params.append('body', event.description);
  }
  
  if (event.location) {
    params.append('location', event.location);
  }
  
  params.append('startdt', event.startTime.toISOString());
  params.append('enddt', event.endTime.toISOString());
  
  if (event.isAllDay) {
    params.append('allday', 'true');
  }
  
  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate Yahoo Calendar "Add Event" URL
 */
export function generateYahooCalendarUrl(event: CalendarEventData): string {
  const params = new URLSearchParams();
  
  params.append('v', '60');
  params.append('title', event.title);
  
  if (event.description) {
    params.append('desc', event.description);
  }
  
  if (event.location) {
    params.append('in_loc', event.location);
  }
  
  // Format: YYYYMMDDTHHMMSS
  const startDate = formatDateForYahoo(event.startTime);
  const endDate = formatDateForYahoo(event.endTime);
  params.append('st', startDate);
  params.append('et', endDate);
  
  if (event.isAllDay) {
    params.append('dur', 'allday');
  }
  
  return `https://calendar.yahoo.com/?${params.toString()}`;
}

/**
 * Generate ICS file content for download (works with Apple Calendar, etc.)
 */
export function generateICSContent(event: CalendarEventData): string {
  const formatICSDate = (date: Date, allDay: boolean): string => {
    if (allDay) {
      return date.toISOString().split('T')[0].replace(/-/g, '');
    }
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const escapeICS = (text: string): string => {
    return text.replace(/[\\;,\n]/g, (match) => {
      if (match === '\n') return '\\n';
      return '\\' + match;
    });
  };
  
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JeniferAI//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${formatICSDate(event.startTime, event.isAllDay || false)}`,
    `DTEND:${formatICSDate(event.endTime, event.isAllDay || false)}`,
    `SUMMARY:${escapeICS(event.title)}`,
  ];
  
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
  }
  
  if (event.location) {
    lines.push(`LOCATION:${escapeICS(event.location)}`);
  }
  
  lines.push(
    `UID:${Date.now()}@jeniferai.com`,
    `DTSTAMP:${formatICSDate(new Date(), false)}`,
    'END:VEVENT',
    'END:VCALENDAR'
  );
  
  return lines.join('\r\n');
}

/**
 * Download ICS file
 */
export function downloadICSFile(event: CalendarEventData, filename?: string): void {
  const icsContent = generateICSContent(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Helper functions
function formatDateForGoogle(date: Date, allDay: boolean): string {
  if (allDay) {
    // Format: YYYYMMDD
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }
  // Format: YYYYMMDDTHHmmssZ
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function formatDateForYahoo(date: Date): string {
  // Format: YYYYMMDDTHHMMSS (local time)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * Generate all calendar links for an event
 */
export function generateAllCalendarLinks(event: CalendarEventData) {
  return {
    google: generateGoogleCalendarUrl(event),
    outlook: generateOutlookCalendarUrl(event),
    office365: generateOffice365CalendarUrl(event),
    yahoo: generateYahooCalendarUrl(event),
  };
}
