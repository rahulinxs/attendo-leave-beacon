import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Label } from './ui/label';
import { ShieldCheck, User, Settings as SettingsIcon } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { useTheme, THEME_OPTIONS, FONT_FAMILIES, FONT_SIZES, SIDEBAR_POSITIONS, BORDER_RADIUS_OPTIONS, LAYOUT_DENSITIES, ACCENT_COLORS, NOTIFICATION_TYPES, SUPPORTED_LANGUAGES } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

const ROLE_COLORS = {
  admin: 'from-blue-500 to-purple-600',
  super_admin: 'from-purple-600 to-pink-500',
  employee: 'from-green-400 to-orange-400',
};
const ROLE_BADGES = {
  admin: <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold"><ShieldCheck className="w-4 h-4" /> Admin</span>,
  super_admin: <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold"><SettingsIcon className="w-4 h-4" /> Super Admin</span>,
  employee: <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold"><User className="w-4 h-4" /> Employee</span>,
};

const SystemSettings: React.FC = () => {
  const { user } = useAuth();
  const { 
    theme, setTheme, 
    fontFamily, setFontFamily, 
    fontSize, setFontSize,
    sidebarPosition, setSidebarPosition,
    borderRadius, setBorderRadius,
    layoutDensity, setLayoutDensity,
    reducedMotion, setReducedMotion,
    customAccent, setCustomAccent,
    notifications, setNotificationPreference,
    language, setLanguage
  } = useTheme();
  const [lateMarkTime, setLateMarkTime] = useState('09:30');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { t, i18n } = useTranslation();
  const role = user?.role || 'employee';

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from<'system_settings', Database['public']['Tables']['system_settings']['Row']>('system_settings')
        .select('value')
        .eq('key', 'late_mark_time')
        .single();
      if (!error && data) setLateMarkTime(data.value);
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from<'system_settings', Database['public']['Tables']['system_settings']['Row']>('system_settings')
      .upsert({ key: 'late_mark_time', value: lateMarkTime, description: 'Time after which check-in is considered late (HH:MM, 24h format)' });
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: 'Failed to update setting', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Late mark time updated!' });
    }
  };

  return (
    <div className={`max-w-xl mx-auto mt-10 bg-gradient-to-br ${ROLE_COLORS[role]} p-1 rounded-2xl shadow-lg`}>
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-col gap-2 items-center">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <SettingsIcon className="w-7 h-7" />
            System Settings
          </CardTitle>
          {ROLE_BADGES[role]}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="mb-6">
              <Label htmlFor="theme-select" className="font-semibold">{t('colorTheme')}</Label>
              <div className="flex items-center gap-3 mt-2">
                <select
                  id="theme-select"
                  value={theme}
                  onChange={e => setTheme(e.target.value)}
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {THEME_OPTIONS.map(opt => (
                    <option key={opt.key} value={opt.key}>{opt.name}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('colorThemeDesc')}</p>
            </div>
            <div className="mb-6">
              <Label htmlFor="font-family" className="font-semibold">{t('fontFamily')}</Label>
              <div className="flex items-center gap-3 mt-2">
                <select
                  id="font-family"
                  value={fontFamily}
                  onChange={e => setFontFamily(e.target.value)}
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {FONT_FAMILIES.map(opt => (
                    <option key={opt.key} value={opt.key}>{opt.name}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('fontFamilyDesc')}</p>
            </div>
            <div className="mb-6">
              <Label htmlFor="font-size" className="font-semibold">{t('fontSize')}</Label>
              <div className="flex items-center gap-3 mt-2">
                <select
                  id="font-size"
                  value={fontSize}
                  onChange={e => setFontSize(e.target.value)}
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {FONT_SIZES.map(opt => (
                    <option key={opt.key} value={opt.key}>{opt.name}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('fontSizeDesc')}</p>
            </div>
            <div className="mb-6">
              <Label htmlFor="sidebar-position" className="font-semibold">{t('sidebarPosition')}</Label>
              <div className="flex items-center gap-3 mt-2">
                <select
                  id="sidebar-position"
                  value={sidebarPosition}
                  onChange={e => setSidebarPosition(e.target.value)}
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {SIDEBAR_POSITIONS.map(opt => (
                    <option key={opt.key} value={opt.key}>{opt.name}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('sidebarPositionDesc')}</p>
            </div>
            <div className="mb-6">
              <Label htmlFor="border-radius" className="font-semibold">{t('componentShape')}</Label>
              <div className="flex items-center gap-3 mt-2">
                <select
                  id="border-radius"
                  value={borderRadius}
                  onChange={e => setBorderRadius(e.target.value)}
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {BORDER_RADIUS_OPTIONS.map(opt => (
                    <option key={opt.key} value={opt.key}>{opt.name}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('componentShapeDesc')}</p>
            </div>
            <div className="mb-6">
              <Label htmlFor="layout-density" className="font-semibold">{t('layoutDensity')}</Label>
              <div className="flex items-center gap-3 mt-2">
                <select
                  id="layout-density"
                  value={layoutDensity}
                  onChange={e => setLayoutDensity(e.target.value)}
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {LAYOUT_DENSITIES.map(opt => (
                    <option key={opt.key} value={opt.key}>{opt.name}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('layoutDensityDesc')}</p>
            </div>
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="reduced-motion" className="font-semibold">{t('reducedMotion')}</Label>
                  <p className="text-xs text-gray-500 mt-1">{t('reducedMotionDesc')}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="reduced-motion"
                    checked={reducedMotion}
                    onChange={e => setReducedMotion(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <Label htmlFor="reduced-motion" className="text-sm">
                    {reducedMotion ? t('enabled') : t('disabled')}
                  </Label>
                </div>
              </div>
            </div>
            <div className="mb-6">
              <Label htmlFor="accent-color" className="font-semibold">{t('accentColor')}</Label>
              <div className="flex items-center gap-3 mt-2">
                <select
                  id="accent-color"
                  value={customAccent}
                  onChange={e => setCustomAccent(e.target.value)}
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {ACCENT_COLORS.map(opt => (
                    <option key={opt.key} value={opt.key}>{opt.name}</option>
                  ))}
                </select>
                <div 
                  className="w-8 h-8 rounded border-2 border-gray-300"
                  style={{ backgroundColor: ACCENT_COLORS.find(c => c.key === customAccent)?.hex }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('accentColorDesc')}</p>
            </div>
            <div className="mb-6 md:col-span-2">
              <Label className="font-semibold">{t('notificationPreferences')}</Label>
              <div className="space-y-3 mt-2">
                {NOTIFICATION_TYPES.map(notification => (
                  <div key={notification.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{notification.name}</p>
                      <p className="text-xs text-gray-500">{notification.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`notification-${notification.key}`}
                        checked={notifications[notification.key as keyof typeof notifications]}
                        onChange={e => setNotificationPreference(notification.key, e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <Label htmlFor={`notification-${notification.key}`} className="text-sm">
                        {notifications[notification.key as keyof typeof notifications] ? t('enabled') : t('disabled')}
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('notificationPreferencesDesc')}</p>
            </div>
            <div className="mb-6">
              <Label htmlFor="language" className="font-semibold">{t('language')}</Label>
              <div className="flex items-center gap-3 mt-2">
                <select
                  id="language"
                  value={language}
                  onChange={e => {
                    setLanguage(e.target.value);
                    i18n.changeLanguage(e.target.value);
                  }}
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <option key={lang.key} value={lang.key}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('languageDesc')}</p>
            </div>
          </div>
          <div className="mb-6">
            <Label htmlFor="lateMarkTime" className="font-semibold">Late Mark Allowed Time</Label>
            <div className="flex items-center gap-3 mt-2">
              <Input
                id="lateMarkTime"
                type="time"
                value={lateMarkTime}
                onChange={e => setLateMarkTime(e.target.value)}
                className={`w-40 ${role === 'employee' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                disabled={loading || role === 'employee'}
              />
              {role === 'employee' && (
                <span className="text-xs text-gray-500">(Read-only)</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Check-ins after this time are considered late. (24h format, e.g., 09:30)</p>
          </div>
          {role !== 'employee' && (
            <Button onClick={handleSave} disabled={loading || saving} className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold">
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemSettings; 