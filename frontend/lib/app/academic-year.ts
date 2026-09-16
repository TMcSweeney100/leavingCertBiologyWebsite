/** "2026/27" for any date from August 2026 to July 2027. */
export function currentAcademicYear(today = new Date()): string {
  const start = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
  return `${start}/${String((start + 1) % 100).padStart(2, '0')}`;
}
