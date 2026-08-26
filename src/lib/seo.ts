import type { Metadata } from "next";

export function pageSeo(path: string, meta: Metadata = {}): Metadata {
  return {
    ...meta,
    alternates: {
      ...meta.alternates,
      canonical: path,
    },
    openGraph: {
      ...meta.openGraph,
      url: path,
    },
  };
}
