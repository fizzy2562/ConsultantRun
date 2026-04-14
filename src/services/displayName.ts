const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function sanitizeDisplayName(value: string | null | undefined, fallback = 'Consultant'): string {
  const trimmed = value?.trim().replace(/\s+/g, ' ') ?? '';

  if (!trimmed) {
    return fallback;
  }

  if (emailPattern.test(trimmed)) {
    return fallback;
  }

  return trimmed.slice(0, 40);
}
