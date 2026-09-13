export interface ReportDateRangeRequest {
  from?: string;
  to?: string;
}

export interface TicketOverviewData {
  totalTickets: number;
  newTickets: number;
  openTickets: number;
  inProgressTickets: number;
  waitingForCustomerTickets: number;
  resolvedTickets: number;
  closedTickets: number;
}

export interface PriorityStatisticsData {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface PerformanceData {
  resolvedCount: number;
  closedCount: number;
  averageResolutionTime: string; // e.g., "02:48:48"
  averageClosureTime: string; // e.g., "02:52:06"
}

export interface OrganizationCountsData {
  totalCustomers: number;
  totalCategories: number;
  totalTeams: number;
  totalAgents: number;
}

// Complete interface mirror of your real backend response envelope
export interface DashboardOverviewResponse {
  ticketOverview: TicketOverviewData;
  priorityStatistics: PriorityStatisticsData;
  performance: PerformanceData;
  organizationCounts: OrganizationCountsData;
}
