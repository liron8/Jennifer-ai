/**
 * Brand logos for integration cards
 * Inline SVGs to avoid external URL dependencies
 */

import React from "react";

const svgProps = { className: "h-8 w-8", viewBox: "0 0 48 48", fill: "none", xmlns: "http://www.w3.org/2000/svg" } as const;

export function OutlookLogo() {
  return (
    <svg {...svgProps}>
      <path d="M28.5 44H7.5C6.672 44 6 43.328 6 42.5V17.5L18 12L28.5 17.5V44Z" fill="#1976D2" />
      <path d="M28.5 6H42.5C43.328 6 44 6.672 44 7.5V17.5L28.5 12V6Z" fill="#1976D2" />
      <path d="M28.5 17.5H44V30.5H28.5V17.5Z" fill="#2196F3" />
      <path d="M28.5 30.5H44V42.5C44 43.328 43.328 44 42.5 44H28.5V30.5Z" fill="#1565C0" />
      <path d="M28.5 6V17.5H44V7.5C44 6.672 43.328 6 42.5 6H28.5Z" fill="#42A5F5" />
      <path d="M6 17.5H28.5V44H7.5C6.672 44 6 43.328 6 42.5V17.5Z" fill="#1565C0" />
      <path d="M4 13L22 10V40L4 37V13Z" fill="#0D47A1" />
      <ellipse cx="13" cy="25" rx="5.5" ry="7" stroke="white" strokeWidth="2" fill="none" />
    </svg>
  );
}

export function TeamsLogo() {
  return (
    <svg {...svgProps}>
      <path d="M31 14C31 11.239 33.239 9 36 9C38.761 9 41 11.239 41 14C41 16.761 38.761 19 36 19C33.239 19 31 16.761 31 14Z" fill="#5059C9" />
      <path d="M44 22H33C32.448 22 32 22.448 32 23V34C32 37.866 35.134 41 39 41C42.866 41 46 37.866 46 34V24C46 22.895 45.105 22 44 22Z" fill="#5059C9" />
      <path d="M17 14C17 10.686 19.686 8 23 8C26.314 8 29 10.686 29 14C29 17.314 26.314 20 23 20C19.686 20 17 17.314 17 14Z" fill="#7B83EB" />
      <path d="M33 22H13C12.448 22 12 22.448 12 23V36C12 40.418 15.582 44 20 44H26C30.418 44 34 40.418 34 36V23C34 22.448 33.552 22 33 22Z" fill="#7B83EB" />
      <path d="M4 15L22 12V38L4 35V15Z" fill="#4B53BC" />
      <path d="M8 21H18V23H14V33H12V23H8V21Z" fill="white" />
    </svg>
  );
}

export function ZoomLogo() {
  return (
    <svg {...svgProps}>
      <rect x="4" y="10" width="40" height="28" rx="8" fill="#2D8CFF" />
      <path d="M10 19H22C23.1 19 24 19.9 24 21V29C24 30.1 23.1 31 22 31H10C8.9 31 8 30.1 8 29V21C8 19.9 8.9 19 10 19Z" fill="white" />
      <path d="M26 23L34 19V31L26 27V23Z" fill="white" />
    </svg>
  );
}

export function GoogleCalendarLogo() {
  return (
    <svg {...svgProps}>
      <path d="M36 4H12C7.582 4 4 7.582 4 12V36C4 40.418 7.582 44 12 44H36C40.418 44 44 40.418 44 36V12C44 7.582 40.418 4 36 4Z" fill="white" />
      <path d="M36 4H31V14H44V12C44 7.582 40.418 4 36 4Z" fill="#EA4335" />
      <path d="M44 14H31V26H44V14Z" fill="#FBBC04" />
      <path d="M44 26H31V44H36C40.418 44 44 40.418 44 36V26Z" fill="#34A853" />
      <path d="M17 44H31V26H17V44Z" fill="#188038" />
      <path d="M4 26H17V14H4V26Z" fill="#1967D2" />
      <path d="M17 4H12C7.582 4 4 7.582 4 12V14H17V4Z" fill="#1A73E8" />
      <path d="M4 26V36C4 40.418 7.582 44 12 44H17V26H4Z" fill="#0B8043" />
      <path d="M20 20.5L22.5 23L28 17.5" stroke="#1967D2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="20" y1="28" x2="28" y2="28" stroke="#1967D2" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="32" x2="26" y2="32" stroke="#1967D2" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function GmailLogo() {
  return (
    <svg {...svgProps}>
      <path d="M6 12L6 38C6 39.1 6.9 40 8 40H14V24L24 31L34 24V40H40C41.1 40 42 39.1 42 38V12L24 26L6 12Z" fill="#FFFFFF" />
      <path d="M42 12V14L34 20V40H40C41.1 40 42 39.1 42 38V12Z" fill="#34A853" />
      <path d="M6 12V14L14 20V40H8C6.9 40 6 39.1 6 38V12Z" fill="#4285F4" />
      <path d="M6 12L24 26L42 12C42 10.34 40.66 8 39 8H9C7.34 8 6 10.34 6 12Z" fill="#EA4335" />
      <path d="M6 12L14 20V14L6 12Z" fill="#C5221F" />
      <path d="M42 12L34 20V14L42 12Z" fill="#0B8043" />
    </svg>
  );
}

export function SlackLogo() {
  return (
    <svg {...svgProps}>
      <path d="M18.5 6C17.12 6 16 7.12 16 8.5C16 9.88 17.12 11 18.5 11H21V8.5C21 7.12 19.88 6 18.5 6Z" fill="#E01E5A" />
      <path d="M18.5 13H8.5C7.12 13 6 14.12 6 15.5C6 16.88 7.12 18 8.5 18H18.5C19.88 18 21 16.88 21 15.5C21 14.12 19.88 13 18.5 13Z" fill="#E01E5A" />
      <path d="M42 15.5C42 14.12 40.88 13 39.5 13C38.12 13 37 14.12 37 15.5V18H39.5C40.88 18 42 16.88 42 15.5Z" fill="#2EB67D" />
      <path d="M29.5 18H35V15.5C35 14.12 33.88 13 32.5 13C31.12 13 30 14.12 30 15.5V18H29.5C28.12 18 27 19.12 27 20.5C27 21.88 28.12 23 29.5 23H39.5C40.88 23 42 21.88 42 20.5C42 19.12 40.88 18 39.5 18H35H29.5Z" fill="#2EB67D" />
      <path d="M29.5 42C30.88 42 32 40.88 32 39.5C32 38.12 30.88 37 29.5 37H27V39.5C27 40.88 28.12 42 29.5 42Z" fill="#ECB22E" />
      <path d="M29.5 30H39.5C40.88 30 42 31.12 42 32.5C42 33.88 40.88 35 39.5 35H29.5C28.12 35 27 33.88 27 32.5C27 31.12 28.12 30 29.5 30Z" fill="#ECB22E" />
      <path d="M6 32.5C6 33.88 7.12 35 8.5 35C9.88 35 11 33.88 11 32.5V30H8.5C7.12 30 6 31.12 6 32.5Z" fill="#36C5F0" />
      <path d="M18.5 30H13V32.5C13 33.88 14.12 35 15.5 35C16.88 35 18 33.88 18 32.5V30H18.5C19.88 30 21 28.88 21 27.5C21 26.12 19.88 25 18.5 25H8.5C7.12 25 6 26.12 6 27.5C6 28.88 7.12 30 8.5 30H13H18.5Z" fill="#36C5F0" />
    </svg>
  );
}

export const integrationLogos: Record<string, React.FC> = {
  outlook_calendar: OutlookLogo,
  teams: TeamsLogo,
  zoom: ZoomLogo,
  google_calendar: GoogleCalendarLogo,
  gmail: GmailLogo,
  slack: SlackLogo,
};
