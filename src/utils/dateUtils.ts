/**
 * Date utility functions to handle timezone-safe date parsing
 * This prevents the common issue where dates shift by ±1 day due to UTC vs local timezone conversion
 */

/**
 * Parse a date string (YYYY-MM-DD) without timezone issues
 * Creates a Date object in the local timezone instead of treating it as UTC
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object in local timezone
 */
export const parseDateLocal = (dateString: string): Date => {
  if (!dateString) return new Date();
  
  // Split the date string and create a Date object in local timezone
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Validate the components
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return new Date();
  }
  
  // month is 0-indexed in Date constructor, so subtract 1
  return new Date(year, month - 1, day);
};

/**
 * Format a date string (YYYY-MM-DD) for display without timezone issues
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @param formatStr - Format string for date-fns format function
 * @returns Formatted date string
 */
export const formatDateLocal = (dateString: string, formatStr: string = 'MMM dd'): string => {
  const date = parseDateLocal(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Check if a date is within an interval, accounting for timezone issues
 * 
 * @param date - Date to check
 * @param start - Start date string (YYYY-MM-DD)
 * @param end - End date string (YYYY-MM-DD)
 * @returns True if date is within the interval
 */
export const isDateInIntervalLocal = (date: Date, start: string, end: string): boolean => {
  const startDate = parseDateLocal(start);
  const endDate = parseDateLocal(end);
  
  // Set end date to end of day for inclusive comparison
  endDate.setHours(23, 59, 59, 999);
  
  return date >= startDate && date <= endDate;
};

/**
 * Get today's date in YYYY-MM-DD format without timezone issues
 * 
 * @returns Today's date in YYYY-MM-DD format
 */
export const getTodayLocal = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Compare two date strings without timezone issues
 * 
 * @param date1 - First date string (YYYY-MM-DD)
 * @param date2 - Second date string (YYYY-MM-DD)
 * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export const compareDatesLocal = (date1: string, date2: string): number => {
  const d1 = parseDateLocal(date1);
  const d2 = parseDateLocal(date2);
  
  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
};
