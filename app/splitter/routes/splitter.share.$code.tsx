import { useEffect } from "react";
import { useOutletContext, useParams } from "react-router";
import type { Route } from "./+types/splitter.share.$code";
import { SplitterShell } from "~/splitter/components/SplitterShell";
import type { SplitterLayoutContext } from "~/splitter/routes/splitter.layout";
import type { Bill, SharedBill } from "~/splitter/types";
import { buildShareMeta } from "~/splitter/utils/shareMeta";
import { getSupabaseClient } from "~/utils/supabase.server";

const SHARED_TTL = 30 * 24 * 60 * 60 * 1000;
const SHARED_KEY = "splitter_shared_bills";
const NOT_FOUND = "This share link has expired or doesn't exist.";

interface ShareData {
  sharedBill: SharedBill | null;
  error?: string;
  /** The share is gone, as opposed to unreachable — only this evicts the cache. */
  notFound?: boolean;
}

/**
 * Link unfurlers (Discord, Slack, iMessage) read the head of the first
 * response and never run JavaScript, so the bill has to be resolved
 * server-side for a preview to say anything about it.
 *
 * `noindex` does the job the `Disallow` in robots.txt used to — a blanket
 * Disallow also stops the unfurlers, since they honor robots.txt too.
 */
export function meta({ data }: Route.MetaArgs) {
  const shared = data?.sharedBill;
  if (!shared) {
    return [
      { title: "Bill not found · Splitter" },
      { name: "description", content: NOT_FOUND },
      { name: "robots", content: "noindex" },
    ];
  }

  const { title, description } = buildShareMeta(shared.bill);
  return [
    { title: `${title} · Splitter` },
    { name: "robots", content: "noindex" },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Splitter" },
    { property: "og:title", content: title },
    { property: "og:url", content: shared.shareUrl },
    { name: "twitter:card", content: "summary" },
    // A bill with nobody on it has nothing to say here, and an empty
    // description tag makes some unfurlers render a blank line.
    ...(description
      ? [
          { name: "description", content: description },
          { property: "og:description", content: description },
        ]
      : []),
  ];
}

export async function loader({
  params,
  request,
  context,
}: Route.LoaderArgs): Promise<ShareData> {
  const { code } = params;
  const supabase = getSupabaseClient(context.cloudflare.env);
  const { data, error } = await supabase
    .from("bill_shares")
    .select("bill_json, receipt_path")
    .eq("id", code)
    .single();

  if (error || !data) {
    return { sharedBill: null, error: NOT_FOUND, notFound: true };
  }

  const bill = data.bill_json as Bill;
  const url = new URL(request.url);
  url.search = "";
  url.hash = "";
  const now = Date.now();
  return {
    sharedBill: {
      shareCode: code,
      shareUrl: url.href,
      bill: { ...bill, tax: bill.tax ?? 0, tip: bill.tip ?? 0 },
      cachedAt: now,
      expiresAt: now + SHARED_TTL,
      hasReceipt: !!data.receipt_path,
    },
  };
}

/**
 * Client-side navigations answer from the 30-day cache first, so opening a
 * bill from the sidebar is instant and works offline. Note this deliberately
 * does not hydrate: running on hydration would hand `meta` a client-only
 * loader with no data during the server render, and the unfurl tags with it.
 */
export async function clientLoader({
  params,
  serverLoader,
}: Route.ClientLoaderArgs): Promise<ShareData> {
  const { code } = params;

  try {
    const raw = localStorage.getItem(SHARED_KEY);
    const bills: SharedBill[] = raw ? JSON.parse(raw) : [];
    const cached = bills.find((b) => b.shareCode === code);
    if (cached && cached.expiresAt > Date.now()) {
      return { sharedBill: cached };
    }
  } catch {
    // fall through to the server
  }

  try {
    const data = await serverLoader();
    return data.sharedBill
      ? { sharedBill: { ...data.sharedBill, shareUrl: window.location.href } }
      : data;
  } catch {
    return { sharedBill: null, error: "Failed to load the shared bill." };
  }
}

export default function SplitterSharePage({
  loaderData,
}: Route.ComponentProps) {
  const { code } = useParams();
  const { store } = useOutletContext<SplitterLayoutContext>();
  const { saveSharedBill, removeSharedBill } = store;
  const { sharedBill, error, notFound } = loaderData;

  // Caching is a side effect of viewing, not of loading: the loader now runs
  // on the server, where localStorage doesn't exist. Writing through the store
  // (rather than straight to localStorage) also lands the bill in the sidebar
  // immediately instead of on the next mount.
  useEffect(() => {
    if (sharedBill) saveSharedBill(sharedBill);
    else if (notFound && code) removeSharedBill(code);
  }, [sharedBill, notFound, code, saveSharedBill, removeSharedBill]);

  return (
    <SplitterShell
      key={sharedBill?.shareCode ?? "error"}
      initialLocalBill={null}
      sharedBill={sharedBill}
      error={error}
    />
  );
}
