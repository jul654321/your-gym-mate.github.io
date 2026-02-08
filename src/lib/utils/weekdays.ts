export type WeekdayInfo = {
  value: number;
  shortLabel: string;
  longLabel: string;
};

export const WEEKDAY_INFO: WeekdayInfo[] = [
  { value: 0, shortLabel: "Sun", longLabel: "Sunday" },
  { value: 1, shortLabel: "Mon", longLabel: "Monday" },
  { value: 2, shortLabel: "Tue", longLabel: "Tuesday" },
  { value: 3, shortLabel: "Wed", longLabel: "Wednesday" },
  { value: 4, shortLabel: "Thu", longLabel: "Thursday" },
  { value: 5, shortLabel: "Fri", longLabel: "Friday" },
  { value: 6, shortLabel: "Sat", longLabel: "Saturday" },
];

export const WEEKDAY_SELECT_OPTIONS = [
  { value: "", label: "None" },
  ...WEEKDAY_INFO.map((weekday) => ({
    value: weekday.value.toString(),
    label: weekday.shortLabel,
  })),
];

export function getWeekdayShortName(day?: number | null): string | undefined {
  return WEEKDAY_INFO.find((info) => info.value === day)?.shortLabel;
}

export function getWeekdayLongName(day?: number | null): string | undefined {
  return WEEKDAY_INFO.find((info) => info.value === day)?.longLabel;
}
