import type { NextConfig } from "next";

// Build provenance. Vercel sets these during a Git-triggered build, so this
// line states in the build log exactly which repository, branch and commit
// were compiled — which is otherwise guesswork when a deploy misbehaves.
console.log(
  "[build] repo=%s/%s branch=%s commit=%s",
  process.env.VERCEL_GIT_REPO_OWNER ?? "-",
  process.env.VERCEL_GIT_REPO_SLUG ?? "-",
  process.env.VERCEL_GIT_COMMIT_REF ?? "-",
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
);

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Stricter than the storefront's SAMEORIGIN: nothing should ever
          // frame the admin panel, so a clickjacking page cannot sit an
          // invisible copy of it under a decoy and harvest real clicks.
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // The catalogue and every customer order sit behind this login, so
          // keep it out of any cache between the server and the browser.
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
