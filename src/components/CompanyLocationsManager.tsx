import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyLocations } from '@/hooks/useCompanyLocations';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const CompanyLocationsManager: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const { locations, loading, error, addLocation, setLocationActive } = useCompanyLocations();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const handleAdd = async () => {
    setBusy(true);
    setMessage('');
    const result = await addLocation(name);
    if (result.error) setMessage(result.error);
    else setName('');
    setBusy(false);
  };

  const handleToggle = async (id: string, is_active: boolean) => {
    setBusy(true);
    setMessage('');
    const result = await setLocationActive(id, is_active);
    if (result.error) setMessage(result.error);
    setBusy(false);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white/70 p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">Work locations</h3>
          <p className="text-xs text-gray-500">
            Employees can only be assigned to active locations. Inactive locations stay on existing employee records.
          </p>
        </div>
      </div>
      {loading && <p className="text-sm text-gray-500 mb-2">Loading locations...</p>}
      {(error || message) && <p className="text-sm text-red-600 mb-2">{message || error}</p>}
      <ul className="space-y-2 mb-4">
        {locations.length === 0 && !loading && (
          <li className="text-sm text-gray-500">No locations yet. Admins can add offices below.</li>
        )}
        {locations.map((loc) => (
          <li key={loc.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium truncate">{loc.name}</span>
              <Badge variant={loc.is_active ? 'default' : 'secondary'}>
                {loc.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {isAdmin && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => handleToggle(loc.id, !loc.is_active)}
              >
                {loc.is_active ? 'Inactivate' : 'Activate'}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {isAdmin && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Add location (e.g. Mumbai)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            disabled={busy}
          />
          <Button type="button" onClick={handleAdd} disabled={busy || !name.trim()}>
            Add location
          </Button>
        </div>
      )}
    </div>
  );
};

export default CompanyLocationsManager;
