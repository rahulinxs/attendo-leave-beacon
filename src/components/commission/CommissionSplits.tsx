import React, { useState } from 'react';
import { useCommission } from '@/contexts/CommissionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Users, DollarSign, Calculator } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const CommissionSplits: React.FC = () => {
  const { splitsByPerson, splitsByEngagement, exportToExcel, isLoading } = useCommission();
  const [activeTab, setActiveTab] = useState('by-person');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handleExportSplits = () => {
    exportToExcel('splits');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Commission Splits</h1>
            <p className="text-muted-foreground">View commission breakdowns by person and engagement</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-4 bg-muted rounded animate-pulse"></div>
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
          <h1 className="text-3xl font-bold">Commission Splits</h1>
          <p className="text-muted-foreground">View commission breakdowns by person and engagement</p>
        </div>
        <Button onClick={handleExportSplits} className="gap-2">
          <Download className="w-4 h-4" />
          Export Splits to Excel
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="by-person" className="gap-2">
            <Users className="w-4 h-4" />
            By Person
          </TabsTrigger>
          <TabsTrigger value="by-engagement" className="gap-2">
            <Calculator className="w-4 h-4" />
            By Engagement
          </TabsTrigger>
        </TabsList>

        {/* By Person Tab */}
        <TabsContent value="by-person" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Commission by Team Member
              </CardTitle>
            </CardHeader>
            <CardContent>
              {splitsByPerson.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No commission data yet</h3>
                  <p className="text-muted-foreground">
                    Create engagements to see commission splits by team member
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team Member</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Engagement Count</TableHead>
                        <TableHead>Total Commission</TableHead>
                        <TableHead>Avg per Engagement</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {splitsByPerson
                        .sort((a, b) => b.total_commission - a.total_commission)
                        .map((person, index) => (
                          <TableRow key={person.name}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {index === 0 && <Badge className="bg-yellow-100 text-yellow-800">👑 Top Earner</Badge>}
                                {person.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                {person.roles.map((role) => (
                                  <Badge key={role} variant="outline" className="text-xs">
                                    {role}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>{person.engagement_count}</TableCell>
                            <TableCell className="font-semibold text-green-600">
                              {formatCurrency(person.total_commission)}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(person.total_commission / person.engagement_count)}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Summary Stats */}
              {splitsByPerson.length > 0 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-700">
                        {splitsByPerson.length}
                      </div>
                      <div className="text-sm text-blue-600">Team Members</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-700">
                        {formatCurrency(splitsByPerson.reduce((sum, p) => sum + p.total_commission, 0))}
                      </div>
                      <div className="text-sm text-green-600">Total Commission</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-amber-700">
                        {formatCurrency(
                          splitsByPerson.length > 0 
                            ? splitsByPerson.reduce((sum, p) => sum + p.total_commission, 0) / splitsByPerson.length
                            : 0
                        )}
                      </div>
                      <div className="text-sm text-amber-600">Average per Person</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-700">
                        {Math.max(...splitsByPerson.map(p => p.engagement_count), 0)}
                      </div>
                      <div className="text-sm text-purple-600">Max Engagements</div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Engagement Tab */}
        <TabsContent value="by-engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Commission by Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              {splitsByEngagement.length === 0 ? (
                <div className="text-center py-12">
                  <Calculator className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No engagement data yet</h3>
                  <p className="text-muted-foreground">
                    Create engagements to see commission splits by engagement
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {splitsByEngagement.map((engagement) => (
                    <Card key={engagement.engagement_id} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{engagement.consultant_name}</CardTitle>
                            <p className="text-muted-foreground">
                              {engagement.client} • {engagement.commission_cycle}
                            </p>
                          </div>
                          {engagement.unallocated_balance > 0 && (
                            <Badge variant="outline" className="text-amber-600 border-amber-600">
                              Unallocated: {formatCurrency(engagement.unallocated_balance)}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {engagement.team_members.map((member, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Users className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <div className="font-medium">{member.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {formatPercent(member.split_percent)} split
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-green-600">
                                  {formatCurrency(member.commission_amount)}
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {engagement.team_members.length === 0 && (
                            <div className="text-center py-4 text-muted-foreground">
                              No team members assigned to this engagement
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommissionSplits;
