"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteProduct } from "@/lib/actions/products";
import { button } from "@/lib/ui";

/**
 * Two-step delete. Deleting a product also removes its image from storage and
 * cannot be undone, so the first click only arms the button.
 */
export default function DeleteProductButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        title={`Delete ${name}`}
        className={button("ghost", "sm")}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">Delete {name}</span>
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <form action={deleteProduct}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" className={button("danger", "sm")}>
          Confirm
        </button>
      </form>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className={button("ghost", "sm")}
      >
        Cancel
      </button>
    </span>
  );
}
