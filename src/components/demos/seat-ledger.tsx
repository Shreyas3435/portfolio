"use client";

import { useState } from "react";

const CAPACITY = 12;

type Status = "pending" | "confirmed" | "rejected" | "cancelled";

interface Booking {
  id: number;
  seats: number;
  status: Status;
}

interface Ledger {
  bookings: Booking[];
  log: { text: string; tone: "plain" | "ok" | "bad" }[];
  nextId: number;
}

const initial: Ledger = {
  bookings: [
    { id: 101, seats: 6, status: "confirmed" },
    { id: 102, seats: 4, status: "pending" },
    { id: 103, seats: 3, status: "pending" },
  ],
  log: [{ text: "Trek opened with 12 seats. 6 are confirmed.", tone: "plain" }],
  nextId: 104,
};

const taken = (bookings: Booking[]) =>
  bookings.filter((b) => b.status === "confirmed").reduce((sum, b) => sum + b.seats, 0);

function confirm(state: Ledger, id: number, guarded: boolean): Ledger {
  const booking = state.bookings.find((b) => b.id === id);
  if (!booking || booking.status !== "pending") return state;
  const left = CAPACITY - taken(state.bookings);

  if (guarded && booking.seats > left) {
    return {
      ...state,
      log: [
        { text: `#${id} refused: wants ${booking.seats}, only ${left} left. Still pending.`, tone: "bad" as const },
        ...state.log,
      ],
    };
  }

  const bookings = state.bookings.map((b) => (b.id === id ? { ...b, status: "confirmed" as const } : b));
  const after = CAPACITY - taken(bookings);
  return {
    ...state,
    bookings,
    log: [
      after < 0
        ? { text: `#${id} confirmed: OVERSOLD by ${-after}. Someone has no seat.`, tone: "bad" as const }
        : { text: `#${id} confirmed: ${booking.seats} seats taken, ${after} left.`, tone: "ok" as const },
      ...state.log,
    ],
  };
}

function close(state: Ledger, id: number, status: "rejected" | "cancelled"): Ledger {
  const booking = state.bookings.find((b) => b.id === id);
  if (!booking) return state;
  const bookings = state.bookings.map((b) => (b.id === id ? { ...b, status } : b));
  const text =
    status === "cancelled"
      ? `#${id} cancelled: ${booking.seats} seats restored, ${CAPACITY - taken(bookings)} left.`
      : `#${id} rejected: no seats were held, count unchanged.`;
  return { ...state, bookings, log: [{ text, tone: "plain" as const }, ...state.log] };
}

export function SeatLedger() {
  const [ledger, setLedger] = useState(initial);
  const [guarded, setGuarded] = useState(true);

  const used = taken(ledger.bookings);
  const left = CAPACITY - used;
  const pendingIds = ledger.bookings.filter((b) => b.status === "pending").map((b) => b.id);

  const request = () =>
    setLedger((s) => ({
      ...s,
      bookings: [...s.bookings, { id: s.nextId, seats: 2, status: "pending" }],
      log: [{ text: `#${s.nextId} requested 2 seats. Count unchanged until confirmed.`, tone: "plain" }, ...s.log],
      nextId: s.nextId + 1,
    }));

  const confirmAll = () =>
    setLedger((s) => pendingIds.reduce((state, id) => confirm(state, id, guarded), s));

  return (
    <div className="panel grid gap-6 p-4 md:p-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="min-w-0">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="label p-mut">Seats left</p>
            <p
              className="display text-[4.5rem] tabular-nums"
              style={left < 0 ? { color: "var(--bad)" } : undefined}
              aria-live="polite"
            >
              {left}
            </p>
          </div>
          <p className="label p-mut pb-2 text-right">
            Kodachadri sample
            <br />
            {CAPACITY} seats total
          </p>
        </div>
        <div className="mt-3 grid grid-cols-6 gap-1.5" role="img" aria-label={`${used} of ${CAPACITY} seats taken`}>
          {Array.from({ length: Math.max(CAPACITY, used) }, (_, i) => (
            <div key={i} className="seat" data-state={i >= CAPACITY ? "over" : i < used ? "taken" : "free"} />
          ))}
        </div>

        <div className="mt-5 flex items-start gap-3 border-t p-line pt-4">
          <button
            type="button"
            className="p-btn shrink-0"
            aria-pressed={guarded}
            onClick={() => setGuarded((g) => !g)}
          >
            Seat guard: {guarded ? "on" : "off"}
          </button>
          <p className="label p-mut">Switch it off, then confirm everything, to see the bug these rules prevent.</p>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="p-btn p-btn-solid" onClick={confirmAll} disabled={!pendingIds.length}>
            Confirm all pending at once
          </button>
          <button type="button" className="p-btn" onClick={request}>
            New request, 2 seats
          </button>
          <button
            type="button"
            className="p-btn"
            onClick={() => {
              setLedger(initial);
              setGuarded(true);
            }}
          >
            Reset
          </button>
        </div>

        <ul className="mt-4">
          {ledger.bookings.map((b) => (
            <li key={b.id} className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 border-t p-line py-1.5">
              <span className="label w-10">#{b.id}</span>
              <span className="label w-14">{b.seats} seats</span>
              <span className="label p-mut mr-auto">{b.status}</span>
              {b.status === "pending" && (
                <span className="flex gap-1.5">
                  <button
                    type="button"
                    className="p-btn"
                    onClick={() => setLedger((s) => confirm(s, b.id, guarded))}
                  >
                    Confirm
                  </button>
                  <button type="button" className="p-btn" onClick={() => setLedger((s) => close(s, b.id, "rejected"))}>
                    Reject
                  </button>
                </span>
              )}
              {b.status === "confirmed" && (
                <button type="button" className="p-btn" onClick={() => setLedger((s) => close(s, b.id, "cancelled"))}>
                  Cancel
                </button>
              )}
            </li>
          ))}
        </ul>

        <ol className="mt-3 max-h-36 overflow-y-auto border-t p-line pt-3" aria-live="polite" tabIndex={0} aria-label="Event log">
          {ledger.log.map((entry, i) => (
            <li
              key={ledger.log.length - i}
              className="label py-0.5"
              style={{
                color: entry.tone === "bad" ? "var(--bad)" : entry.tone === "ok" ? "var(--ok)" : "var(--p-mut)",
              }}
            >
              {entry.text}
            </li>
          ))}
        </ol>
      </div>

      <p className="label p-mut max-w-[70ch] lg:col-span-2">
        This re-creates the booking rules in your browser so you can test them. In the real app they live in the FastAPI
        service layer, with pytest covering the pending, confirm, reject and cancel paths.
      </p>
    </div>
  );
}
