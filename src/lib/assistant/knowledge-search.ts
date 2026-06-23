import { prisma } from "@/lib/prisma";
import type { AssistantChannel, KnowledgeHit } from "@/lib/assistant/types";

function tokenizeQuery(query: string): string[] {
  return query
    .toLocaleLowerCase("tr")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function scoreEntry(
  tokens: string[],
  title: string,
  body: string,
  keywords: string | null | undefined,
): number {
  if (!tokens.length) return 0;
  const haystack = `${title} ${body} ${keywords ?? ""}`.toLocaleLowerCase("tr");
  let hits = 0;
  let titleHits = 0;
  const titleLower = title.toLocaleLowerCase("tr");
  for (const token of tokens) {
    if (haystack.includes(token)) hits += 1;
    if (titleLower.includes(token)) titleHits += 1;
  }
  if (!hits) return 0;
  const coverage = hits / tokens.length;
  const titleBoost = titleHits > 0 ? 0.25 : 0;
  return Math.min(1, coverage * 0.75 + titleBoost);
}

export async function searchAssistantKnowledge(
  siteId: string,
  query: string,
  channel: AssistantChannel,
  limit = 5,
): Promise<KnowledgeHit[]> {
  const tokens = tokenizeQuery(query);
  if (!tokens.length) return [];

  const entries = await prisma.assistantKnowledgeEntry.findMany({
    where: {
      siteId,
      active: true,
      OR: [{ channel: "*" }, { channel }],
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    take: 500,
  });

  const scored = entries
    .map((e) => ({
      id: e.id,
      entryType: e.entryType as KnowledgeHit["entryType"],
      title: e.title,
      body: e.body,
      score: scoreEntry(tokens, e.title, e.body, e.keywords),
      imageUrl: e.imageUrl,
      sourceRef: e.sourceRef,
    }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

export function formatKnowledgeReply(hits: KnowledgeHit[]): string {
  if (!hits.length) return "";
  const top = hits[0]!;
  if (hits.length === 1) {
    return `${top.body.trim()}`;
  }
  const lines = hits.slice(0, 3).map((h, i) => `${i + 1}. ${h.title}: ${h.body.trim().slice(0, 280)}`);
  return lines.join("\n\n");
}
