const AMSTERDAM_TIME_ZONE = "Europe/Amsterdam";

export function formatCalendarDate(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    timeZone: AMSTERDAM_TIME_ZONE,
  }).format(new Date(value));
}

export function formatRelativeTime(value: string): string {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1_000),
  );

  if (elapsedSeconds < 60) return "net";
  if (elapsedSeconds < 3_600) {
    return `${Math.floor(elapsedSeconds / 60)} min geleden`;
  }
  if (elapsedSeconds < 86_400) {
    return `${Math.floor(elapsedSeconds / 3_600)} uur geleden`;
  }
  if (elapsedSeconds < 172_800) return "gisteren";

  return formatCalendarDate(value);
}

export function formatClockTime(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: AMSTERDAM_TIME_ZONE,
  }).format(new Date(value));
}
