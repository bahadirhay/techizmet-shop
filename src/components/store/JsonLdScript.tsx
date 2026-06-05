/** JSON-LD — arama motorları için yapılandırılmış veri */

export function JsonLdScript({
  data,
}: {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload.length === 1 ? payload[0] : payload) }}
    />
  );
}
