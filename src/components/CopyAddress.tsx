"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { button } from "@/lib/ui";

/**
 * Copies the address as one block, formatted the way it goes onto a shipping
 * label — so staff can paste it straight into a courier form.
 */
export default function CopyAddress({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (insecure origin, or the user denied it) — leave the
      // button alone rather than claiming a copy that did not happen.
      setCopied(false);
    }
  }

  return (
    <button type="button" onClick={copy} className={button("subtle", "sm")}>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-good" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {copied ? "Copied" : "Copy address"}
    </button>
  );
}
