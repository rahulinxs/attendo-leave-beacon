export type AttendanceGeoPoint = {
  lat: number;
  lng: number;
  accuracy: number | null;
  captured_at: string;
};

export type AttendanceLocation = {
  check_in?: AttendanceGeoPoint;
  check_out?: AttendanceGeoPoint;
};

export const getCurrentGeoLocation = (
  timeoutMs = 8000
): Promise<AttendanceGeoPoint | null> => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(timer);
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy:
            typeof position.coords.accuracy === 'number'
              ? position.coords.accuracy
              : null,
          captured_at: new Date().toISOString(),
        });
      },
      () => {
        window.clearTimeout(timer);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
      }
    );
  });
};

export const mergeAttendanceLocation = (
  existing: unknown,
  event: 'check_in' | 'check_out',
  point: AttendanceGeoPoint | null
): AttendanceLocation | null => {
  if (!point) {
    return (existing as AttendanceLocation) || null;
  }

  const current =
    existing && typeof existing === 'object'
      ? ({ ...(existing as AttendanceLocation) } as AttendanceLocation)
      : {};

  current[event] = point;
  return current;
};
