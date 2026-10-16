import type { MetadataRoute } from "next";

/**
 * The dashboard must never appear in a search result. It is password
 * protected, but an indexed admin login is an invitation to try the door.
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
