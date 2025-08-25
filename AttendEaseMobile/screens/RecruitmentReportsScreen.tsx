import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, FlatList, TouchableOpacity, RefreshControl, SafeAreaView, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../lib/supabase';
import { useUserProfile } from '../lib/useUserProfile';
import { Ionicons } from '@expo/vector-icons';

type PeriodType = 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';

type PerformanceRow = {
  id?: string;
  team_id?: string;
  user_id?: string;
  report_date: string;
  company_id: string;
  monster?: number;
  dice?: number;
  linkedin_profiles_viewed?: number;
  linkedin_inmails_sent?: number;
  total_calls?: number;
  total_call_duration?: string;
  total_submissions?: number;
  total_interviews?: number;
  offers?: number;
  starts?: number;
};

export default function RecruitmentReportsScreen() {
  const { profileData } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PerformanceRow[]>([]);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const itemsPerPage = 10;

  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const today = new Date();
  const prevMonth = today.getMonth() === 0 ? 12 : today.getMonth();
  const prevMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
  const [month, setMonth] = useState<number>(prevMonth);
  const [year, setYear] = useState<number>(prevMonthYear);
  const [quarter, setQuarter] = useState<number>(1);
  const [half, setHalf] = useState<number>(1);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<'team' | 'individual'>('team');

  // UI states
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; team_id?: string }[]>([]);

  const monthOptions = useMemo(() => (
    [
      { label: 'January', value: 1 },
      { label: 'February', value: 2 },
      { label: 'March', value: 3 },
      { label: 'April', value: 4 },
      { label: 'May', value: 5 },
      { label: 'June', value: 6 },
      { label: 'July', value: 7 },
      { label: 'August', value: 8 },
      { label: 'September', value: 9 },
      { label: 'October', value: 10 },
      { label: 'November', value: 11 },
      { label: 'December', value: 12 },
    ]
  ), []);

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  useEffect(() => {
    const loadLookups = async () => {
      if (!profileData?.profile?.company_id) return;
      try {
        const companyId = profileData.profile.company_id;
        const [{ data: teamData }, { data: userData }] = await Promise.all([
          supabase.from('teams').select('id, name').eq('company_id', companyId),
          supabase.from('employees').select('id, name, team_id').eq('company_id', companyId),
        ]);
        setTeams(teamData || []);
        setUsers(userData || []);
      } catch (e: any) {
        // non-fatal
      }
    };
    loadLookups();
  }, [profileData?.profile?.company_id]);

  const refresh = async (page: number = 1, isRefresh: boolean = false) => {
    if (!profileData?.profile?.company_id) return;
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      let startDate = '';
      let endDate = '';
      if (periodType === 'monthly') {
        startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        endDate = `${year}-${String(month).padStart(2, '0')}-28`;
      } else if (periodType === 'quarterly') {
        if (quarter === 1) { startDate = `${year}-01-01`; endDate = `${year}-03-31`; }
        if (quarter === 2) { startDate = `${year}-04-01`; endDate = `${year}-06-30`; }
        if (quarter === 3) { startDate = `${year}-07-01`; endDate = `${year}-09-30`; }
        if (quarter === 4) { startDate = `${year}-10-01`; endDate = `${year}-12-31`; }
      } else if (periodType === 'half-yearly') {
        if (half === 1) { startDate = `${year}-01-01`; endDate = `${year}-06-30`; }
        if (half === 2) { startDate = `${year}-07-01`; endDate = `${year}-12-31`; }
      } else if (periodType === 'yearly') {
        startDate = `${year}-01-01`; endDate = `${year}-12-31`;
      }

      // First get total count
      let countQuery = supabase
        .from('performance_reports')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profileData.profile.company_id)
        .gte('report_date', startDate)
        .lte('report_date', endDate);

      if (filterMode === 'team' && selectedTeam !== 'all') {
        countQuery = countQuery.eq('team_id', selectedTeam);
      }
      if (filterMode === 'individual' && selectedUser !== 'all') {
        countQuery = countQuery.eq('user_id', selectedUser);
      }

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      const totalCount = count || 0;
      const totalPagesCalc = Math.ceil(totalCount / itemsPerPage);
      
      setTotalRecords(totalCount);
      setTotalPages(totalPagesCalc);

      // Then get paginated data
      let query = supabase
        .from('performance_reports')
        .select('*')
        .eq('company_id', profileData.profile.company_id)
        .gte('report_date', startDate)
        .lte('report_date', endDate)
        .order('report_date', { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (filterMode === 'team' && selectedTeam !== 'all') {
        query = query.eq('team_id', selectedTeam);
      }
      if (filterMode === 'individual' && selectedUser !== 'all') {
        query = query.eq('user_id', selectedUser);
      }

      const { data: rows, error: qErr } = await query;
      if (qErr) throw qErr;
      setData(rows || []);
      setCurrentPage(page);
    } catch (e: any) {
      setError(e.message || 'Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    refresh(1, true);
  }, [profileData?.profile?.company_id, periodType, month, year, quarter, half, selectedTeam, selectedUser, filterMode]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
    refresh(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData?.profile?.company_id, periodType, month, year, quarter, half, selectedTeam, selectedUser, filterMode]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      refresh(page);
    }
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'Monster': return 'search-outline';
      case 'Dice': return 'dice-outline';
      case 'LinkedIn Views': return 'eye-outline';
      case 'InMails': return 'mail-outline';
      case 'Calls': return 'call-outline';
      case 'Submissions': return 'document-text-outline';
      case 'Interviews': return 'people-outline';
      case 'Offers': return 'gift-outline';
      case 'Starts': return 'checkmark-circle-outline';
      default: return 'analytics-outline';
    }
  };

  const getMetricColor = (metric: string) => {
    switch (metric) {
      case 'Monster': return '#8b5cf6';
      case 'Dice': return '#06b6d4';
      case 'LinkedIn Views': return '#0ea5e9';
      case 'InMails': return '#3b82f6';
      case 'Calls': return '#10b981';
      case 'Submissions': return '#f59e0b';
      case 'Interviews': return '#ef4444';
      case 'Offers': return '#ec4899';
      case 'Starts': return '#22c55e';
      default: return '#6366f1';
    }
  };

  const formatPeriodText = () => {
    if (periodType === 'monthly') {
      return `${monthOptions.find(m => m.value === month)?.label} ${year}`;
    } else if (periodType === 'quarterly') {
      return `Q${quarter} ${year}`;
    } else if (periodType === 'half-yearly') {
      return `H${half} ${year}`;
    } else {
      return `${year}`;
    }
  };

  const totals = useMemo(() => {
    const sum = (key: keyof PerformanceRow) => data.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);
    return {
      monster: sum('monster'),
      dice: sum('dice'),
      linkedin_profiles_viewed: sum('linkedin_profiles_viewed'),
      linkedin_inmails_sent: sum('linkedin_inmails_sent'),
      total_calls: sum('total_calls'),
      total_submissions: sum('total_submissions'),
      total_interviews: sum('total_interviews'),
      offers: sum('offers'),
      starts: sum('starts'),
    };
  }, [data]);

  const teamName = (id?: string) => teams.find(t => t.id === id)?.name || 'Unknown';
  const userName = (id?: string) => users.find(u => u.id === id)?.name || 'Unknown';

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="analytics-outline" size={48} color="#2563eb" />
          <Text style={styles.title}>Loading Reports...</Text>
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="bar-chart" size={32} color="#2563eb" />
            <Text style={styles.title}>Recruitment Analytics</Text>
          </View>
          <Text style={styles.subtitle}>{formatPeriodText()}</Text>
          
          {/* Header Actions */}
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.actionButton, showFilters && styles.actionButtonActive]}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Ionicons name="filter-outline" size={20} color={showFilters ? '#fff' : '#2563eb'} />
              <Text style={[styles.actionButtonText, showFilters && styles.actionButtonTextActive]}>
                Filters
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, viewMode === 'list' && styles.actionButtonActive]}
              onPress={() => setViewMode(viewMode === 'cards' ? 'list' : 'cards')}
            >
              <Ionicons 
                name={viewMode === 'cards' ? 'list-outline' : 'grid-outline'} 
                size={20} 
                color={viewMode === 'list' ? '#fff' : '#2563eb'} 
              />
              <Text style={[styles.actionButtonText, viewMode === 'list' && styles.actionButtonTextActive]}>
                {viewMode === 'cards' ? 'List' : 'Cards'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filters Modal */}
        <Modal
          visible={showFilters}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowFilters(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Reports</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {/* Period Type */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Time Period</Text>
                <View style={styles.periodButtons}>
                  {[
                    { label: 'Monthly', value: 'monthly' },
                    { label: 'Quarterly', value: 'quarterly' },
                    { label: 'Half Yearly', value: 'half-yearly' },
                    { label: 'Yearly', value: 'yearly' }
                  ].map((period) => (
                    <TouchableOpacity
                      key={period.value}
                      style={[
                        styles.periodButton,
                        periodType === period.value && styles.periodButtonActive
                      ]}
                      onPress={() => setPeriodType(period.value as PeriodType)}
                    >
                      <Text style={[
                        styles.periodButtonText,
                        periodType === period.value && styles.periodButtonTextActive
                      ]}>
                        {period.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Time Selectors */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Select Time</Text>
                <View style={styles.timeSelectors}>
                  {periodType === 'monthly' && (
                    <View style={styles.pickerContainer}>
                      <Text style={styles.pickerLabel}>Month</Text>
                      <Picker selectedValue={month} onValueChange={v => setMonth(v)}>
                        {monthOptions.map(m => (
                          <Picker.Item key={m.value} label={m.label} value={m.value} />
                        ))}
                      </Picker>
                    </View>
                  )}

                  {periodType === 'quarterly' && (
                    <View style={styles.pickerContainer}>
                      <Text style={styles.pickerLabel}>Quarter</Text>
                      <Picker selectedValue={quarter} onValueChange={v => setQuarter(v)}>
                        <Picker.Item label="Q1" value={1} />
                        <Picker.Item label="Q2" value={2} />
                        <Picker.Item label="Q3" value={3} />
                        <Picker.Item label="Q4" value={4} />
                      </Picker>
                    </View>
                  )}

                  {periodType === 'half-yearly' && (
                    <View style={styles.pickerContainer}>
                      <Text style={styles.pickerLabel}>Half</Text>
                      <Picker selectedValue={half} onValueChange={v => setHalf(v)}>
                        <Picker.Item label="H1" value={1} />
                        <Picker.Item label="H2" value={2} />
                      </Picker>
                    </View>
                  )}

                  <View style={styles.pickerContainer}>
                    <Text style={styles.pickerLabel}>Year</Text>
                    <Picker selectedValue={year} onValueChange={v => setYear(v)}>
                      {yearOptions.map(y => (
                        <Picker.Item key={y} label={String(y)} value={y} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>

              {/* Filter Mode */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Filter By</Text>
                <View style={styles.filterModeButtons}>
                  <TouchableOpacity
                    style={[
                      styles.filterModeButton,
                      filterMode === 'team' && styles.filterModeButtonActive
                    ]}
                    onPress={() => setFilterMode('team')}
                  >
                    <Ionicons 
                      name="people-outline" 
                      size={20} 
                      color={filterMode === 'team' ? '#fff' : '#64748b'} 
                    />
                    <Text style={[
                      styles.filterModeButtonText,
                      filterMode === 'team' && styles.filterModeButtonTextActive
                    ]}>
                      Team
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.filterModeButton,
                      filterMode === 'individual' && styles.filterModeButtonActive
                    ]}
                    onPress={() => setFilterMode('individual')}
                  >
                    <Ionicons 
                      name="person-outline" 
                      size={20} 
                      color={filterMode === 'individual' ? '#fff' : '#64748b'} 
                    />
                    <Text style={[
                      styles.filterModeButtonText,
                      filterMode === 'individual' && styles.filterModeButtonTextActive
                    ]}>
                      Individual
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Team/User Selection */}
              {filterMode === 'team' && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Select Team</Text>
                  <View style={styles.pickerContainer}>
                    <Picker selectedValue={selectedTeam} onValueChange={v => setSelectedTeam(v)}>
                      <Picker.Item label="All Teams" value="all" />
                      {teams.map(t => (
                        <Picker.Item key={t.id} label={t.name} value={t.id} />
                      ))}
                    </Picker>
                  </View>
                </View>
              )}

              {filterMode === 'individual' && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Select User</Text>
                  <View style={styles.pickerContainer}>
                    <Picker selectedValue={selectedUser} onValueChange={v => setSelectedUser(v)}>
                      <Picker.Item label="All Users" value="all" />
                      {users.map(u => (
                        <Picker.Item key={u.id} label={u.name} value={u.id} />
                      ))}
                    </Picker>
                  </View>
                </View>
              )}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.applyButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Metrics Overview */}
        <View style={styles.metricsContainer}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <View style={styles.metricsGrid}>
            {[
              { label: 'Monster', value: totals.monster },
              { label: 'Dice', value: totals.dice },
              { label: 'LinkedIn Views', value: totals.linkedin_profiles_viewed },
              { label: 'InMails', value: totals.linkedin_inmails_sent },
              { label: 'Calls', value: totals.total_calls },
              { label: 'Submissions', value: totals.total_submissions },
              { label: 'Interviews', value: totals.total_interviews },
              { label: 'Offers', value: totals.offers },
              { label: 'Starts', value: totals.starts },
            ].map(metric => (
              <TouchableOpacity
                key={metric.label}
                style={[
                  styles.metricCard,
                  selectedMetric === metric.label && styles.metricCardSelected
                ]}
                onPress={() => setSelectedMetric(selectedMetric === metric.label ? null : metric.label)}
              >
                <View style={styles.metricHeader}>
                  <Ionicons 
                    name={getMetricIcon(metric.label)} 
                    size={24} 
                    color={getMetricColor(metric.label)} 
                  />
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                </View>
                <Text style={[styles.metricValue, { color: getMetricColor(metric.label) }]}>
                  {metric.value.toLocaleString()}
                </Text>
                {selectedMetric === metric.label && (
                  <View style={styles.metricInsight}>
                    <Text style={styles.insightText}>
                      {metric.value > 0 ? '📈 Active performance' : '📊 No activity recorded'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Performance Data */}
        <View style={styles.dataContainer}>
          <View style={styles.dataHeader}>
            <Text style={styles.sectionTitle}>Performance Records</Text>
            <Text style={styles.recordsCount}>
              {totalRecords} records • Page {currentPage} of {totalPages}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
              <Text style={styles.errorTitle}>Error Loading Data</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => refresh(currentPage)}>
                <Ionicons name="refresh-outline" size={20} color="#fff" />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <FlatList
                data={data}
                keyExtractor={(item, idx) => item.id || `${idx}`}
                renderItem={({ item }) => (
                  <View style={styles.performanceCard}>
                    <View style={styles.performanceHeader}>
                      <View style={styles.performanceInfo}>
                        <Text style={styles.performanceTitle}>
                          {teamName(item.team_id)} • {userName(item.user_id)}
                        </Text>
                        <Text style={styles.performanceDate}>
                          {new Date(item.report_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.performanceMetrics}>
                      <View style={styles.metricRow}>
                        <View style={styles.metricItem}>
                          <Ionicons name="call-outline" size={16} color="#10b981" />
                          <Text style={styles.metricItemLabel}>Calls</Text>
                          <Text style={styles.metricItemValue}>{item.total_calls || 0}</Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Ionicons name="document-text-outline" size={16} color="#f59e0b" />
                          <Text style={styles.metricItemLabel}>Submissions</Text>
                          <Text style={styles.metricItemValue}>{item.total_submissions || 0}</Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Ionicons name="people-outline" size={16} color="#ef4444" />
                          <Text style={styles.metricItemLabel}>Interviews</Text>
                          <Text style={styles.metricItemValue}>{item.total_interviews || 0}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.metricRow}>
                        <View style={styles.metricItem}>
                          <Ionicons name="gift-outline" size={16} color="#ec4899" />
                          <Text style={styles.metricItemLabel}>Offers</Text>
                          <Text style={styles.metricItemValue}>{item.offers || 0}</Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Ionicons name="checkmark-circle-outline" size={16} color="#22c55e" />
                          <Text style={styles.metricItemLabel}>Starts</Text>
                          <Text style={styles.metricItemValue}>{item.starts || 0}</Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Ionicons name="eye-outline" size={16} color="#0ea5e9" />
                          <Text style={styles.metricItemLabel}>LinkedIn</Text>
                          <Text style={styles.metricItemValue}>{item.linkedin_profiles_viewed || 0}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="document-outline" size={48} color="#94a3b8" />
                    <Text style={styles.emptyTitle}>No Records Found</Text>
                    <Text style={styles.emptyText}>
                      Try adjusting your filters or check back later for new data.
                    </Text>
                  </View>
                }
                scrollEnabled={false}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <View style={styles.paginationContainer}>
                  <TouchableOpacity
                    style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                    onPress={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? '#94a3b8' : '#2563eb'} />
                    <Text style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}>
                      Previous
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.paginationInfo}>
                    <Text style={styles.paginationText}>
                      Page {currentPage} of {totalPages}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
                    onPress={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <Text style={[styles.paginationButtonText, currentPage === totalPages && styles.paginationButtonTextDisabled]}>
                      Next
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? '#94a3b8' : '#2563eb'} />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2563eb',
    backgroundColor: '#fff',
  },
  actionButtonActive: {
    backgroundColor: '#2563eb',
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#2563eb',
  },
  actionButtonTextActive: {
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalFooter: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  applyButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  periodButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  periodButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  timeSelectors: {
    gap: 12,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  filterModeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  filterModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterModeButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterModeButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  filterModeButtonTextActive: {
    color: '#fff',
  },
  metricsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  metricCardSelected: {
    borderColor: '#2563eb',
    borderWidth: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginLeft: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  metricInsight: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 6,
  },
  insightText: {
    fontSize: 12,
    color: '#1e293b',
  },
  dataContainer: {
    padding: 20,
  },
  dataHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recordsCount: {
    fontSize: 12,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  performanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  performanceHeader: {
    marginBottom: 12,
  },
  performanceInfo: {
    flex: 1,
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  performanceDate: {
    fontSize: 12,
    color: '#64748b',
  },
  performanceMetrics: {
    gap: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  metricItemLabel: {
    fontSize: 10,
    color: '#64748b',
    marginLeft: 6,
    flex: 1,
  },
  metricItemValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  paginationButtonDisabled: {
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563eb',
    marginHorizontal: 4,
  },
  paginationButtonTextDisabled: {
    color: '#94a3b8',
  },
  paginationInfo: {
    flex: 1,
    alignItems: 'center',
  },
  paginationText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
});


