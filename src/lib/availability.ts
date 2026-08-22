const WEEKDAY_SLOTS = ["07:00", "08:00", "12:00", "16:00", "17:00", "18:00", "19:00"];
const SATURDAY_SLOTS = ["08:00", "09:00", "10:00"];

export function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function isSunday(date: Date) {
  return date.getDay() === 0;
}

export function isPastOrToday(date: Date) {
  return date.getTime() <= startOfToday().getTime();
}

export function isBookableDate(date: Date) {
  return !isSunday(date) && !isPastOrToday(date);
}

export function getSlotsForDate(date: Date) {
  if (!isBookableDate(date)) return [];
  return date.getDay() === 6 ? SATURDAY_SLOTS : WEEKDAY_SLOTS;
}

export function getCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [];

  for (let i = 0; i < startWeekday; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export const weekdayLabels = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

export function monthTitle(year: number, month: number) {
  return new Intl.DateTimeFormat("da-DK", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));
}
