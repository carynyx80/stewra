import { prisma } from "./db.js";

/**
 * Organization knowledge retrieval. This release uses keyword scoring inside the
 * organization's own documents (strict org isolation). Vector search with pgvector
 * is planned; the interface stays the same.
 */
export async function searchKnowledge(orgId: string, query: string, limit = 4) {
  const terms = query.toLowerCase().split(/\W+/).filter((t) => t.length > 2).slice(0, 12);
  if (!terms.length) return [];
  const docs = await prisma.knowledgeDocument.findMany({ where: { orgId }, take: 200, orderBy: { createdAt: "desc" } });
  const scored: { title: string; snippet: string; score: number }[] = [];
  for (const doc of docs) {
    const paragraphs = doc.content.split(/\n\s*\n/);
    for (const p of paragraphs) {
      const lower = p.toLowerCase();
      const score = terms.reduce((s, t) => s + (lower.includes(t) ? 1 : 0), 0);
      if (score > 0) scored.push({ title: doc.title, snippet: p.slice(0, 1200), score });
    }
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
