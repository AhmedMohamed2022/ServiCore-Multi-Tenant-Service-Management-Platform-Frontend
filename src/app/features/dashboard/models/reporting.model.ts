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

// ---------------------------------------------------------------------------
// GET /reports/tickets — TicketStatisticsDto
// ---------------------------------------------------------------------------

export interface TicketStatusStatisticData {
  status: number; // TicketStatus enum value (New=1 .. Closed=6)
  count: number;
}

export interface TicketPriorityStatisticData {
  priority: number; // TicketPriority enum value (Low=1 .. Critical=4)
  count: number;
}

export interface CategoryTicketStatisticData {
  categoryId: string;
  categoryName: string;
  ticketCount: number;
}

export interface TicketStatisticsResponse {
  statusDistribution: TicketStatusStatisticData[];
  priorityDistribution: TicketPriorityStatisticData[];
  categoryDistribution: CategoryTicketStatisticData[];
  performance: PerformanceData;
}

// ---------------------------------------------------------------------------
// GET /reports/teams — TeamStatisticsDto[]
// ---------------------------------------------------------------------------

export interface TeamStatisticsData {
  teamId: string;
  teamName: string;
  memberCount: number;
  totalTickets: number;
  activeTickets: number;
  resolvedTickets: number;
  closedTickets: number;
}

// ---------------------------------------------------------------------------
// GET /reports/agents — AgentStatisticsDto[]
// ---------------------------------------------------------------------------

export interface AgentStatisticsData {
  agentId: string;
  agentUserName: string;
  assignedTickets: number;
  activeTickets: number;
  resolvedTickets: number;
  closedTickets: number;
}

// ---------------------------------------------------------------------------
// GET /reports/customers — CustomerStatisticsDto[]
// ---------------------------------------------------------------------------

export interface CustomerStatisticsData {
  customerId: string;
  customerName: string;
  totalTickets: number;
  activeTickets: number;
  resolvedTickets: number;
  closedTickets: number;
}

// ---------------------------------------------------------------------------
// GET /reports/categories — CategoryStatisticsDto[]
// ---------------------------------------------------------------------------

export interface CategoryStatisticsData {
  categoryId: string;
  categoryName: string;
  totalTickets: number;
  activeTickets: number;
  resolvedTickets: number;
  closedTickets: number;
}

// ---------------------------------------------------------------------------
// GET /reports/tickets/time-series — TicketTimeSeriesDto[]
// ---------------------------------------------------------------------------

export interface TicketTimeSeriesPointData {
  date: string;
  totalTickets: number;
  newTickets: number;
  openTickets: number;
  inProgressTickets: number;
  waitingForCustomerTickets: number;
  resolvedTickets: number;
  closedTickets: number;
}
