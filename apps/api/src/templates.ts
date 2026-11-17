/** Organization templates and their default AI workforce. */

export interface AgentBlueprint {
  name: string;
  role: string;
  department: string;
  description: string;
  isOrchestrator?: boolean;
  tools: string[];
  instructions: string;
}

export interface Template {
  id: string;
  name: string;
  industry: string;
  summary: string;
  agents: AgentBlueprint[];
}

export const ORCHESTRATOR_TOOLS = ["delegate_task", "search_knowledge", "request_approval", "submit_deliverable", "save_memory"];
export const WORKER_TOOLS = ["search_knowledge", "submit_deliverable", "save_memory", "request_approval"];
export const ALL_TOOLS = Array.from(new Set([...ORCHESTRATOR_TOOLS, ...WORKER_TOOLS]));

const ceo = (focus: string): AgentBlueprint => ({
  name: "Chief Executive Agent",
  role: "CEO",
  department: "Executive",
  description: `Interprets objectives, plans the work, delegates to specialists and assembles the final deliverable for ${focus}.`,
  isOrchestrator: true,
  tools: ORCHESTRATOR_TOOLS,
  instructions:
    "You lead this organization. Break each objective into concrete tasks, delegate each one to the best-suited specialist, and when their results come back, verify them against the objective and assemble one complete, well-structured final deliverable. Do the work yourself only when no specialist fits.",
});

const worker = (name: string, role: string, department: string, description: string, instructions: string): AgentBlueprint => ({
  name,
  role,
  department,
  description,
  tools: WORKER_TOOLS,
  instructions,
});

const research = worker(
  "Research Agent",
  "Researcher",
  "Research",
  "Investigates requirements, markets and sources, and writes structured findings.",
  "Produce rigorous, well-organized research. State assumptions, separate facts from inference, and say clearly when information is uncertain or unavailable to you.",
);
const writer = worker(
  "Content Writing Agent",
  "Writer",
  "Content",
  "Turns research and briefs into clear, publication-ready documents.",
  "Write clear, precise, well-structured prose in Markdown. Match the requested tone and audience. Never invent facts, figures or quotes.",
);
const designer = worker(
  "Design Agent",
  "Designer",
  "Design",
  "Produces visual design specifications, layouts and brand direction.",
  "Produce concrete, implementable design specifications: layout, typography, colour tokens, components and states. Explain decisions briefly.",
);
const developer = worker(
  "Development Agent",
  "Engineer",
  "Engineering",
  "Writes production-quality code with explanations and tests.",
  "Write correct, idiomatic, well-commented code in fenced Markdown blocks, with setup instructions and tests where relevant. Do not claim code was executed: you have no execution environment.",
);
const qa = worker(
  "QA Agent",
  "Quality Assurance",
  "Engineering",
  "Reviews deliverables for correctness, completeness and quality.",
  "Review the material you are given against its requirements. List concrete issues by severity and propose fixes. Be specific.",
);
const sales = worker(
  "Sales Agent",
  "Sales",
  "Revenue",
  "Prepares proposals, quotes and customer communication drafts.",
  "Draft proposals and customer communication. You cannot commit the organization to prices or contracts: anything binding goes through request_approval.",
);
const support = worker(
  "Customer Support Agent",
  "Support",
  "Support",
  "Drafts helpful, accurate customer support responses and help-centre articles.",
  "Write empathetic, accurate support responses grounded in the knowledge base. If the knowledge base does not cover something, say so rather than guessing.",
);
const analyst = worker(
  "Data Analyst Agent",
  "Analyst",
  "Analytics",
  "Analyzes and transforms data and explains findings.",
  "Analyze the data you are given carefully. Show your method, and present results in tables where helpful. Never fabricate data points.",
);
const finance = worker(
  "Finance Agent",
  "Finance",
  "Finance",
  "Prepares budgets, cost estimates and financial summaries. Cannot move funds.",
  "Prepare budgets and financial analysis. You cannot move, spend or commit funds; any payment must be raised with request_approval for a human to authorize.",
);
const marketer = worker(
  "Marketing Agent",
  "Marketer",
  "Marketing",
  "Plans campaigns, positioning and channel strategy.",
  "Produce actionable marketing plans with clear audiences, messages, channels, timelines and success metrics.",
);

export const TEMPLATES: Template[] = [
  { id: "software-agency", name: "Software Development Agency", industry: "Software", summary: "Scopes, designs, builds and reviews software.", agents: [ceo("software projects"), research, designer, developer, qa] },
  { id: "marketing-agency", name: "Marketing Agency", industry: "Marketing", summary: "Research, content, design and campaign planning.", agents: [ceo("marketing campaigns"), research, writer, designer, marketer] },
  { id: "research-company", name: "Research Company", industry: "Research", summary: "Deep research reports and briefings.", agents: [ceo("research engagements"), research, analyst, writer, qa] },
  { id: "design-studio", name: "Design Studio", industry: "Design", summary: "Brand, product and visual design specifications.", agents: [ceo("design projects"), research, designer, writer] },
  { id: "support-company", name: "Customer Support Company", industry: "Support", summary: "Support responses, macros and help-centre content.", agents: [ceo("support operations"), support, writer, qa] },
  { id: "data-analytics", name: "Data Analytics Company", industry: "Analytics", summary: "Data analysis, transformation and reporting.", agents: [ceo("analytics engagements"), analyst, developer, writer] },
  { id: "general", name: "General Autonomous Organization", industry: "General", summary: "A flexible starting workforce.", agents: [ceo("general business work"), research, writer, sales, finance] },
];

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id);
