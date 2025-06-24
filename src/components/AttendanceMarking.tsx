import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAttendance } from '@/hooks/useAttendance';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Clock, MapPin, CheckCircle, XCircle, Calendar, Settings } from 'lucide-react';
import { format } from 'date-fns';

const AttendanceMarking: React.FC = () => {
  const { user } = useAuth();
  const { todayAttendance, checkIn, checkOut, isLoading } = useAttendance();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualDate, setManualDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [manualTime, setManualTime] = useState(format(new Date(), 'HH:mm'));

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location error:', error);
          setLocation(null);
        }
      );
    }
  };

  const handleCheckIn = async () => {
    getCurrentLocation();
    
    let checkInTime;
    if (manualEntry) {
      checkInTime = new Date(`${manualDate}T${manualTime}`);
    } else {
      checkInTime = new Date();
    }

    const success = await checkIn(checkInTime);
    if (success) {
      toast({
        title: "Check-in Successful",
        description: `Checked in at ${format(checkInTime, 'HH:mm')}${manualEntry ? ' (Manual Entry)' : ''}`,
      });
    } else {
      toast({
        title: "Check-in Failed",
        description: "Unable to check in. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCheckOut = async () => {
    getCurrentLocation();
    
    let checkOutTime;
    if (manualEntry) {
      checkOutTime = new Date(`${manualDate}T${manualTime}`);
    } else {
      checkOutTime = new Date();
    }

    const success = await checkOut(checkOutTime);
    if (success) {
      toast({
        title: "Check-out Successful",
        description: `Checked out at ${format(checkOutTime, 'HH:mm')}${manualEntry ? ' (Manual Entry)' : ''}`,
      });
    } else {
      toast({
        title: "Check-out Failed",
        description: "Unable to check out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getWorkingHours = () => {
    if (!todayAttendance?.check_in_time) return '0h 0m';
    const startTime = new Date(todayAttendance.check_in_time);
    const endTime = todayAttendance.check_out_time ? new Date(todayAttendance.check_out_time) : new Date();
    const diffMs = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const isCheckedIn = todayAttendance?.check_in_time && !todayAttendance?.check_out_time;
  const isCheckedOut = todayAttendance?.check_in_time && todayAttendance?.check_out_time;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center space-x-2">
          <Clock className="w-6 h-6" />
          <span>Attendance</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Manual Entry Toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4 text-gray-600" />
            <Label htmlFor="manual-entry" className="text-sm font-medium">Manual Entry</Label>
          </div>
          <Switch
            id="manual-entry"
            checked={manualEntry}
            onCheckedChange={setManualEntry}
          />
        </div>

        {/* Manual Entry Fields */}
        {manualEntry && (
          <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
            <div>
              <Label htmlFor="manual-date">Date</Label>
              <Input
                id="manual-date"
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="manual-time">Time</Label>
              <Input
                id="manual-time"
                type="time"
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
              />
            </div>
            <p className="text-xs text-blue-600">
              ⚠️ Manual entries are logged for audit purposes
            </p>
          </div>
        )}

        {/* Status Display */}
        <div className="text-center">
          {!todayAttendance?.check_in_time ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600">Not checked in today</p>
            </div>
          ) : isCheckedIn ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-green-600 font-semibold">Checked In</p>
              <p className="text-sm text-gray-600">
                Since {format(new Date(todayAttendance.check_in_time), 'HH:mm')}
              </p>
              <p className="text-sm font-medium">Working: {getWorkingHours()}</p>
            </div>
          ) : isCheckedOut ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-blue-600 font-semibold">Day Completed</p>
              <p className="text-sm text-gray-600">
                {format(new Date(todayAttendance.check_in_time), 'HH:mm')} - {format(new Date(todayAttendance.check_out_time), 'HH:mm')}
              </p>
              <p className="text-sm font-medium">Total: {getWorkingHours()}</p>
            </div>
          ) : null}
        </div>

        {/* Action Button */}
        <div className="text-center">
          {!todayAttendance?.check_in_time ? (
            <Button
              onClick={handleCheckIn}
              disabled={isLoading}
              className="w-full gradient-primary text-white"
              size="lg"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              {manualEntry ? 'Check In (Manual)' : 'Check In'}
            </Button>
          ) : isCheckedIn ? (
            <Button
              onClick={handleCheckOut}
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              size="lg"
            >
              <XCircle className="w-5 h-5 mr-2" />
              {manualEntry ? 'Check Out (Manual)' : 'Check Out'}
            </Button>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-600 text-sm">You have completed your day</p>
            </div>
          )}
        </div>

        {/* Location Info */}
        {location && (
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <MapPin className="w-4 h-4" />
            <span>Location recorded</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceMarking;
