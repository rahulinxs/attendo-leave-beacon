import { apiClient } from './api/apiClient';
import { ENDPOINTS } from '../config';

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  description?: string;
  maxDays: number;
  requiresApproval: boolean;
  isPaid: boolean;
  carryForward: boolean;
  maxCarryForwardDays?: number;
  documentRequired: boolean;
  genderSpecific?: 'male' | 'female' | null;
}

export interface LeaveBalance {
  leaveTypeId: string;
  leaveType: string;
  total: number;
  used: number;
  remaining: number;
  pending: number;
  carriedOver?: number;
  expiresAt?: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  leaveTypeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reason: string;
  documentUrl?: string;
  approverId?: string;
  approverName?: string;
  approverNotes?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveRequestParams {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  documentUrl?: string;
  isHalfDay?: boolean;
  halfDayType?: 'FIRST_HALF' | 'SECOND_HALF';
}

export interface UpdateLeaveRequestParams {
  status?: 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approverNotes?: string;
}

class LeaveService {
  /**
   * Get all leave types
   */
  async getLeaveTypes(): Promise<LeaveType[]> {
    try {
      const response = await apiClient.get<LeaveType[]>(ENDPOINTS.LEAVE.TYPES);
      return response;
    } catch (error) {
      console.error('Failed to fetch leave types:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get leave balance for the current user
   */
  async getLeaveBalance(): Promise<LeaveBalance[]> {
    try {
      const response = await apiClient.get<LeaveBalance[]>(
        ENDPOINTS.LEAVE.BALANCE
      );
      return response;
    } catch (error) {
      console.error('Failed to fetch leave balance:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Create a new leave request
   */
  async createLeaveRequest(
    params: CreateLeaveRequestParams
  ): Promise<LeaveRequest> {
    try {
      const response = await apiClient.post<LeaveRequest>(
        ENDPOINTS.LEAVE.REQUESTS,
        params
      );
      return response;
    } catch (error) {
      console.error('Failed to create leave request:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get leave requests with optional filters
   */
  async getLeaveRequests(params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    leaveTypeId?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ requests: LeaveRequest[]; total: number }> {
    try {
      const response = await apiClient.get<{
        requests: LeaveRequest[];
        total: number;
      }>(ENDPOINTS.LEAVE.REQUESTS, { params });
      return response;
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get a single leave request by ID
   */
  async getLeaveRequestById(id: string): Promise<LeaveRequest> {
    try {
      const response = await apiClient.get<LeaveRequest>(
        `${ENDPOINTS.LEAVE.REQUESTS}/${id}`
      );
      return response;
    } catch (error) {
      console.error('Failed to fetch leave request:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update a leave request
   */
  async updateLeaveRequest(
    id: string,
    params: UpdateLeaveRequestParams
  ): Promise<LeaveRequest> {
    try {
      const response = await apiClient.patch<LeaveRequest>(
        `${ENDPOINTS.LEAVE.REQUESTS}/${id}`,
        params
      );
      return response;
    } catch (error) {
      console.error('Failed to update leave request:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Cancel a leave request
   */
  async cancelLeaveRequest(id: string): Promise<LeaveRequest> {
    try {
      const response = await apiClient.patch<LeaveRequest>(
        `${ENDPOINTS.LEAVE.REQUESTS}/${id}/cancel`
      );
      return response;
    } catch (error) {
      console.error('Failed to cancel leave request:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get leave calendar events
   */
  async getLeaveCalendar(params: {
    startDate: string;
    endDate: string;
    teamId?: string;
  }): Promise<LeaveRequest[]> {
    try {
      const response = await apiClient.get<LeaveRequest[]>(
        `${ENDPOINTS.LEAVE.REQUESTS}/calendar`,
        { params }
      );
      return response;
    } catch (error) {
      console.error('Failed to fetch leave calendar:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Check leave availability
   */
  async checkLeaveAvailability(params: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    userId?: string;
  }): Promise<{
    isAvailable: boolean;
    availableDays: number;
    requestedDays: number;
    message?: string;
  }> {
    try {
      const response = await apiClient.get<{
        isAvailable: boolean;
        availableDays: number;
        requestedDays: number;
        message?: string;
      }>(`${ENDPOINTS.LEAVE.REQUESTS}/check-availability`, { params });
      return response;
    } catch (error) {
      console.error('Failed to check leave availability:', error);
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return new Error(data?.message || 'Invalid request');
        case 401:
          return new Error('Session expired. Please login again.');
        case 403:
          return new Error('You do not have permission to perform this action');
        case 404:
          return new Error('Leave request not found');
        case 409:
          return new Error(data?.message || 'Conflict with current state');
        case 422:
          return new Error(data?.message || 'Validation failed');
        case 500:
          return new Error('Server error. Please try again later.');
        default:
          return new Error(data?.message || 'An error occurred');
      }
    } else if (error.request) {
      return new Error('Network error. Please check your connection.');
    } else {
      return error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }
}

export const leaveService = new LeaveService();
