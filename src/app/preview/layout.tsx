import "@/app/globals.css";

/** Admin sayfa editörü — vitrin teması ile tam genişlik önizleme */
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--kn-bg,#fafafa)] text-[var(--kn-text,#111)]">{children}</div>
  );
}
