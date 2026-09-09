import React, { useEffect, useState } from 'react';
import { Settings2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeProfileFieldVisibility } from '@/hooks/useEmployeeProfileFieldVisibility';
import { EMPLOYEE_PROFILE_FIELDS, type EmployeeProfileFieldKey } from '@/utils/employeeProfileFields';

interface EmployeeProfileFieldSettingsProps {
  employeeId: string;
  employeeName: string;
}

const EmployeeProfileFieldSettings: React.FC<EmployeeProfileFieldSettingsProps> = ({ employeeId, employeeName }) => {
  const { user } = useAuth();
  const { visibility, loading, saveVisibility } = useEmployeeProfileFieldVisibility(employeeId);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(visibility);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(visibility);
  }, [visibility]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const error = await saveVisibility(draft, user.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Could not save profile settings', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Profile settings saved', description: `Visibility updated for ${employeeName}.` });
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => setOpen(true)}
        title="Customize profile fields"
        aria-label={`Customize profile fields for ${employeeName}`}
      >
        <Settings2 className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Customize {employeeName}'s profile</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Disabled sections are hidden from this employee's profile. Existing data is preserved.
          </p>
          <div className="space-y-3 max-h-[55vh] overflow-y-auto py-2">
            {EMPLOYEE_PROFILE_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">{field.label}</p>
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                </div>
                <Switch
                  checked={draft[field.key]}
                  onCheckedChange={(checked) => setDraft((current) => ({ ...current, [field.key as EmployeeProfileFieldKey]: checked }))}
                  disabled={loading || saving}
                  aria-label={`Enable ${field.label}`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EmployeeProfileFieldSettings;
