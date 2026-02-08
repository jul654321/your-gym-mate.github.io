export function inferSessionName(
  name?: string | null,
  planName?: string | null,
  timestamp = Date.now()
) {
  const trimmed = name?.trim();

  if (trimmed) {
    return trimmed;
  }

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(timestamp));

  return planName ?? `Session - ${formattedDate}`;
}
