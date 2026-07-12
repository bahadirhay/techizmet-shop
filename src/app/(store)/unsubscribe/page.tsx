import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe-token";

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const decoded = token ? verifyUnsubscribeToken(token) : null;

  if (!decoded) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Geçersiz bağlantı</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Bu abonelikten çıkma bağlantısı geçersiz veya hasarlı görünüyor.
        </p>
      </div>
    );
  }

  const { siteId, email } = decoded;
  await prisma.emailSuppression.upsert({
    where: { siteId_email: { siteId, email } },
    update: {},
    create: { siteId, email, reason: "unsubscribe" },
  });

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Abonelikten çıktınız</h1>
      <p className="mt-2 text-sm text-zinc-600">
        <strong>{email}</strong> adresi, sepet hatırlatma e-postalarından çıkarıldı. Sipariş
        durumu e-postalarınız (onay, kargo vb.) bundan etkilenmez.
      </p>
    </div>
  );
}
