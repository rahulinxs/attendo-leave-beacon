import React, { useState, useEffect } from 'react';
import { CommissionProvider } from '@/contexts/CommissionContext';
import CommissionDashboard from './CommissionDashboard';
import CommissionCalculator from './CommissionCalculator';
import CommissionEngagements from './CommissionEngagements';
import CommissionSplits from './CommissionSplits';
import CommissionReports from './CommissionReports';

interface CommissionIndexProps {
  initialTab?: string;
  onNavigate?: (tab: string) => void;
}

const CommissionIndex: React.FC<CommissionIndexProps> = ({ initialTab = 'dashboard', onNavigate }) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Update activeTab when initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onNavigate?.(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <CommissionDashboard onNavigate={handleTabChange} />;
      case 'commission-calculator':
        return <CommissionCalculator />;
      case 'commission-engagements':
        return <CommissionEngagements />;
      case 'commission-splits':
        return <CommissionSplits />;
      case 'commission-report':
        return <CommissionReports />;
      default:
        return <CommissionDashboard onNavigate={handleTabChange} />;
    }
  };

  return (
    <CommissionProvider>
      {renderContent()}
    </CommissionProvider>
  );
};

export default CommissionIndex;
