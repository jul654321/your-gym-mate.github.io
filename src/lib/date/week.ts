export function startOfWeek(
  value: Date | number = Date.now(),
  weekStartsOn = 1
) {
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  const day = (date.getDay() + 7 - weekStartsOn) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfWeek(value: Date | number = Date.now(), weekStartsOn = 1) {
  const date = startOfWeek(value, weekStartsOn);
  date.setDate(date.getDate() + 6);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function toISODateString(value: Date | number) {
  return new Date(value).toISOString();
}

export function fromISODateString(value: string) {
  return new Date(value).getTime();
}

export function startOfDay(value: Date | number = Date.now()) {
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(value: Date | number = Date.now()) {
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}
