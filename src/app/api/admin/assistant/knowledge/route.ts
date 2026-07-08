import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const entryType = url.searchParams.get("entryType")?.trim();
  const q = url.searchParams.get("q")?.trim().toLocaleLowerCase("tr");

  const rows = await prisma.assistantKnowledgeEntry.findMany({
    where: {
      siteId: auth.siteId,
      active: true,
      ...(entryType ? { entryType } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    take: 100,
    select: {
      id: true,
      entryType: true,
      title: true,
      body: true,
      channel: true,
      sourceRef: true,
      imageUrl: true,
      updatedAt: true,
    },
  });

  const filtered = q
    ? rows.filter(
        (r) =>
          r.title.toLocaleLowerCase("tr").includes(q) ||
          r.body.toLocaleLowerCase("tr").includes(q),
      )
    : rows;

  return NextResponse.json({ entries: filtered });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as {
    entryType?: string;
    title?: string;
    body?: string;
    keywords?: string;
    channel?: string;
  };

  const title = body.title?.trim();
  const text = body.body?.trim();
  if (!title || !text) {
    return NextResponse.json({ error: "title ve body gerekli" }, { status: 400 });
  }

  const entry = await prisma.assistantKnowledgeEntry.create({
    data: {
      siteId: auth.siteId,
      entryType: body.entryType?.trim() || "custom",
      title,
      body: text,
      keywords: body.keywords?.trim() || undefined,
      channel: body.channel?.trim() || "*",
      active: true,
    },
  });

  return NextResponse.json({ entry });
}

export async function PUT(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as {
    id?: string;
    title?: string;
    body?: string;
    keywords?: string;
    channel?: string;
  };
  if (!body.id) {
    return NextResponse.json({ error: "id gerekli" }, { status: 400 });
  }
  const title = body.title?.trim();
  const text = body.body?.trim();
  if (!title || !text) {
    return NextResponse.json({ error: "title ve body gerekli" }, { status: 400 });
  }

  const result = await prisma.assistantKnowledgeEntry.updateMany({
    where: { id: body.id, siteId: auth.siteId },
    data: {
      title,
      body: text,
      keywords: body.keywords?.trim() || null,
      ...(body.channel?.trim() ? { channel: body.channel.trim() } : {}),
    },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "id gerekli" }, { status: 400 });
  }
  await prisma.assistantKnowledgeEntry.deleteMany({
    where: { id, siteId: auth.siteId },
  });
  return NextResponse.json({ ok: true });
}
