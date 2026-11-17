export type Role = "OWNER" | "ADMIN" | "MEMBER";

export interface Org {
  id: string;
  slug: string;
  name: string;
  industry: string;
  description: string;
  template: string;
  logoUrl: string | null;
  objectives: string;
  published: boolean;
  treasuryAddress: string | null;
  createdAt: string;
  role?: Role;
  policy?: Policy | null;
  _count?: { agents: number; tasks: number };
}

export interface Policy {
  approvalThreshold: string;
  dailySpendCap: string;
  maxAgentRunCostMicros: number;
  requireHiringApproval: boolean;
  delegatedSpendPaused: boolean;
}

export interface Agent {
  id: string;
  orgId: string;
  name: string;
  role: string;
  department: string;
  description: string;
  provider?: string;
  model: string;
  effort?: string;
  systemPrompt?: string;
  tools: string[];
  isOrchestrator: boolean;
  spendLimit?: string;
  status: "IDLE" | "RUNNING" | "PAUSED";
  isPublic?: boolean;
  tasksCompleted: number;
  tasksFailed: number;
  costMicros?: number;
  createdAt: string;
}

export type TaskStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "QUEUED"
  | "RUNNING"
  | "WAITING_ON_DEPENDENCY"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface Task {
  id: string;
  orgId: string;
  projectId: string | null;
  agentId: string | null;
  parentTaskId: string | null;
  title: string;
  instructions: string;
  status: TaskStatus;
  output: string | null;
  error: string | null;
  attempts: number;
  costMicros: number;
  inputTokens: number;
  outputTokens: number;
  isMock: boolean;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  agent?: { id: string; name: string; role?: string } | null;
  executions?: Execution[];
}

export interface Execution {
  id: string;
  model: string;
  status: string;
  inputTokens: number;
  outputTokens: number;
  costMicros: number;
  turns: number;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface Project {
  id: string;
  orgId: string;
  title: string;
  objective: string;
  status: "PLANNING" | "ACTIVE" | "COMPLETED" | "FAILED" | "CANCELLED";
  orderId: string | null;
  createdAt: string;
  taskCount?: number;
  completedCount?: number;
  costMicros?: number;
}

export interface AgentMessage {
  id: string;
  taskId: string | null;
  fromAgentId: string | null;
  toAgentId: string | null;
  kind: string;
  content: string;
  createdAt: string;
}

export interface Deliverable {
  id: string;
  taskId: string | null;
  orderId: string | null;
  title: string;
  content: string;
  contentHash: string;
  isMock: boolean;
  createdAt: string;
}

export interface Approval {
  id: string;
  orgId: string;
  agentId: string | null;
  taskId: string | null;
  action: string;
  reason: string;
  amount: string | null;
  destination: string | null;
  consequences: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" | "EXPIRED";
  expiresAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
  agent?: { id: string; name: string; role: string } | null;
}

export interface Reputation {
  verifiedJobs: number;
  verifiedTestnetJobs: number;
  unverifiedJobs: number;
  disputes: number;
  deliverySuccessRate: number | null;
  averageRating: number | null;
  ratingCount: number;
  repeatCustomers: number;
}

export interface Listing {
  id: string;
  orgId: string;
  agentId: string | null;
  title: string;
  category: string;
  description: string;
  priceUnits: string;
  inputFormat: string;
  outputFormat: string;
  deliveryHours: number;
  active: boolean;
  createdAt: string;
  org?: { id: string; name: string; slug: string; logoUrl: string | null; description?: string };
  agent?: { id: string; name: string; role: string } | null;
  reputation?: Reputation;
  _count?: { orders: number };
}

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string | null;
  escrowAddress: `0x${string}` | null;
  businessRegistryAddress: `0x${string}` | null;
  settlementToken: { symbol: string; address: `0x${string}`; decimals: number } | null;
  platformFeeBps: number;
}

export interface Meta {
  chain: ChainConfig;
  escrowReady: boolean;
  providerConfigured: boolean;
  mockMode: boolean;
  categories: string[];
  features: Record<string, string>;
}

export type OrderStatus = "AWAITING_FUNDING" | "FUNDED" | "IN_PROGRESS" | "DELIVERED" | "ACCEPTED" | "DISPUTED" | "REFUNDED" | "CANCELLED";

export interface Order {
  id: string;
  listingId: string;
  buyerUserId: string;
  buyerAddress: `0x${string}`;
  buyerOrgId: string | null;
  sellerOrgId: string;
  sellerAddress: `0x${string}`;
  amountUnits: string;
  feeUnits: string;
  requirements: string;
  status: OrderStatus;
  chainId: number;
  escrowAddress: `0x${string}` | null;
  escrowOrderId: `0x${string}`;
  fundTxHash: string | null;
  releaseTxHash: string | null;
  deadline: string;
  isTest: boolean;
  createdAt: string;
  listing?: Listing;
  sellerOrg?: { id?: string; name: string; slug: string };
  deliverables?: Deliverable[];
  receipt?: { txHash: string; blockNumber: string; amountUnits: string; feeUnits: string; payer: string; payee: string; createdAt: string } | null;
  dispute?: { reason: string; status: string } | null;
  review?: { rating: number; comment: string; verified: boolean } | null;
}

export interface ActivityEvent {
  id: number;
  orgId: string;
  type: string;
  summary: string;
  data: Record<string, unknown> | null;
  createdAt: string;
}
