import React from 'react';
import { useCommission } from '@/contexts/CommissionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, TrendingUp, DollarSign, Users, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommissionDashboardProps {
  onNavigate: (tab: string) => void;
}

const CommissionDashboard: React.FC<CommissionDashboardProps> = ({ onNavigate }) => {
  const { kpiCards, engagements, isLoading } = useCommission();

  const recentEngagements = engagements.slice(0, 5);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const KPICard = ({ 
    title, 
    value, 
    hint, 
    icon: Icon, 
    colorClass 
  }: { 
    title: string; 
    value: string | number; 
    hint?: string; 
    icon: React.ComponentType<any>; 
    colorClass: string; 
  }) => (
    <Card className={cn("hover:shadow-md transition-shadow", colorClass)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className="text-2xl font-bold mt-2 font-mono">
              {value}
            </p>
            {hint && (
              <p className="text-xs text-muted-foreground mt-1">
                {hint}
              </p>
            )}
          </div>
          <div className="p-3 rounded-full bg-muted">
            <Icon className="w-6 h-6 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/3"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Commission Calculator</h1>
          <p className="text-muted-foreground">Track and calculate commission splits across your team</p>
        </div>
        <Button onClick={() => onNavigate('commission-calculator')} className="gap-2">
          <Plus className="w-4 h-4" />
          New Engagement
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Engagements"
          value={formatNumber(kpiCards.total_engagements)}
          hint="Active commission engagements"
          icon={Users}
          colorClass="border-blue-200 bg-blue-50"
        />
        <KPICard
          title="Avg Bill Rate"
          value={formatCurrency(kpiCards.average_bill_rate)}
          hint="Weighted average across all engagements"
          icon={DollarSign}
          colorClass="border-neutral-200 bg-neutral-50"
        />
        <KPICard
          title="Total Margin"
          value={formatCurrency(kpiCards.total_margin)}
          hint="Sum of all engagement margins"
          icon={TrendingUp}
          colorClass="border-green-200 bg-green-50"
        />
        <KPICard
          title="Total Commission"
          value={formatCurrency(kpiCards.total_commission)}
          hint="Sum of all commission payouts"
          icon={Calculator}
          colorClass="border-amber-200 bg-amber-50"
        />
      </div>

      {/* Recent Engagements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Engagements</CardTitle>
          <Button variant="outline" size="sm" onClick={() => onNavigate('commission-calculator')}>
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {recentEngagements.length === 0 ? (
            <div className="text-center py-8">
              <Calculator className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No engagements yet</h3>
              <p className="text-muted-foreground mb-4">
                Start tracking your first commission engagement
              </p>
              <Button onClick={() => onNavigate('commission-calculator')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Engagement
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Consultant</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Bill Rate</TableHead>
                  <TableHead>Margin/hr</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Total Commission</TableHead>
                  <TableHead>Cycle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEngagements.map((engagement) => (
                  <TableRow key={engagement.id}>
                    <TableCell className="font-medium">{engagement.consultant_name}</TableCell>
                    <TableCell>{engagement.client}</TableCell>
                    <TableCell>{formatCurrency(engagement.bill_rate)}</TableCell>
                    <TableCell className={cn(
                      engagement.margin_percent > 20 ? "text-green-600" : 
                      engagement.margin_percent > 10 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {formatCurrency(engagement.margin_per_hour)}
                    </TableCell>
                    <TableCell>{formatNumber(engagement.hours)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(engagement.total_commission)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{engagement.commission_cycle}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CommissionDashboard;
