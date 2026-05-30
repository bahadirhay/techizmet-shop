import Link from "next/link";
import { NewPageForm } from "@/components/admin/NewPageForm";

export default function NewPagePage() {
  return (
    <div>
      <Link href="/admin/pages" className="text-sm text-[var(--kn-brand)] underline">
        ← Sayfalar
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Yeni sayfa</h1>
      <p className="mt-1 text-sm text-zinc-500">Oluşturduktan sonra sürükle-bırak editöre yönlendirilirsiniz.</p>
      <div className="mt-6">
        <NewPageForm />
      </div>
    </div>
  );
}
