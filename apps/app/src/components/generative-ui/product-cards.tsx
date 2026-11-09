"use client";

import { z } from "zod";

// Estore adaptation: deterministic product cards rendered from the search_products
// tool result. The model never writes HTML for these.
export const SearchProductsParams = z.object({
  query: z.string().optional(),
  limit: z.number().optional(),
  max_price: z.number().nullable().optional(),
  min_price: z.number().nullable().optional(),
});

type Product = {
  id?: string;
  name?: string;
  price?: number;
  brand?: string;
  category?: string;
  rating?: number;
  ratingCount?: number;
  image?: string;
  link?: string;
};

const safeUrl = (url?: string) =>
  typeof url === "string" && /^https?:\/\//i.test(url) ? url : undefined;

// Ask Cloudinary for a small, auto-format image.
const smallImage = (url?: string) => {
  const u = safeUrl(url);
  if (!u) return undefined;
  if (!u.includes("res.cloudinary.com") || !u.includes("/upload/")) return u;
  return u.replace("/upload/", "/upload/f_auto,q_auto,w_360,c_limit/");
};

const usd = (n?: number) =>
  typeof n === "number"
    ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
    : "";

// The tool result may arrive as an object or as a JSON string.
const parseResult = (result: unknown): { products: Product[]; error?: string } => {
  let value: unknown = result;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return { products: [] };
    }
  }
  const obj = (value ?? {}) as { products?: Product[]; error?: string };
  return {
    products: Array.isArray(obj.products) ? obj.products : [],
    error: typeof obj.error === "string" ? obj.error : undefined,
  };
};

export function ProductCards({
  status,
  result,
}: {
  status?: string;
  result?: unknown;
}) {
  if (status !== "complete") {
    return (
      <div style={{ fontSize: 13, color: "#6b7186", padding: "6px 0" }}>
        Searching the Estore catalog…
      </div>
    );
  }
  const { products, error } = parseResult(result);
  if (error) {
    return <div role="alert" style={{ fontSize: 13, color: "#b42318" }}>{error}</div>;
  }
  if (!products.length) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        overflowX: "auto",
        padding: "8px 2px",
        scrollSnapType: "x proximity",
      }}
    >
      {products.map((p, i) => {
        const image = smallImage(p.image);
        const link = safeUrl(p.link);
        return (
          <div
            key={p.id ?? i}
            style={{
              width: 190,
              flexShrink: 0,
              scrollSnapAlign: "start",
              border: "1px solid #e6e8ee",
              borderRadius: 12,
              overflow: "hidden",
              background: "#fff",
              color: "#1f2330",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ position: "relative", height: 120, background: "#f5f6f9" }}>
              {image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt={p.name ?? "Product"}
                  loading="lazy"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
            </div>
            <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 4, flexGrow: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.3 }}>{p.name}</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{usd(p.price)}</div>
              <div style={{ fontSize: 12, color: "#5f6577" }}>
                {[p.brand, p.category].filter(Boolean).join(" · ")}
                {p.rating ? ` · ★ ${p.rating}` : ""}
              </div>
              {link && (
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer noopener"
                  style={{ marginTop: "auto", paddingTop: 6, fontSize: 12.5, fontWeight: 600, color: "#5b5fc7" }}
                >
                  View product ↗
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
