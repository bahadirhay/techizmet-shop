import { GoogleSwgBlogScripts } from "@/components/store/GoogleSwgBlogScripts";

export default function BlogNewsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GoogleSwgBlogScripts />
      {children}
    </>
  );
}
