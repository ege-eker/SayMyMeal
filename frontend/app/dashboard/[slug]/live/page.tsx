"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  getRestaurantBySlug,
  getDashboardStats,
  updateOrderStatus,
  updateRestaurant,
} from "@/lib/api";

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  pending: {
    label: "Pending",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
  },
  preparing: {
    label: "Preparing",
    bg: "bg-sky-50",
    text: "text-sky-700",
    dot: "bg-sky-400",
  },
  delivering: {
    label: "On the Way",
    bg: "bg-violet-50",
    text: "text-violet-700",
    dot: "bg-violet-400",
  },
  completed: {
    label: "Completed",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-400",
  },
  canceled: {
    label: "Canceled",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-400",
  },
};

const STATUS_OPTIONS = [
  "pending",
  "preparing",
  "delivering",
  "completed",
  "canceled",
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatCurrency(n: number) {
  return `\u00A3${n.toFixed(2)}`;
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                         */
/* ------------------------------------------------------------------ */
function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div
        className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-[0.07]"
        style={{ background: accent ?? "#d97706" }}
      />
      <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
        {label}
      </p>
      <p className="mt-1 font-[var(--font-geist-mono)] text-3xl font-bold tracking-tight text-stone-900">
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-xs text-stone-400">{sub}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Order Row                                                         */
/* ------------------------------------------------------------------ */
function OrderRow({
  order,
  isLongestWaiting,
  onStatusChange,
  loading,
}: {
  order: any;
  isLongestWaiting: boolean;
  onStatusChange: (id: string, status: string) => void;
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;

  return (
    <div
      className={`group rounded-xl border bg-white transition-all ${
        isLongestWaiting
          ? "border-red-300 shadow-[0_0_0_1px_rgba(239,68,68,0.15),0_4px_24px_-4px_rgba(239,68,68,0.18)]"
          : "border-stone-200/80 shadow-sm hover:shadow-md"
      }`}
    >
      {/* Red urgency stripe for longest waiting */}
      {isLongestWaiting && (
        <div className="h-1 w-full rounded-t-xl bg-gradient-to-r from-red-400 via-red-500 to-orange-400" />
      )}

      <div
        className={`flex cursor-pointer flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${
          isLongestWaiting ? "bg-red-50/40" : ""
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Left: ID + customer */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="shrink-0 rounded-lg bg-stone-100 px-2.5 py-1 font-[var(--font-geist-mono)] text-[11px] font-bold uppercase tracking-wider text-stone-500">
            #{order.id.slice(0, 8)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-stone-800">
              {order.customer}
            </p>
            <p className="text-xs text-stone-400">{order.phone}</p>
          </div>
        </div>

        {/* Right: time, status, total, dropdown */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span
            className={`text-xs font-medium tabular-nums ${
              isLongestWaiting ? "text-red-500 font-bold" : "text-stone-400"
            }`}
          >
            {timeAgo(order.createdAt)}
          </span>

          {/* Status badge */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>

          <span className="font-[var(--font-geist-mono)] text-sm font-bold text-stone-700">
            {formatCurrency(order.total)}
          </span>

          {/* Status changer */}
          <select
            value={order.status}
            disabled={loading}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              onStatusChange(order.id, e.target.value);
            }}
            className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-xs font-medium text-stone-600 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:opacity-50"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_CONFIG[s]?.label ?? s}
              </option>
            ))}
          </select>

          {/* Expand chevron */}
          <svg
            className={`h-4 w-4 text-stone-300 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Expanded items */}
      {expanded && (
        <div className="border-t border-stone-100 bg-stone-50/50 px-4 py-3">
          {order.items && order.items.length > 0 ? (
            <ul className="space-y-1">
              {order.items.map((item: any) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-stone-600">
                    <span className="font-medium text-stone-800">
                      {item.quantity}x
                    </span>{" "}
                    {item.food?.name ?? "Unknown"}
                    {item.selected?.length > 0 && (
                      <span className="ml-1 text-xs text-stone-400">
                        ({item.selected.map((s: any) => s.choiceLabel).join(", ")})
                      </span>
                    )}
                  </span>
                  {item.food?.basePrice != null && (
                    <span className="font-[var(--font-geist-mono)] text-xs text-stone-400">
                      {formatCurrency(item.food.basePrice * item.quantity)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-stone-400">No items</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Dashboard Page                                               */
/* ------------------------------------------------------------------ */
export default function LiveDashboardPage() {
  const { slug } = useParams();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const { data: restaurant, mutate: mutateRestaurant } = useSWR(
    slug ? `dashboard-restaurant-${slug}` : null,
    () => getRestaurantBySlug(slug as string)
  );
  const [completedExpanded, setCompletedExpanded] = useState(false);

  const restaurantId = restaurant?.id;

  const { data: stats, mutate } = useSWR(
    restaurantId ? `dashboard-stats-${restaurantId}` : null,
    () => getDashboardStats(restaurantId!),
    {
      refreshInterval: 5000,
      onSuccess: () => setLastUpdated(new Date()),
    }
  );

  // Tick "seconds ago" counter
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  const handleStatusChange = useCallback(
    async (id: string, status: string) => {
      setLoadingId(id);
      try {
        await updateOrderStatus(id, status);
        mutate();
      } finally {
        setLoadingId(null);
      }
    },
    [mutate]
  );

  const longestWaitingId = useMemo(() => {
    if (!stats?.activeOrders?.length) return null;
    return stats.activeOrders.reduce(
      (oldest: any, o: any) =>
        new Date(o.createdAt) < new Date(oldest.createdAt) ? o : oldest,
      stats.activeOrders[0]
    ).id;
  }, [stats]);

  const activeTotal = stats
    ? stats.statusCounts.pending +
      stats.statusCounts.preparing +
      stats.statusCounts.delivering
    : 0;

  if (!restaurant) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/${slug}`}
            className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              Live Dashboard
            </h1>
            <p className="text-sm text-stone-400">{restaurant.name}</p>
          </div>
          {/* Live indicator */}
          <span className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        </div>
        <p className="text-xs tabular-nums text-stone-400">
          Updated {secondsAgo}s ago
        </p>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Accepting Orders toggle */}
        <button
          onClick={async () => {
            await updateRestaurant(restaurant.id, { acceptingOrders: !restaurant.acceptingOrders });
            mutateRestaurant();
          }}
          className={`inline-flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
            restaurant.acceptingOrders !== false
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
          }`}
        >
          <span className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
            restaurant.acceptingOrders !== false ? "bg-emerald-500" : "bg-red-400"
          }`}>
            <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${
              restaurant.acceptingOrders !== false ? "translate-x-3.5" : "translate-x-0.5"
            }`} />
          </span>
          {restaurant.acceptingOrders !== false ? "Accepting Orders" : "Paused"}
        </button>

        {/* Busy Mode toggle */}
        <button
          onClick={async () => {
            if (restaurant.acceptingOrders === false) return;
            await updateRestaurant(restaurant.id, { isBusy: !restaurant.isBusy });
            mutateRestaurant();
          }}
          className={`inline-flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
            restaurant.acceptingOrders === false
              ? "pointer-events-none opacity-40 border-stone-200 bg-stone-50 text-stone-400"
              : restaurant.isBusy
                ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                : "border-stone-200 bg-stone-50 text-stone-500 hover:bg-stone-100"
          }`}
        >
          <span className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
            restaurant.isBusy && restaurant.acceptingOrders !== false ? "bg-amber-500" : "bg-stone-300"
          }`}>
            <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${
              restaurant.isBusy && restaurant.acceptingOrders !== false ? "translate-x-3.5" : "translate-x-0.5"
            }`} />
          </span>
          {restaurant.isBusy ? `Busy (+${restaurant.busyExtraMinutes ?? 15}min)` : "Normal"}
        </button>
      </div>

      {!stats ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-amber-500" />
        </div>
      ) : (
        <>
          {/* Primary Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
              label="Active Orders"
              value={activeTotal}
              accent="#d97706"
            />
            <StatCard
              label="Pending"
              value={stats.statusCounts.pending}
              accent="#f59e0b"
            />
            <StatCard
              label="Preparing"
              value={stats.statusCounts.preparing}
              accent="#0ea5e9"
            />
            <StatCard
              label="Delivering"
              value={stats.statusCounts.delivering}
              accent="#8b5cf6"
            />
            <StatCard
              label="Today's Revenue"
              value={formatCurrency(stats.todayRevenue)}
              accent="#10b981"
            />
            <StatCard
              label="Today's Orders"
              value={stats.todayOrderCount}
              accent="#6366f1"
            />
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-4 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xl">
                <svg className="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
                  Last Hour Revenue
                </p>
                <p className="font-[var(--font-geist-mono)] text-2xl font-bold text-stone-900">
                  {formatCurrency(stats.lastHourRevenue)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-xl">
                <svg className="h-5 w-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
                  Best Seller Today
                </p>
                {stats.bestSeller ? (
                  <p className="text-lg font-bold text-stone-900">
                    {stats.bestSeller.name}
                    <span className="ml-2 text-sm font-normal text-stone-400">
                      {stats.bestSeller.quantity} sold
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-stone-400">No sales yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Active Orders List */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-stone-400">
                Active Orders
              </h2>
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-stone-500">
                {activeTotal}
              </span>
            </div>

            {stats.activeOrders.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-white">
                <p className="text-sm text-stone-400">
                  No active orders right now
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.activeOrders.map((order: any) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    isLongestWaiting={order.id === longestWaitingId}
                    onStatusChange={handleStatusChange}
                    loading={loadingId === order.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Completed Today — collapsible */}
          {(stats.statusCounts.completed > 0 || stats.statusCounts.canceled > 0) && (
            <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/30 overflow-hidden">
              <button
                onClick={() => setCompletedExpanded(!completedExpanded)}
                className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-emerald-50/60"
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-600/80">
                    Completed Today
                  </h2>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-emerald-700">
                    {stats.statusCounts.completed}
                  </span>
                  {stats.statusCounts.canceled > 0 && (
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium tabular-nums text-stone-400">
                      {stats.statusCounts.canceled} canceled
                    </span>
                  )}
                </div>
                <svg
                  className={`h-4 w-4 text-emerald-400 transition-transform ${
                    completedExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {completedExpanded && stats.completedOrders?.length > 0 && (
                <div className="border-t border-emerald-100 px-4 pb-4 pt-2 space-y-2">
                  {stats.completedOrders.map((order: any) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      isLongestWaiting={false}
                      onStatusChange={handleStatusChange}
                      loading={loadingId === order.id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
