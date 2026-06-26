"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

export function VerifyButtons({ questionId }: { questionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  async function update(action: "approve" | "reject") {
    setLoading(action);
    await fetch(`/api/admin/questions/${questionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="secondary"
        loading={loading === "approve"}
        onClick={() => update("approve")}
        className="text-[var(--success)] border-[var(--success)] hover:bg-[var(--success-bg)]"
      >
        <Check size={13} /> Approve
      </Button>
      <Button
        size="sm"
        variant="destructive"
        loading={loading === "reject"}
        onClick={() => update("reject")}
      >
        <X size={13} /> Reject
      </Button>
    </div>
  );
}
