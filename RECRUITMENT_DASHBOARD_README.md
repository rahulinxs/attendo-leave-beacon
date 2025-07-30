# Recruitment Dashboard Module

## Overview

The Recruitment Dashboard Module is a comprehensive reporting and analytics system designed to track and visualize recruitment performance metrics. It leverages the existing Performance Report data structure to provide recruitment-focused insights and visualizations.

## Features

### 🎯 Key Metrics Dashboard
- **Total Applications**: Track the number of applications received (mapped from submissions)
- **Positions Open**: Monitor open positions across departments
- **Positions Filled**: Track successfully filled positions (mapped from starts)
- **Candidates Hired**: Count of successful hires (mapped from starts)
- **Average Time to Fill**: Average days to fill positions (estimated from activity)
- **Average Cost per Hire**: Average cost to hire a candidate (estimated from activity)

### 📊 Performance Metrics
- **Screening Rate**: Percentage of applications that pass initial screening (estimated)
- **Interview Rate**: Percentage of screened candidates who get interviews
- **Offer Acceptance Rate**: Percentage of offers that are accepted
- **Fill Rate**: Percentage of positions successfully filled

### 📈 Visual Analytics
1. **Recruitment Funnel**: Pie chart showing the flow from applications to hires
2. **Source Effectiveness**: Bar chart comparing different recruitment sources (Monster, Dice, LinkedIn)
3. **Recruiter Performance**: Bar chart showing recruiter productivity
4. **Time to Fill Trend**: Area chart tracking time to fill over time
5. **Cost per Hire by Recruiter**: Bar chart showing cost efficiency by recruiter

### 🔧 Data Management
- **Excel Import**: Import performance data from Excel files
- **Data Filtering**: Filter by period, team, or individual
- **Inline Editing**: Edit data directly in the table
- **Data Export**: Export filtered data for external analysis

## Components

### RecruitmentDashboard.tsx
The main dashboard component that displays:
- Key metrics cards (mapped from performance data)
- Performance indicators
- Interactive charts and visualizations
- Role-based access control

### RecruitmentReport.tsx
The comprehensive reporting interface that includes:
- Data filtering and period selection
- Excel import functionality
- Data table with inline editing
- Dashboard integration
- Import review and validation

## Data Mapping

The recruitment dashboard uses the existing `performance_reports` table and maps the data as follows:

### Performance Data → Recruitment Metrics
- `total_submissions` → `applications_received`
- `total_interviews` → `interviews_scheduled`
- `offers` → `offers_made`
- `starts` → `candidates_hired` / `positions_filled`
- `monster` → Monster job board activity
- `dice` → Dice job board activity
- `linkedin_profiles_viewed` → LinkedIn sourcing activity
- `linkedin_inmails_sent` → LinkedIn outreach activity
- `total_calls` → Phone screening activity

### Estimated Calculations
- **Screening Rate**: 60% of submissions (estimated)
- **Interview Completion Rate**: 80% of scheduled interviews (estimated)
- **Time to Fill**: Calculated based on submission to start ratio
- **Cost per Hire**: Base cost ($5000) + call costs ($50 per call)

## Access Control

### Roles with Access
- **Admin**: Full access to all features
- **Super Admin**: Full access to all features
- **Reporting Manager**: View and edit access

### Module Settings
The recruitment dashboard uses the same module setting as Performance Reports: `moduleSettings.performance_report_enabled`

## Usage

### Setting Up the Module

1. **Enable the Module**: Set `performance_report_enabled: true` in your company's module settings
2. **Import Performance Data**: Use the Excel import feature to add performance data
3. **View Recruitment Dashboard**: Access through "Recruitment Report" in the navigation

### Navigation
The recruitment report is accessible through:
- Main navigation menu → "Recruitment Report"
- Available to users with appropriate roles
- Hidden if the performance report module is not enabled

### Data Import Format
Excel files should include the following columns (same as Performance Report):
- Team
- USER NAME
- Monster
- Dice
- LinkedIn Profiles viewed
- LinkedIn InMails sent
- Total Calls
- Total Call Duration
- Total Submissions
- Total Interviews
- Offers
- Starts
- Placed
- Offered

## Technical Implementation

### Dependencies
- **React**: Frontend framework
- **Recharts**: Chart visualization library
- **Supabase**: Backend database and authentication
- **XLSX**: Excel file processing
- **Tailwind CSS**: Styling

### Key Features
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Data updates immediately after changes
- **Error Handling**: Comprehensive error handling and user feedback
- **Loading States**: Loading indicators for better UX
- **Toast Notifications**: User feedback for actions

### Performance Optimizations
- Uses existing database structure (no additional tables needed)
- Database indexes on frequently queried columns
- Efficient data processing and aggregation
- Optimized chart rendering

## Customization

### Adding New Metrics
1. Update the data mapping in `RecruitmentDashboard.tsx`
2. Add corresponding chart visualizations
3. Update the import/export functionality

### Styling
The dashboard uses Tailwind CSS classes and can be customized by:
- Modifying the color scheme in the COLORS array
- Adjusting card layouts and spacing
- Customizing chart themes
- Updating the overall design system

### Data Sources
The system can be extended to pull data from:
- ATS (Applicant Tracking System) APIs
- HRIS (Human Resources Information System) integrations
- Job board APIs
- Custom recruitment tools

## Troubleshooting

### Common Issues

1. **Module Not Visible**
   - Check if `performance_report_enabled` is true in company settings
   - Verify user has appropriate role permissions

2. **Import Errors**
   - Ensure Excel file has correct column headers
   - Check data types match expected format
   - Verify file is not corrupted

3. **Charts Not Loading**
   - Check if performance data exists
   - Verify data format is correct
   - Check browser console for JavaScript errors

4. **Permission Errors**
   - Verify user role has appropriate permissions
   - Check RLS policies are correctly configured
   - Ensure user is associated with a company

### Support
For technical support or feature requests, please refer to the main project documentation or contact the development team.

## Future Enhancements

### Planned Features
- **Advanced Analytics**: Predictive hiring analytics
- **Integration APIs**: Connect with external recruitment tools
- **Automated Reporting**: Scheduled report generation
- **Mobile App**: Native mobile application
- **Advanced Filtering**: More granular filtering options
- **Export Options**: PDF and other export formats

### Performance Improvements
- **Caching**: Implement data caching for better performance
- **Lazy Loading**: Load charts on demand
- **Virtual Scrolling**: For large datasets
- **Background Processing**: For data imports and exports 