import React, { useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';

const columns = [
  'Team', 'USER NAME', 'Monster', 'Dice', 'LinkedIn Profiles viewed', 'LinkedIn InMails sent',
  'Total Calls', 'Total Call Duration', 'Total Submissions', 'Total Interviews', 'Offers', 'Starts', 'Placed', 'Offered'
];

const staticData = [
  {
    team: 'Team Jenson',
    userName: 'Jenson Sebastian',
    monster: 123,
    dice: 0,
    linkedinProfilesViewed: 244,
    linkedinInmailsSent: 0,
    totalCalls: 398,
    totalCallDuration: '7:22:18',
    totalSubmissions: 0,
    totalInterviews: 0,
    offers: 0,
    starts: 0,
    placed: 0,
    offered: 0,
  },
  // ... add more static rows as needed
];

const getMonthOptions = () => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months.map((m, i) => ({ label: m, value: i + 1 }));
};

const getYearOptions = () => {
  const currentYear = new Date().getFullYear();
  return [currentYear - 1, currentYear, currentYear + 1];
};

const PerformanceReport: React.FC = () => {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  if (!currentCompany?.moduleSettings?.performance_report_enabled) {
    return null;
  }
  if (!['admin', 'super_admin', 'reporting_manager'].includes(user?.role)) {
    return null;
  }

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle>Performance Report</CardTitle>
        <div className="flex gap-4 mt-2">
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="border rounded px-2 py-1">
            {getMonthOptions().map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="border rounded px-2 py-1">
            {getYearOptions().map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full border text-xs">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col} className="border px-2 py-1 bg-gray-100 text-left">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staticData.map((row, idx) => (
                <tr key={idx}>
                  <td className="border px-2 py-1">{row.team}</td>
                  <td className="border px-2 py-1">{row.userName}</td>
                  <td className="border px-2 py-1">{row.monster}</td>
                  <td className="border px-2 py-1">{row.dice}</td>
                  <td className="border px-2 py-1">{row.linkedinProfilesViewed}</td>
                  <td className="border px-2 py-1">{row.linkedinInmailsSent}</td>
                  <td className="border px-2 py-1">{row.totalCalls}</td>
                  <td className="border px-2 py-1">{row.totalCallDuration}</td>
                  <td className="border px-2 py-1">{row.totalSubmissions}</td>
                  <td className="border px-2 py-1">{row.totalInterviews}</td>
                  <td className="border px-2 py-1">{row.offers}</td>
                  <td className="border px-2 py-1">{row.starts}</td>
                  <td className="border px-2 py-1">{row.placed}</td>
                  <td className="border px-2 py-1">{row.offered}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceReport; 