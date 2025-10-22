import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, useTheme, Button, ActivityIndicator, DataTable, Menu, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, addDays, isToday, isSameDay, parseISO } from 'date-fns';
import { DatePickerModal } from 'react-native-paper-dates';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

// Types
import { RootStackParamList } from '@navigation/AppNavigator';
import { ScheduleItem } from '@types/schedule';

// Utils
import { showToast } from '@utils/toast';

type Props = NativeStackScreenProps<RootStackParamList, 'Schedule'>;

const ScheduleScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');

  // Generate week days for the week view
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const date = addDays(selectedDate, i - selectedDate.getDay());
    return {
      date,
      day: format(date, 'EEE'),
      dayNumber: format(date, 'd'),
      isToday: isToday(date),
    };
  });

  const fetchSchedule = useCallback(async (date: Date) => {
    try {
      setLoading(true);
      // TODO: Implement API call to fetch schedule
      // const data = await apiService.getSchedule(date, viewMode);
      // setSchedule(data);
      
      // Mock data for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockData: ScheduleItem[] = [
        {
          id: '1',
          title: 'Team Meeting',
          description: 'Weekly team sync',
          startTime: new Date(date.setHours(10, 0, 0)),
          endTime: new Date(date.setHours(11, 30, 0)),
          location: 'Conference Room A',
          type: 'meeting',
        },
        {
          id: '2',
          title: 'Lunch Break',
          description: '',
          startTime: new Date(date.setHours(12, 30, 0)),
          endTime: new Date(date.setHours(13, 30, 0)),
          type: 'break',
        },
      ];
      setSchedule(mockData);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      showToast('error', 'Failed to load schedule');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [viewMode]);

  React.useEffect(() => {
    fetchSchedule(selectedDate);
  }, [selectedDate, viewMode, fetchSchedule]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSchedule(selectedDate);
  }, [selectedDate, fetchSchedule]);

  const onDateSelect = (date: Date) => {
    setSelectedDate(date);
    setShowDatePicker(false);
  };

  const handlePrevious = () => {
    const newDate = addDays(selectedDate, viewMode === 'day' ? -1 : -7);
    setSelectedDate(newDate);
  };

  const handleNext = () => {
    const newDate = addDays(selectedDate, viewMode === 'day' ? 1 : 7);
    setSelectedDate(newDate);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting':
        return colors.primary;
      case 'break':
        return colors.secondary;
      case 'task':
        return colors.tertiary;
      default:
        return colors.primary;
    }
  };

  const filterScheduleByDate = (date: Date) => {
    return schedule.filter(item => 
      isSameDay(parseISO(item.startTime.toString()), date)
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text variant="headlineSmall" style={styles.headerText}>
              {viewMode === 'day' 
                ? format(selectedDate, 'MMMM d, yyyy')
                : `${format(weekDays[0].date, 'MMM d')} - ${format(weekDays[6].date, 'MMM d, yyyy')}`}
            </Text>
            
            <View style={styles.viewModeContainer}>
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <Button 
                    mode="outlined" 
                    onPress={() => setMenuVisible(true)}
                    style={styles.viewModeButton}
                  >
                    {viewMode === 'day' ? 'Day' : 'Week'}
                  </Button>
                }
              >
                <Menu.Item 
                  onPress={() => {
                    setViewMode('day');
                    setMenuVisible(false);
                  }} 
                  title="Day" 
                />
                <Divider />
                <Menu.Item 
                  onPress={() => {
                    setViewMode('week');
                    setMenuVisible(false);
                  }} 
                  title="Week" 
                />
              </Menu>
            </View>
          </View>

          <View style={styles.dateNavigation}>
            <Button 
              mode="outlined" 
              onPress={handleToday}
              style={styles.todayButton}
            >
              Today
            </Button>
            
            <View style={styles.navButtons}>
              <Button 
                mode="text" 
                onPress={handlePrevious}
                icon="chevron-left"
              />
              <Button 
                mode="text" 
                onPress={() => setShowDatePicker(true)}
                style={styles.dateButton}
              >
                {format(selectedDate, 'MMM d, yyyy')}
              </Button>
              <Button 
                mode="text" 
                onPress={handleNext}
                icon="chevron-right"
              />
            </View>
          </View>

          {viewMode === 'week' && (
            <View style={styles.weekDays}>
              {weekDays.map((day, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.dayHeader,
                    day.isToday && { backgroundColor: colors.surfaceVariant }
                  ]}
                >
                  <Text 
                    style={[
                      styles.dayText,
                      day.isToday && { color: colors.primary, fontWeight: 'bold' }
                    ]}
                  >
                    {day.day}
                  </Text>
                  <Text 
                    style={[
                      styles.dayNumber,
                      day.isToday && { 
                        backgroundColor: colors.primary,
                        color: colors.onPrimary,
                      }
                    ]}
                  >
                    {day.dayNumber}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {viewMode === 'day' ? (
          <View style={styles.dayView}>
            {schedule.length > 0 ? (
              schedule.map((item) => (
                <Card 
                  key={item.id} 
                  style={[
                    styles.eventCard, 
                    { borderLeftColor: getEventTypeColor(item.type) }
                  ]}
                  onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
                >
                  <Card.Content>
                    <View style={styles.eventHeader}>
                      <Text variant="titleMedium" style={styles.eventTitle}>
                        {item.title}
                      </Text>
                      <View style={styles.eventTime}>
                        <MaterialCommunityIcons 
                          name="clock-outline" 
                          size={16} 
                          color={colors.onSurfaceVariant} 
                        />
                        <Text variant="bodySmall" style={styles.timeText}>
                          {format(parseISO(item.startTime.toString()), 'h:mm a')} - {format(parseISO(item.endTime.toString()), 'h:mm a')}
                        </Text>
                      </View>
                    </View>
                    {item.description && (
                      <Text variant="bodyMedium" style={styles.eventDescription}>
                        {item.description}
                      </Text>
                    )}
                    {item.location && (
                      <View style={styles.eventLocation}>
                        <MaterialCommunityIcons 
                          name="map-marker" 
                          size={16} 
                          color={colors.onSurfaceVariant} 
                        />
                        <Text variant="bodySmall" style={styles.locationText}>
                          {item.location}
                        </Text>
                      </View>
                    )}
                  </Card.Content>
                </Card>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="calendar-blank"
                  size={48}
                  color={colors.onSurfaceDisabled}
                />
                <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant, marginTop: 8 }}>
                  No events scheduled
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.weekView}>
            {weekDays.map((day, index) => {
              const daySchedule = filterScheduleByDate(day.date);
              return (
                <View key={index} style={styles.weekDayColumn}>
                  <View style={styles.weekDayHeader}>
                    <Text 
                      variant="bodyMedium" 
                      style={[
                        styles.weekDayText,
                        day.isToday && { 
                          color: colors.primary,
                          fontWeight: 'bold',
                        }
                      ]}
                    >
                      {day.day}
                    </Text>
                  </View>
                  <View style={styles.weekDayContent}>
                    {daySchedule.length > 0 ? (
                      daySchedule.map((item) => (
                        <View 
                          key={item.id} 
                          style={[
                            styles.weekEvent,
                            { borderLeftColor: getEventTypeColor(item.type) }
                          ]}
                          onTouchEnd={() => navigation.navigate('EventDetails', { eventId: item.id })}
                        >
                          <Text 
                            variant="bodySmall" 
                            style={styles.weekEventTitle}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                          <Text 
                            variant="bodySmall" 
                            style={styles.weekEventTime}
                            numberOfLines={1}
                          >
                            {format(parseISO(item.startTime.toString()), 'h:mm a')}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <View style={styles.weekDayEmpty} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Button 
        mode="contained" 
        style={styles.addButton}
        icon="plus"
        onPress={() => navigation.navigate('CreateEvent')}
      >
        Add Event
      </Button>

      <DatePickerModal
        mode="single"
        visible={showDatePicker}
        onDismiss={() => setShowDatePicker(false)}
        date={selectedDate}
        onConfirm={({ date }) => {
          if (date) {
            onDateSelect(date);
          }
        }}
        saveLabel="Select"
        label="Select date"
        animationType="slide"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    fontWeight: 'bold',
  },
  viewModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewModeButton: {
    marginLeft: 8,
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  todayButton: {
    marginRight: 16,
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateButton: {
    flex: 1,
  },
  weekDays: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  dayText: {
    fontSize: 12,
    marginBottom: 4,
  },
  dayNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 14,
  },
  dayView: {
    flex: 1,
  },
  weekView: {
    flex: 1,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.12)',
  },
  weekDayColumn: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: 'rgba(0, 0, 0, 0.12)',
  },
  weekDayHeader: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
    minHeight: 40,
    justifyContent: 'center',
  },
  weekDayText: {
    textAlign: 'center',
  },
  weekDayContent: {
    minHeight: 100,
  },
  weekDayEmpty: {
    minHeight: 100,
  },
  weekEvent: {
    margin: 2,
    padding: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderLeftWidth: 3,
  },
  weekEventTitle: {
    fontWeight: '500',
  },
  weekEventTime: {
    fontSize: 10,
    opacity: 0.7,
  },
  eventCard: {
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  eventTitle: {
    flex: 1,
    fontWeight: '500',
  },
  eventTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    marginLeft: 4,
  },
  eventDescription: {
    marginTop: 4,
    color: 'rgba(0, 0, 0, 0.6)',
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    marginLeft: 4,
    color: 'rgba(0, 0, 0, 0.6)',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    borderRadius: 28,
    elevation: 4,
  },
});

export default ScheduleScreen;
