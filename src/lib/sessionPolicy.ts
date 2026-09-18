/** Internal SQL fragment shared by the session list and submission checks. */
export function sessionAcceptingSql(alias = "s"): string {
  return `${alias}.status = 'active'
    AND ${alias}.started_at <= clock_timestamp()
    AND (COALESCE(${alias}.auto_close, TRUE) = FALSE
      OR ${alias}.duration_minutes IS NULL
      OR ${alias}.started_at + ${alias}.duration_minutes * INTERVAL '1 minute' > clock_timestamp())`;
}
