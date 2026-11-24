"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { formatNGN } from "@/lib/currency";
import { formatUnlockDate } from "@/lib/dateFormat";
import type { ApiResponse } from "@/types";
import type { ReceiptData } from "@/server/services/transaction-history.service";
import styles from "./page.module.css";

async function fetchReceipt(giftId: string): Promise<ReceiptData> {
  const res = await fetch(`/api/v1/transactions/${encodeURIComponent(giftId)}/receipt`);
  const json: ApiResponse<ReceiptData> = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

/** Printable transaction receipt (issue #352). */
export default function ReceiptPage({ params }: { params: Promise<{ giftId: string }> }) {
  const { giftId } = use(params);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const { data, status } = useQuery({
    queryKey: ["receipt", giftId],
    queryFn: () => fetchReceipt(giftId),
  });

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareData = {
      title: "Lumigift Transaction Receipt",
      text: `Lumigift receipt for gift ${giftId}`,
      url,
    };

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        setShareStatus("Receipt shared.");
      } catch (err) {
        // User cancelled the share sheet — no need to surface an error.
        if (err instanceof DOMException && err.name === "AbortError") return;
        setShareStatus("Could not share the receipt.");
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("Receipt link copied to clipboard.");
    } catch {
      setShareStatus("Could not copy the receipt link.");
    }
  }

  if (status === "pending") {
    return (
      <div className="container">
        <p aria-busy="true">Loading receipt…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="container">
        <p role="alert">Failed to load this receipt.</p>
        <Link href="/dashboard">Back to dashboard</Link>
      </div>
    );
  }

  const rows: Array<[string, string]> = [
    ["Gift ID", data.giftId],
    ["Sender", data.senderName],
    ["Recipient", data.recipientName],
    ["Amount", `${formatNGN(data.amountNgn)} (${data.amountUsdc} USDC)`],
    ["Status", data.status],
    ["Payment provider", data.provider],
    ["Payment reference", data.providerReference],
    ["Created", formatUnlockDate(data.createdAt)],
    ["Completed", data.completedAt ? formatUnlockDate(data.completedAt) : "—"],
    ["Stellar tx hash", data.stellarTxHash ?? "—"],
  ];

  return (
    <div className={`container ${styles.page}`}>
      <div className={`${styles.actions} no-print`}>
        <Link href="/dashboard" className="btn btn--secondary">
          ← Back
        </Link>
        <button type="button" className="btn btn--primary" onClick={() => window.print()}>
          Print receipt
        </button>
        <button type="button" className="btn btn--secondary" onClick={handleShare}>
          Share receipt
        </button>
      </div>

      {shareStatus && (
        <p className="no-print" role="status">
          {shareStatus}
        </p>
      )}

      <article className={`${styles.receipt} print-receipt`} aria-labelledby="receipt-title">
        <header className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">
            L
          </span>
          <div>
            <p className={styles.brandName}>Lumigift</p>
            <h1 id="receipt-title" className={styles.title}>
              Transaction Receipt
            </h1>
          </div>
        </header>

        <dl className={styles.details}>
          {rows.map(([label, value]) => (
            <div key={label} className={styles.row}>
              <dt>{label}</dt>
              <dd className={label === "Stellar tx hash" ? styles.hash : undefined}>{value}</dd>
            </div>
          ))}
        </dl>

        <footer className={styles.contact}>
          <p>Lumigift · www.lumigift.com</p>
          <p>Questions? Contact support@lumigift.com</p>
        </footer>
      </article>
    </div>
  );
}
