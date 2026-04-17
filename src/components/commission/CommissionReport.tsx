import React, { useState, useMemo, useEffect } from 'react';
import { useCommission } from '@/contexts/CommissionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Edit, Trash2, FileText, Download } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CommissionReportRecord {
  id: string;
  consultant_name: string;
  client: string;
  end_client: string | null;
  start_date: string;
  bill_rate: number;
  pay_rate: number;
  load_percent: number;
  hours: number;
  commission_cycle: string;
  recruiter_name: string | null;
  recruiter_split_percent: number;
  recruitment_lead_name: string | null;
  recruitment_lead_split_percent: number;
  sales_name: string | null;
  sales_split_percent: number;
  sales_lead_name: string | null;
  sales_lead_split_percent: number;
}

const CommissionReport: React.FC = () => {
  const { engagements, isLoading, fetchEngagements } = useCommission();
  const [searchTerm, setSearchTerm] = useState('');

  // Ensure data is fetched when component mounts
  useEffect(() => {
    fetchEngagements();
  }, [fetchEngagements]);

  // Transform engagements to report records
  const reportData = useMemo(() => {
    return engagements.map(engagement => {
      // Calculate financial metrics
      const totalCost = (engagement.pay_rate * engagement.hours) * (1 + engagement.load_percent / 100);
      const totalRevenue = engagement.bill_rate * engagement.hours;
      const margin = totalRevenue - totalCost;
      const marginPercent = totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0;
      
      // Calculate total commission based on cycle
      let totalCommission = 0;
      const commissionPercent = engagement.recruiter_split_percent + engagement.recruitment_lead_split_percent + 
                           engagement.sales_split_percent + engagement.sales_lead_split_percent;
      
      if (engagement.commission_cycle === 'Monthly') {
        totalCommission = totalRevenue * (commissionPercent / 100);
      } else if (engagement.commission_cycle === 'Quarterly') {
        totalCommission = totalRevenue * (commissionPercent / 100) * 3; // Quarterly multiplier
      }

      return {
        id: engagement.id,
        consultant_name: engagement.consultant_name,
        client: engagement.client,
        end_client: engagement.end_client,
        start_date: engagement.start_date,
        bill_rate: engagement.bill_rate,
        pay_rate: engagement.pay_rate,
        load_percent: engagement.load_percent,
        hours: engagement.hours,
        commission_cycle: engagement.commission_cycle,
        recruiter_name: engagement.recruiter_name,
        recruiter_split_percent: engagement.recruiter_split_percent,
        recruitment_lead_name: engagement.recruitment_lead_name,
        recruitment_lead_split_percent: engagement.recruitment_lead_split_percent,
        sales_name: engagement.sales_name,
        sales_split_percent: engagement.sales_split_percent,
        sales_lead_name: engagement.sales_lead_name,
        sales_lead_split_percent: engagement.sales_lead_split_percent,
        totalCost,
        margin,
        marginPercent,
        commissionPercent,
        totalCommission
      } as CommissionReportRecord;
    });
  }, [engagements]);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return reportData;
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return reportData.filter(record => 
      record.consultant_name.toLowerCase().includes(lowerSearchTerm) ||
      record.client.toLowerCase().includes(lowerSearchTerm) ||
      (record.end_client && record.end_client.toLowerCase().includes(lowerSearchTerm)) ||
      record.commission_cycle.toLowerCase().includes(lowerSearchTerm)
    );
  }, [reportData, searchTerm]);

  const handleEdit = (record: CommissionReportRecord) => {
    // TODO: Implement edit functionality
    console.log('Edit record:', record);
  };

  const handleDelete = (record: CommissionReportRecord) => {
    // TODO: Implement delete functionality
    console.log('Delete record:', record);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export data:', filteredData);
  };

  return (
    <div className="space-y-6">
      {/* Header with Search and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Commission Report
            </span>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search consultant, client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary">
              {filteredData.length} records
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">Loading commission data...</div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">
                {searchTerm ? 'No records found matching your search.' : 'No commission records available.'}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-medium text-sm">Consultant</th>
                    <th className="text-left p-3 font-medium text-sm">Client</th>
                    <th className="text-left p-3 font-medium text-sm">End client</th>
                    <th className="text-left p-3 font-medium text-sm">Start date</th>
                    <th className="text-left p-3 font-medium text-sm">Bill rate</th>
                    <th className="text-left p-3 font-medium text-sm">Pay rate</th>
                    <th className="text-left p-3 font-medium text-sm">Load%</th>
                    <th className="text-left p-3 font-medium text-sm">Total cost</th>
                    <th className="text-left p-3 font-medium text-sm">Margin</th>
                    <th className="text-left p-3 font-medium text-sm">Hours</th>
                    <th className="text-left p-3 font-medium text-sm">Comm%</th>
                    <th className="text-left p-3 font-medium text-sm">Total comm</th>
                    <th className="text-left p-3 font-medium text-sm">Cycle</th>
                    <th className="text-left p-3 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm font-medium">{record.consultant_name}</td>
                      <td className="p-3 text-sm">{record.client}</td>
                      <td className="p-3 text-sm">{record.end_client || '-'}</td>
                      <td className="p-3 text-sm">{new Date(record.start_date).toLocaleDateString()}</td>
                      <td className="p-3 text-sm">{formatCurrency(record.bill_rate)}</td>
                      <td className="p-3 text-sm">{formatCurrency(record.pay_rate)}</td>
                      <td className="p-3 text-sm">{record.load_percent}%</td>
                      <td className="p-3 text-sm">{formatCurrency(record.totalCost)}</td>
                      <td className="p-3 text-sm">
                        <span className={record.marginPercent >= 20 ? 'text-green-600' : record.marginPercent >= 10 ? 'text-yellow-600' : 'text-red-600'}>
                          {formatCurrency(record.margin)} ({record.marginPercent.toFixed(1)}%)
                        </span>
                      </td>
                      <td className="p-3 text-sm">{record.hours}</td>
                      <td className="p-3 text-sm">{record.commissionPercent}%</td>
                      <td className="p-3 text-sm font-medium">{formatCurrency(record.totalCommission)}</td>
                      <td className="p-3 text-sm">
                        <Badge variant={record.commission_cycle === 'Monthly' ? 'default' : 'secondary'}>
                          {record.commission_cycle}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleEdit(record)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(record)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CommissionReport;
