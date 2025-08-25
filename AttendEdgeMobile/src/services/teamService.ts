import { apiClient } from './api/apiClient';
import { ENDPOINTS } from '../config';

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: 'MEMBER' | 'MANAGER' | 'ADMIN';
  joinDate: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    position?: string;
    department?: string;
  };
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  managerId: string;
  managerName: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamAttendance {
  date: string;
  present: number;
  absent: number;
  late: number;
  leave: number;
  members: Array<{
    userId: string;
    name: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'HOLIDAY';
    checkIn?: string;
    checkOut?: string;
    workingHours?: string;
  }>;
}

export interface TeamLeaveSummary {
  userId: string;
  name: string;
  avatar?: string;
  position?: string;
  department?: string;
  leaves: Array<{
    leaveType: string;
    total: number;
    used: number;
    remaining: number;
  }>;
  upcomingLeaves: Array<{
    id: string;
    startDate: string;
    endDate: string;
    leaveType: string;
    status: string;
  }>;
}

class TeamService {
  /**
   * Get all teams
   */
  async getTeams(): Promise<Team[]> {
    try {
      const response = await apiClient.get<Team[]>(ENDPOINTS.TEAM.MEMBERS);
      return response;
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get team by ID
   */
  async getTeamById(teamId: string): Promise<Team> {
    try {
      const response = await apiClient.get<Team>(`${ENDPOINTS.TEAM.MEMBERS}/${teamId}`);
      return response;
    } catch (error) {
      console.error('Failed to fetch team:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get team members
   */
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    try {
      const response = await apiClient.get<TeamMember[]>(
        `${ENDPOINTS.TEAM.MEMBERS}/${teamId}/members`
      );
      return response;
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get team attendance
   */
  async getTeamAttendance(params: {
    teamId: string;
    startDate: string;
    endDate?: string;
  }): Promise<TeamAttendance[]> {
    try {
      const { teamId, ...queryParams } = params;
      const response = await apiClient.get<TeamAttendance[]>(
        `${ENDPOINTS.TEAM.ATTENDANCE}/${teamId}`,
        { params: queryParams }
      );
      return response;
    } catch (error) {
      console.error('Failed to fetch team attendance:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get team leave summary
   */
  async getTeamLeaveSummary(teamId: string): Promise<TeamLeaveSummary[]> {
    try {
      const response = await apiClient.get<TeamLeaveSummary[]>(
        `${ENDPOINTS.TEAM.MEMBERS}/${teamId}/leave-summary`
      );
      return response;
    } catch (error) {
      console.error('Failed to fetch team leave summary:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get team calendar
   */
  async getTeamCalendar(params: {
    teamId: string;
    startDate: string;
    endDate: string;
  }): Promise<Array<{
    date: string;
    events: Array<{
      id: string;
      type: 'LEAVE' | 'HOLIDAY' | 'EVENT';
      title: string;
      description?: string;
      startDate: string;
      endDate: string;
      userId?: string;
      userName?: string;
      status?: string;
    }>;
  }>> {
    try {
      const { teamId, ...queryParams } = params;
      const response = await apiClient.get<Array<{
        date: string;
        events: Array<{
          id: string;
          type: 'LEAVE' | 'HOLIDAY' | 'EVENT';
          title: string;
          description?: string;
          startDate: string;
          endDate: string;
          userId?: string;
          userName?: string;
          status?: string;
        }>;
      }>>(
        `${ENDPOINTS.TEAM.MEMBERS}/${teamId}/calendar`,
        { params: queryParams }
      );
      return response;
    } catch (error) {
      console.error('Failed to fetch team calendar:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Add team member
   */
  async addTeamMember(
    teamId: string,
    userId: string,
    role: 'MEMBER' | 'MANAGER' = 'MEMBER'
  ): Promise<TeamMember> {
    try {
      const response = await apiClient.post<TeamMember>(
        `${ENDPOINTS.TEAM.MEMBERS}/${teamId}/members`,
        { userId, role }
      );
      return response;
    } catch (error) {
      console.error('Failed to add team member:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Remove team member
   */
  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    try {
      await apiClient.delete(
        `${ENDPOINTS.TEAM.MEMBERS}/${teamId}/members/${userId}`
      );
    } catch (error) {
      console.error('Failed to remove team member:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update team member role
   */
  async updateTeamMemberRole(
    teamId: string,
    userId: string,
    role: 'MEMBER' | 'MANAGER' | 'ADMIN'
  ): Promise<TeamMember> {
    try {
      const response = await apiClient.patch<TeamMember>(
        `${ENDPOINTS.TEAM.MEMBERS}/${teamId}/members/${userId}/role`,
        { role }
      );
      return response;
    } catch (error) {
      console.error('Failed to update team member role:', error);
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
          return new Error('Team or member not found');
        case 409:
          return new Error(data?.message || 'Conflict with current state');
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

export const teamService = new TeamService();
