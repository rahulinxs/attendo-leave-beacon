// Team Sync Real-time Listener
// Handles real-time synchronization for AttendEdge Team Management

import { supabase } from '@/integrations/supabase/client'

export interface TeamSyncEvent {
  table: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  record: any;
  old_record?: any;
}

export class TeamSyncService {
  private static instance: TeamSyncService;
  private subscriptions: any[] = [];
  private edgeFunctionUrl: string;

  private constructor() {
    this.edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/team-sync`;
  }

  static getInstance(): TeamSyncService {
    if (!TeamSyncService.instance) {
      TeamSyncService.instance = new TeamSyncService();
    }
    return TeamSyncService.instance;
  }

  // Initialize real-time subscriptions
  initialize() {
    this.setupRealtimeListeners();
    console.log('Team Sync Service initialized');
  }

  // Setup Supabase realtime listeners
  private setupRealtimeListeners() {
    // Listen to profiles changes (source of truth)
    const profilesSubscription = supabase
      .channel('profiles-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'profiles',
          filter: `company_id=eq.${this.getCurrentCompanyId()}`
        }, 
        (payload: TeamSyncEvent) => {
          this.handleRealtimeEvent(payload);
        }
      )
      .subscribe();

    // Listen to employees changes
    const employeesSubscription = supabase
      .channel('employees-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'employees',
          filter: `company_id=eq.${this.getCurrentCompanyId()}`
        }, 
        (payload: TeamSyncEvent) => {
          this.handleRealtimeEvent(payload);
        }
      )
      .subscribe();

    // Listen to teams changes
    const teamsSubscription = supabase
      .channel('teams-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'teams',
          filter: `company_id=eq.${this.getCurrentCompanyId()}`
        }, 
        (payload: TeamSyncEvent) => {
          this.handleRealtimeEvent(payload);
        }
      )
      .subscribe();

    this.subscriptions.push(profilesSubscription, employeesSubscription, teamsSubscription);
  }

  // Handle incoming realtime events
  private async handleRealtimeEvent(event: TeamSyncEvent) {
    console.log('Real-time sync event:', event);

    // Only process events that need additional sync
    if (this.needsAdditionalSync(event)) {
      await this.callEdgeFunction(event);
    }

    // Emit event for UI updates
    this.emitSyncEvent(event);
  }

  // Determine if event needs edge function sync
  private needsAdditionalSync(event: TeamSyncEvent): boolean {
    switch (event.table) {
      case 'employees':
        // Need sync for team_id or reporting_manager_id changes
        return event.type === 'UPDATE' && 
          (event.record.team_id !== event.old_record?.team_id ||
           event.record.reporting_manager_id !== event.old_record?.reporting_manager_id);
      
      case 'teams':
        // Need sync for manager_id changes
        return event.type === 'UPDATE' && 
          event.record.manager_id !== event.old_record?.manager_id;
      
      case 'profiles':
        // Profile changes are already handled by trigger
        return false;
      
      default:
        return false;
    }
  }

  // Call Edge Function for additional sync
  private async callEdgeFunction(event: TeamSyncEvent) {
    try {
      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Edge function sync failed:', error);
      } else {
        const result = await response.json();
        console.log('Edge function sync result:', result);
      }
    } catch (error) {
      console.error('Failed to call edge function:', error);
    }
  }

  // Get current auth token
  private async getAuthToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  }

  // Get current company ID (implement based on your auth context)
  private getCurrentCompanyId(): string {
    // This should come from your company context
    // For now, return empty string to listen to all companies
    return '';
  }

  // Emit custom events for UI components
  private emitSyncEvent(event: TeamSyncEvent) {
    // Create custom event for UI updates
    const customEvent = new CustomEvent('teamSync', {
      detail: event
    });
    window.dispatchEvent(customEvent);
  }

  // Cleanup subscriptions
  destroy() {
    this.subscriptions.forEach(subscription => {
      supabase.removeChannel(subscription);
    });
    this.subscriptions = [];
    console.log('Team Sync Service destroyed');
  }

  // Manual sync check
  async checkSyncHealth() {
    try {
      const { data, error } = await supabase
        .from('team_sync_health')
        .select('*')
        .limit(10);

      if (error) {
        console.error('Failed to check sync health:', error);
        return { success: false, error };
      }

      const issues = data?.filter(item => item.status !== 'SYNCED') || [];
      
      return {
        success: issues.length === 0,
        issues,
        totalChecked: data?.length || 0
      };
    } catch (error) {
      console.error('Sync health check failed:', error);
      return { success: false, error };
    }
  }
}

// Export singleton instance
export const teamSyncService = TeamSyncService.getInstance();

// React hook for using the service
export const useTeamSync = () => {
  const [syncStatus, setSyncStatus] = React.useState<{
    connected: boolean;
    lastSync?: Date;
    issues?: any[];
  }>({ connected: false });

  React.useEffect(() => {
    // Initialize service
    teamSyncService.initialize();

    // Listen for sync events
    const handleSyncEvent = (event: CustomEvent) => {
      console.log('UI received sync event:', event.detail);
      setSyncStatus(prev => ({
        ...prev,
        lastSync: new Date()
      }));
    };

    window.addEventListener('teamSync', handleSyncEvent as EventListener);

    // Set initial connection status
    setSyncStatus({ connected: true });

    // Cleanup
    return () => {
      window.removeEventListener('teamSync', handleSyncEvent as EventListener);
      teamSyncService.destroy();
    };
  }, []);

  const checkHealth = async () => {
    const health = await teamSyncService.checkSyncHealth();
    setSyncStatus(prev => ({
      ...prev,
      issues: health.issues
    }));
    return health;
  };

  return {
    syncStatus,
    checkHealth
  };
};
