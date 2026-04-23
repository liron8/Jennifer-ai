const KEY_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

export function formatKeyDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  const base = date.toLocaleDateString("en-GB", KEY_DATE_FORMAT);
  const [day, month, year] = base.split(" ");
  if (!day || !month || !year) return base;
  return `${day} ${month}, ${year}`;
}

