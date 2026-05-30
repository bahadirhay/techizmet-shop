import { prisma } from "@/lib/prisma";

type CountArgs = { where?: Record<string, unknown> };

export async function safeCount(
  model: string,
  args: CountArgs = {},
): Promise<number> {
  const delegate = (prisma as unknown as Record<string, { count?: (a: CountArgs) => Promise<number> } | undefined>)[
    model
  ];
  if (typeof delegate?.count !== "function") return 0;
  try {
    return await delegate.count(args);
  } catch {
    return 0;
  }
}
