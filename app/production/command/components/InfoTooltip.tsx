"use client";

import React, { useState } from 'react';
import InfoDrawer from './InfoDrawer';

interface InfoTooltipProps {
  title: string;
  description: string;
  details?: string[];
}

/**
 * Info button component for section descriptions
 * Opens a right-side drawer with detailed information
 */
const InfoTooltip: React.FC<InfoTooltipProps> = ({
  title,
  description,
  details = []
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-1.5 rounded-full text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
        aria-label={`Info about ${title}`}
        title="Click for more info"
      >
        <i className="ri-information-line text-sm" />
      </button>

      <InfoDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        description={description}
        details={details}
      />
    </>
  );
};

export default InfoTooltip;

/**
 * Section info definitions for each dashboard zone
 */
export const SECTION_INFO = {
  alerts: {
    title: 'Alerts & Warnings',
    description: 'Critical and warning alerts that need immediate attention. These are automatically generated based on production thresholds and help you identify issues before they become bigger problems.',
    details: [
      'Floor backlog > 3 days triggers warning alert',
      'Floor backlog > 7 days triggers critical alert',
      'Idle machines with no queue assigned',
      'Open M2 repair items exceeding 500 pairs',
      'Quality issues requiring immediate intervention',
      'Click on any alert to navigate to the relevant page'
    ]
  },
  kpis: {
    title: 'Key Performance Indicators',
    description: 'Real-time snapshot of the most important production metrics. These numbers update automatically and give you an instant overview of production health.',
    details: [
      'WIP Pairs: Total work-in-progress across all 12 floors',
      'Output Today: Pairs dispatched via STN (Stock Transfer Note) today',
      'First Pass Yield: Percentage of items passing QC on first attempt',
      'Machine Utilization: Percentage of active machines that have work assigned',
      'Open Orders: Count of Pending + In Progress production orders',
      'Ready to Dispatch: Pairs in dispatch floor awaiting STN creation'
    ]
  },
  orderFunnel: {
    title: 'Order Status Distribution',
    description: 'Visual breakdown of all production orders by their current status. This helps identify bottlenecks in order processing and shows the flow of orders through the system.',
    details: [
      'Pending: Orders created but not yet started',
      'In Progress: Orders actively being produced on the floor',
      'Completed: Orders that have been fully dispatched',
      'On Hold: Orders paused for various reasons (yarn, machine, quality)',
      'Short Close: Orders partially completed and closed early',
      'Cancelled: Orders that were terminated before completion'
    ]
  },
  floors: {
    title: 'Floor Status Heatstrip',
    description: 'This is the most important view on the dashboard. It shows a comprehensive status of all 12 production floors with color coding to instantly identify bottlenecks and problem areas.',
    details: [
      'Green border: Healthy floor (< 1 day backlog)',
      'Yellow border: Watch this floor (1-3 days backlog)',
      'Orange border: High backlog (3-7 days)',
      'Red border: Critical backlog (> 7 days) - needs immediate attention',
      'WIP column shows current work-in-progress pairs',
      'Backlog Days calculated from: WIP ÷ 7-day average throughput',
      'Click any floor row to drill down to that floor\'s detail page'
    ]
  },
  throughput: {
    title: 'Daily Output Trend',
    description: 'Historical view of pairs dispatched over time. This helps identify production patterns, seasonal variations, and capacity utilization trends.',
    details: [
      'Shows daily dispatch quantities as an area chart',
      'STN (Stock Transfer Note) count per day',
      'Average daily output calculated automatically',
      'Total output for selected date range',
      'Use date filter to change the time period',
      'Useful for identifying weekly patterns and capacity planning'
    ]
  },
  quality: {
    title: 'Quality Metrics',
    description: 'Quality control performance across all QC floors (Checking, Secondary Checking, Final Checking). Tracks defect rates, repair success, and overall quality health.',
    details: [
      'FPY (First Pass Yield): Percentage passing QC first time',
      'M1 (Good): Items that pass quality check and move forward',
      'M2 (Repair): Items sent for repair - can be recovered',
      'M3 (Seconds): Downgraded items sold as seconds',
      'M4 (Reject): Scrapped items - total loss',
      'M2 Recovery Rate: Percentage of M2 items successfully repaired',
      'Open M2 count shows items still waiting for repair'
    ]
  },
  machines: {
    title: 'Machine Utilization',
    description: 'Knitting machine status and queue depth analysis. Helps identify overloaded machines that need load balancing and idle machines that need work assignment.',
    details: [
      'Queue depth (pending pairs) per machine',
      'Days of Queue: Pending pairs ÷ daily capacity',
      'Active: Machines currently running production',
      'Idle: Machines available but not running',
      'Maintenance: Machines under maintenance',
      'Overloaded: Machines with > 7 days of queue (red highlight)',
      'Starved: Active machines with no queue assigned (amber highlight)',
      'Maintenance Due: Machines requiring maintenance soon'
    ]
  },
  people: {
    title: 'People Performance',
    description: 'Output metrics grouped by supervisor, shift, or user. Helps identify top performers, compare team productivity, and track shift-wise production.',
    details: [
      'Output quantity ranking by supervisor',
      'Switch between Supervisor / Shift / User views',
      'Total output across all personnel',
      'Top performer highlighted',
      'Action count shows number of log entries',
      'Data sourced from ArticleLog entries',
      'Filtered by selected date range'
    ]
  },
  ageing: {
    title: 'Order Ageing',
    description: 'Age distribution of open orders based on their last activity date. Identifies orders that have been stuck too long in the system and may need intervention.',
    details: [
      '0-7 days (Green): Healthy, recently active orders',
      '7-15 days (Yellow): Watch - may need attention',
      '15-30 days (Orange): Stale - likely stuck somewhere',
      '30+ days (Red): Critical - needs immediate investigation',
      'Age calculated from last update timestamp',
      'Only shows Pending and In Progress orders',
      'Total count helps assess overall order health'
    ]
  },
  yarn: {
    title: 'Yarn Readiness',
    description: 'Cross-module visibility into yarn availability. Shows machine queue items that are blocked because yarn has not been issued yet.',
    details: [
      'Count of yarn-blocked machine queue items',
      'Items waiting for yarn issue before production can start',
      'Green (All Clear): No items blocked for yarn',
      'Amber: Some items blocked - needs attention',
      'Red (> 10): Many items blocked - critical',
      'Links to yarn module for taking action',
      'Links to knitting queue to see affected items'
    ]
  },
  articles: {
    title: 'Article Performance',
    description: 'Ranking of articles (products) by production metrics. Identify best performing articles and those with quality issues.',
    details: [
      'Sort by Volume: Highest dispatch quantity first',
      'Sort by Defects: Highest defect rate first',
      'Dispatched: Total pairs dispatched for this article',
      'Received: Total pairs received at Final Checking',
      'M1: Total pairs that passed Final Checking',
      'Defect Rate: (Received - M1) / Received × 100%',
      'Green badge: < 2% defects (excellent)',
      'Amber badge: 2-5% defects (acceptable)',
      'Red badge: > 5% defects (needs attention)'
    ]
  },
  exceptions: {
    title: 'Exception Worklist',
    description: 'Actionable list of items requiring immediate attention. Each tab shows a different type of exception that needs to be resolved.',
    details: [
      'Stalled: Orders with no movement in 7+ days',
      'Idle Machines: Active machines with no queue assigned',
      'Yarn Blocked: Queue items waiting for yarn issue',
      'Aged M2: Open repair items that are too old',
      'Data Issues: Quantity mismatches and data integrity problems',
      'Click View to navigate to the item',
      'Pagination available for large lists',
      'Green checkmark shown when tab has no exceptions'
    ]
  },
  reconciliation: {
    title: 'Quantity Reconciliation',
    description: 'Identity check to ensure all planned quantities are accounted for. This formula should always balance: Planned = Dispatched + WIP + M3 + M4 + Unaccounted.',
    details: [
      'Planned: Total planned quantity across all articles',
      'Dispatched: Pairs successfully dispatched via STN',
      'WIP: Pairs currently in production (all floors)',
      'M3 Out: Pairs sent out as seconds',
      'M4 Out: Pairs rejected/scrapped',
      'Unaccounted: Planned - (Dispatched + WIP + M3 + M4)',
      'Healthy (Green): Unaccounted is near zero (< 0.5%)',
      'Drift (Red): Significant unaccounted quantity indicates data issues',
      'Visual bar shows proportion of each category'
    ]
  }
};
