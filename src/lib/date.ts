/** Today's date as a YYYY-MM-DD string, matching the Postgres `date` columns. */
export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}
