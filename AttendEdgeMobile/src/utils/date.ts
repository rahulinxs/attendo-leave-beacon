import { format, formatDistanceToNow, parseISO, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns';
import { enUS } from 'date-fns/locale';

// Date formats
const DATE_FORMATS = {
  DATE: 'yyyy-MM-dd',
  TIME: 'HH:mm',
  DATE_TIME: 'yyyy-MM-dd HH:mm',
  DISPLAY_DATE: 'MMM d, yyyy',
  DISPLAY_TIME: 'h:mm a',
  DISPLAY_DATE_TIME: 'MMM d, yyyy h:mm a',
  DAY_MONTH: 'MMM d',
  DAY_MONTH_YEAR: 'MMM d, yyyy',
  TIME_24: 'HH:mm',
  TIME_12: 'h:mm a',
  WEEKDAY: 'EEEE',
  SHORT_WEEKDAY: 'EEE',
  MONTH_YEAR: 'MMMM yyyy',
} as const;

type DateFormat = keyof typeof DATE_FORMATS;

export const formatDate = (
  date: Date | string | number,
  formatString: DateFormat = 'DISPLAY_DATE_TIME'
): string => {
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  return format(dateObj, DATE_FORMATS[formatString], { locale: enUS });
};

export const formatTimeAgo = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true, locale: enUS });
};

export const getRelativeDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (isToday(dateObj)) {
    return 'Today';
  }
  
  if (isYesterday(dateObj)) {
    return 'Yesterday';
  }
  
  if (isThisWeek(dateObj, { weekStartsOn: 1 })) {
    return formatDate(dateObj, 'WEEKDAY');
  }
  
  if (isThisYear(dateObj)) {
    return formatDate(dateObj, 'DAY_MONTH');
  }
  
  return formatDate(dateObj, 'DAY_MONTH_YEAR');
};

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

export const parseTimeString = (timeString: string): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export const formatTimeRange = (
  start: Date | string,
  end: Date | string,
  options: { showDate?: boolean; showTime?: boolean } = { showDate: true, showTime: true }
): string => {
  const startDate = typeof start === 'string' ? parseISO(start) : start;
  const endDate = typeof end === 'string' ? parseISO(end) : end;
  
  const isSameDay = formatDate(startDate, 'DATE') === formatDate(endDate, 'DATE');
  
  let formatString = '';
  
  if (options.showDate && options.showTime) {
    if (isSameDay) {
      return `${formatDate(startDate, 'DISPLAY_DATE')} • ${formatDate(startDate, 'DISPLAY_TIME')} - ${formatDate(endDate, 'DISPLAY_TIME')}`;
    }
    return `${formatDate(startDate, 'DISPLAY_DATE_TIME')} - ${formatDate(endDate, 'DISPLAY_DATE_TIME')}`;
  }
  
  if (options.showDate) {
    if (isSameDay) {
      return formatDate(startDate, 'DISPLAY_DATE');
    }
    return `${formatDate(startDate, 'DISPLAY_DATE')} - ${formatDate(endDate, 'DISPLAY_DATE')}`;
  }
  
  if (options.showTime) {
    return `${formatDate(startDate, 'DISPLAY_TIME')} - ${formatDate(endDate, 'DISPLAY_TIME')}`;
  }
  
  return '';
};

export const getWeekRange = (date: Date = new Date()): [Date, Date] => {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return [monday, sunday];
};

export const getMonthRange = (date: Date = new Date()): [Date, Date] => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  
  firstDay.setHours(0, 0, 0, 0);
  lastDay.setHours(23, 59, 59, 999);
  
  return [firstDay, lastDay];
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export const getDaysBetween = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate = addDays(currentDate, 1);
  }
  
  return dates;
};

export const getWorkingDaysBetween = (startDate: Date, endDate: Date): number => {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) { // Skip Sunday (0) and Saturday (6)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};

export const isHoliday = (date: Date, holidays: Date[]): boolean => {
  return holidays.some(holiday => isSameDay(holiday, date));
};

export const getBusinessDaysInMonth = (year: number, month: number, holidays: Date[] = []): number => {
  let count = 0;
  const date = new Date(year, month, 1);
  
  while (date.getMonth() === month) {
    const day = date.getDay();
    if (day !== 0 && day !== 6 && !isHoliday(date, holidays)) {
      count++;
    }
    date.setDate(date.getDate() + 1);
  }
  
  return count;
};

export default {
  formatDate,
  formatTimeAgo,
  getRelativeDate,
  formatDuration,
  parseTimeString,
  formatTimeRange,
  getWeekRange,
  getMonthRange,
  addDays,
  addMonths,
  isSameDay,
  getDaysBetween,
  getWorkingDaysBetween,
  isWeekend,
  isHoliday,
  getBusinessDaysInMonth,
  FORMATS: DATE_FORMATS,
};
