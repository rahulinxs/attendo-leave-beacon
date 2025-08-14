import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, FlatList } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../lib/supabase';
import { useUserProfile } from '../lib/useUserProfile';

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
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PerformanceRow[]>([]);

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

  const refresh = async () => {
    if (!profileData?.profile?.company_id) return;
    setLoading(true);
    setError(null);
    try {
      let startDate = '';
      let endDate = '';
      if (periodType === 'monthly') {
        startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        // using 28 keeps it simple and matches web component logic
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

      let query = supabase
        .from('performance_reports')
        .select('*')
        .eq('company_id', profileData.profile.company_id)
        .gte('report_date', startDate)
        .lte('report_date', endDate);

      if (filterMode === 'team' && selectedTeam !== 'all') {
        query = query.eq('team_id', selectedTeam);
      }
      if (filterMode === 'individual' && selectedUser !== 'all') {
        query = query.eq('user_id', selectedUser);
      }

      const { data: rows, error: qErr } = await query;
      if (qErr) throw qErr;
      setData(rows || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData?.profile?.company_id, periodType, month, year, quarter, half, selectedTeam, selectedUser, filterMode]);

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={styles.title}>Recruitment Reports</Text>

      {/* Filters */}
      <View style={styles.filtersCard}>
        <Text style={styles.sectionTitle}>Filters</Text>

        <View style={styles.filterRow}>
          <View style={styles.filterCol}>
            <Text style={styles.label}>Period Type</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={periodType} onValueChange={v => setPeriodType(v)}>
                <Picker.Item label="Monthly" value="monthly" />
                <Picker.Item label="Quarterly" value="quarterly" />
                <Picker.Item label="Half Yearly" value="half-yearly" />
                <Picker.Item label="Yearly" value="yearly" />
              </Picker>
            </View>
          </View>

          {periodType === 'monthly' && (
            <View style={styles.filterCol}>
              <Text style={styles.label}>Month</Text>
              <View style={styles.pickerWrap}>
                <Picker selectedValue={month} onValueChange={v => setMonth(v)}>
                  {monthOptions.map(m => (
                    <Picker.Item key={m.value} label={m.label} value={m.value} />
                  ))}
                </Picker>
              </View>
            </View>
          )}

          {periodType === 'quarterly' && (
            <View style={styles.filterCol}>
              <Text style={styles.label}>Quarter</Text>
              <View style={styles.pickerWrap}>
                <Picker selectedValue={quarter} onValueChange={v => setQuarter(v)}>
                  <Picker.Item label="Q1" value={1} />
                  <Picker.Item label="Q2" value={2} />
                  <Picker.Item label="Q3" value={3} />
                  <Picker.Item label="Q4" value={4} />
                </Picker>
              </View>
            </View>
          )}

          {periodType === 'half-yearly' && (
            <View style={styles.filterCol}>
              <Text style={styles.label}>Half</Text>
              <View style={styles.pickerWrap}>
                <Picker selectedValue={half} onValueChange={v => setHalf(v)}>
                  <Picker.Item label="H1" value={1} />
                  <Picker.Item label="H2" value={2} />
                </Picker>
              </View>
            </View>
          )}

          <View style={styles.filterCol}>
            <Text style={styles.label}>Year</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={year} onValueChange={v => setYear(v)}>
                {yearOptions.map(y => (
                  <Picker.Item key={y} label={String(y)} value={y} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterCol}>
            <Text style={styles.label}>Filter By</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={filterMode} onValueChange={v => setFilterMode(v)}>
                <Picker.Item label="Team" value="team" />
                <Picker.Item label="Individual" value="individual" />
              </Picker>
            </View>
          </View>

          {filterMode === 'team' && (
            <View style={styles.filterCol}>
              <Text style={styles.label}>Team</Text>
              <View style={styles.pickerWrap}>
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
            <View style={styles.filterCol}>
              <Text style={styles.label}>User</Text>
              <View style={styles.pickerWrap}>
                <Picker selectedValue={selectedUser} onValueChange={v => setSelectedUser(v)}>
                  <Picker.Item label="All Users" value="all" />
                  {users.map(u => (
                    <Picker.Item key={u.id} label={u.name} value={u.id} />
                  ))}
                </Picker>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Totals */}
      <View style={styles.cardsRow}>
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
        ].map(card => (
          <View key={card.label} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{card.label}</Text>
            <Text style={styles.metricValue}>{card.value}</Text>
          </View>
        ))}
      </View>

      {/* Data list */}
      <View style={styles.listCard}>
        <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Performance Data</Text>
        {loading ? (
          <View style={{ padding: 16, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : error ? (
          <Text style={styles.errorText}>Error: {error}</Text>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item, idx) => item.id || `${idx}`}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{teamName(item.team_id)} • {userName(item.user_id)}</Text>
                  <Text style={styles.rowSub}>Date: {item.report_date}</Text>
                </View>
                <View style={styles.rowMetrics}>
                  <Text style={styles.rowMetric}>C: {item.total_calls || 0}</Text>
                  <Text style={styles.rowMetric}>S: {item.total_submissions || 0}</Text>
                  <Text style={styles.rowMetric}>I: {item.total_interviews || 0}</Text>
                  <Text style={styles.rowMetric}>O: {item.offers || 0}</Text>
                  <Text style={styles.rowMetric}>St: {item.starts || 0}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No data found</Text>}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#22223b', marginBottom: 12, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  label: { fontSize: 14, color: '#475569', marginBottom: 6 },
  filtersCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  filterCol: { width: '48%', marginBottom: 12 },
  pickerWrap: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, overflow: 'hidden' },
  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metricCard: { width: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4 },
  metricLabel: { fontSize: 12, color: '#64748b' },
  metricValue: { fontSize: 20, fontWeight: 'bold', color: '#2563eb' },
  listCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 4, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  rowSub: { fontSize: 12, color: '#64748b' },
  rowMetrics: { flexDirection: 'row', gap: 8 },
  rowMetric: { fontSize: 12, color: '#334155', minWidth: 24, textAlign: 'right' },
  errorText: { color: '#ef4444', textAlign: 'center', paddingVertical: 16 },
  emptyText: { color: '#64748b', textAlign: 'center', paddingVertical: 16 },
});


