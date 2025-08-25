import { apiClient } from './api/apiClient';
import { ENDPOINTS } from '../config';
import { getCurrentLocation } from '../utils/location';

export interface AttendanceRecord {
  id: string;
  userId: string;
  checkIn: {
    timestamp: string;
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
  };
  checkOut?: {
    timestamp: string;
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
  };
  status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT';
  notes?: string;
  totalHours?: number;
}

export interface CheckInOutParams {
  notes?: string;
  locationRequired?: boolean;
}

class AttendanceService {
  /**
   * Check in for attendance
   */
  async checkIn(params: CheckInOutParams = {}): Promise<AttendanceRecord> {
    try {
      const { notes, locationRequired = true } = params;
      let locationData;

      if (locationRequired) {
        locationData = await getCurrentLocation();
      }

      const response = await apiClient.post<AttendanceRecord>(
        ENDPOINTS.ATTENDANCE.CHECK_IN,
        {
          notes,
          location: locationData,
        }
      );

      return response;
    } catch (error) {
      console.error('Check-in failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Check out from attendance
   */
  async checkOut(params: CheckInOutParams = {}): Promise<AttendanceRecord> {
    try {
      const { notes, locationRequired = true } = params;
      let locationData;

      if (locationRequired) {
        locationData = await getCurrentLocation();
      }

      const response = await apiClient.post<AttendanceRecord>(
        ENDPOINTS.ATTENDANCE.CHECK_OUT,
        {
          notes,
          location: locationData,
        }
      );

      return response;
    } catch (error) {
      console.error('Check-out failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get attendance history
   */
  async getHistory(params: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ records: AttendanceRecord[]; total: number }> {
    try {
      const response = await apiClient.get<{ records: AttendanceRecord[]; total: number }>(
        ENDPOINTS.ATTENDANCE.HISTORY,
        { params }
      );
      return response;
    } catch (error) {
      console.error('Failed to fetch attendance history:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get attendance summary
   */
  async getSummary(params: {
    month?: number;
    year?: number;
  } = {}): Promise<{
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    totalWorkingDays: number;
    attendancePercentage: number;
  }> {
    try {
      const response = await apiClient.get(ENDPOINTS.ATTENDANCE.SUMMARY, { params });
      return response;
    } catch (error) {
      console.error('Failed to fetch attendance summary:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get today's attendance status
   */
  async getTodaysStatus(): Promise<{
    hasCheckedIn: boolean;
    hasCheckedOut: boolean;
    currentStatus?: AttendanceRecord;
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { records } = await this.getHistory({
        startDate: today,
        endDate: today,
        limit: 1,
      });

      if (records.length === 0) {
        return { hasCheckedIn: false, hasCheckedOut: false };
      }

      const todayRecord = records[0];
      return {
        hasCheckedIn: !!todayRecord.checkIn,
        hasCheckedOut: !!todayRecord.checkOut,
        currentStatus: todayRecord,
      };
    } catch (error) {
      console.error('Failed to fetch today\'s status:', error);
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (error.response) {
      // Handle HTTP errors
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return new Error(data?.message || 'Invalid request');
        case 401:
          return new Error('Session expired. Please login again.');
        case 403:
          return new Error('You do not have permission to perform this action');
        case 404:
          return new Error('Resource not found');
        case 409:
          return new Error(data?.message || 'Conflict with current state');
        case 500:
          return new Error('Server error. Please try again later.');
        default:
          return new Error(data?.message || 'An error occurred');
      }
    } else if (error.request) {
      // Network error
      return new Error('Network error. Please check your connection.');
    } else {
      // Other errors
      return error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }
}

export const attendanceService = new AttendanceService();
