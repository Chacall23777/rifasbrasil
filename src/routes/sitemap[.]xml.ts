import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const base = new URL(request.url).origin;
        const staticPaths = ["/", "/auth"];
        const { data: rifas } = await supabase
          .from("rifas")
          .select("slug, updated_at")
          .eq("status", "ativa")
          .order("updated_at", { ascending: false })
          .limit(1000);

        const urls = [
          ...staticPaths.map((p) => `<url><loc>${base}${p}</loc></url>`),
          ...(rifas ?? []).map(
            (r) => `<url><loc>${base}/r/${r.slug}</loc><lastmod>${new Date(r.updated_at).toISOString()}</lastmod></url>`,
          ),
        ].join("");

        const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
