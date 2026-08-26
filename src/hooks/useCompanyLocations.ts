import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';

export interface CompanyLocation {
  id: string;
  company_id: string;
  name: string;
  is_active: boolean;
}

export const UNASSIGNED_LOCATION = '__unassigned__';

export function parseCompanyLocations(locations?: string | null): string[] {
  if (!locations) return [];
  const seen = new Set<string>();
  const names: string[] = [];
  for (const part of locations.split(/[,;/|]+/)) {
    const name = part.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

export function useCompanyLocations() {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const [locations, setLocations] = useState<CompanyLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLocations = useCallback(async () => {
    if (!currentCompany?.id) {
      setLocations([]);
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: fetchError } = await supabase
      .from('company_locations')
      .select('id, company_id, name, is_active')
      .eq('company_id', currentCompany.id)
      .order('name');
    if (fetchError) {
      setError(fetchError.message);
      setLocations([]);
    } else {
      setLocations((data || []) as CompanyLocation[]);
    }
    setLoading(false);
  }, [currentCompany?.id]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const activeNames = locations.filter((loc) => loc.is_active).map((loc) => loc.name);

  const addLocation = async (rawName: string) => {
    if (!currentCompany?.id || !user) return { error: 'Not allowed' };
    const name = rawName.trim();
    if (!name) return { error: 'Enter a location name' };
    const existing = locations.find((loc) => loc.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (existing.is_active) return { error: 'That location already exists' };
      const { error: updateError } = await supabase
        .from('company_locations')
        .update({ is_active: true })
        .eq('id', existing.id);
      if (updateError) return { error: updateError.message };
      await fetchLocations();
      await syncCompanyLocationsField(currentCompany.id);
      return {};
    }
    const { error: insertError } = await supabase.from('company_locations').insert({
      company_id: currentCompany.id,
      name,
      is_active: true,
    });
    if (insertError) return { error: insertError.message };
    await fetchLocations();
    await syncCompanyLocationsField(currentCompany.id);
    return {};
  };

  const setLocationActive = async (id: string, is_active: boolean) => {
    if (!currentCompany?.id) return { error: 'Not allowed' };
    const { error: updateError } = await supabase
      .from('company_locations')
      .update({ is_active })
      .eq('id', id);
    if (updateError) return { error: updateError.message };
    await fetchLocations();
    await syncCompanyLocationsField(currentCompany.id);
    return {};
  };

  const syncCompanyLocationsField = async (companyId: string) => {
    const { data } = await supabase
      .from('company_locations')
      .select('name')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name');
    const locations = (data || []).map((row) => row.name).join(', ');
    await supabase.from('companies').update({ locations }).eq('id', companyId);
  };

  return {
    locations,
    activeNames,
    loading,
    error,
    fetchLocations,
    addLocation,
    setLocationActive,
  };
}
