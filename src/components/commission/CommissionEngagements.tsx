import React, { useState, useMemo } from 'react';
import { useCommission } from '@/contexts/CommissionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Download, Search, Edit, Trash2, Plus, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const CommissionEngagements: React.FC = () => {
  const { engagements, deleteEngagement, exportToCSV, exportToExcel, isLoading } = useCommission();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [engagementToDelete, setEngagementToDelete] = useState<string | null>(null);

  // Filter engagements based on search term
  const filteredEngagements = useMemo(() => {
    if (!searchTerm) return engagements;
    
    const term = searchTerm.toLowerCase();
    return engagements.filter(engagement => 
      engagement.consultant_name.toLowerCase().includes(term) ||
      engagement.client.toLowerCase().includes(term) ||
      engagement.end_client?.toLowerCase().includes(term) ||
      engagement.recruiter_name?.toLowerCase().includes(term) ||
      engagement.recruitment_lead_name?.toLowerCase().includes(term) ||
      engagement.sales_name?.toLowerCase().includes(term) ||
      engagement.sales_lead_name?.toLowerCase().includes(term)
    );
  }, [engagements, searchTerm]);

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

  const handleDeleteEngagement = async (id: string) => {
    await deleteEngagement(id);
    setDeleteDialogOpen(false);
    setEngagementToDelete(null);
  };

  const openDeleteDialog = (id: string) => {
    setEngagementToDelete(id);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Commission Engagements</h1>
            <p className="text-muted-foreground">Manage all commission engagements</p>
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
          <h1 className="text-3xl font-bold">Commission Engagements</h1>
          <p className="text-muted-foreground">Manage all commission engagements and their calculations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV} className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => exportToExcel('engagements')} className="gap-2">
            <Download className="w-4 h-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by consultant, client, or team member..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline" className="gap-2">
              <Filter className="w-3 h-3" />
              {filteredEngagements.length} of {engagements.length} results
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Engagements Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Engagements</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEngagements.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                {searchTerm ? 'No engagements found matching your search criteria.' : 'No engagements yet.'}
              </div>
              {!searchTerm && (
                <Button className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Engagement
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Consultant</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>End Client</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Bill Rate</TableHead>
                    <TableHead>Pay Rate</TableHead>
                    <TableHead>Load%</TableHead>
                    <TableHead>Margin/hr</TableHead>
                    <TableHead>Margin%</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Total Margin</TableHead>
                    <TableHead>Total Comm</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEngagements.map((engagement) => (
                    <TableRow key={engagement.id}>
                      <TableCell className="font-medium">{engagement.consultant_name}</TableCell>
                      <TableCell>{engagement.client}</TableCell>
                      <TableCell>{engagement.end_client || '-'}</TableCell>
                      <TableCell>
                        {format(new Date(engagement.start_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>{formatCurrency(engagement.bill_rate)}</TableCell>
                      <TableCell>{formatCurrency(engagement.pay_rate)}</TableCell>
                      <TableCell>{engagement.load_percent}%</TableCell>
                      <TableCell className={cn(
                        engagement.margin_percent > 20 ? "text-green-600" : 
                        engagement.margin_percent > 10 ? "text-yellow-600" : "text-red-600"
                      )}>
                        {formatCurrency(engagement.margin_per_hour)}
                      </TableCell>
                      <TableCell className={cn(
                        engagement.margin_percent > 20 ? "text-green-600" : 
                        engagement.margin_percent > 10 ? "text-yellow-600" : "text-red-600"
                      )}>
                        {engagement.margin_percent.toFixed(1)}%
                      </TableCell>
                      <TableCell>{formatNumber(engagement.hours)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(engagement.total_margin)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(engagement.total_commission)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{engagement.commission_cycle}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          {engagement.recruiter_name && (
                            <div>R: {engagement.recruiter_name} ({engagement.recruiter_split_percent}%)</div>
                          )}
                          {engagement.recruitment_lead_name && (
                            <div>RL: {engagement.recruitment_lead_name} ({engagement.recruitment_lead_split_percent}%)</div>
                          )}
                          {engagement.sales_name && (
                            <div>S: {engagement.sales_name} ({engagement.sales_split_percent}%)</div>
                          )}
                          {engagement.sales_lead_name && (
                            <div>SL: {engagement.sales_lead_name} ({engagement.sales_lead_split_percent}%)</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Edit Engagement</DialogTitle>
                              </DialogHeader>
                              <div className="text-center py-8">
                                <p className="text-muted-foreground">Edit functionality coming soon...</p>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(engagement.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Engagement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this engagement? This action cannot be undone and will permanently remove all associated commission calculations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => engagementToDelete && handleDeleteEngagement(engagementToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CommissionEngagements;
