import Link from "next/link";
import { listAdminSessions } from "@/lib/sessions/admin-service";
import { formatSessionDate, formatTimeRange } from "@/lib/time";
import { LinkButton } from "@/components/ui/Button";
import { Card, EmptyState, PageHeading } from "@/components/ui/Primitives";
import { StatusBadge } from "@/components/sessions/StatusBadge";

export const dynamic = "force-dynamic";

export default async function AdminSessionsPage() {
  const views = await listAdminSessions(new Date());

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeading
          eyebrow="Sessions"
          title="Manage sessions"
          description="Create sessions, adjust capacity, and cancel or remove dates."
        />
        <LinkButton href="/admin/sessions/new">Create session</LinkButton>
      </div>

      {views.length === 0 ? (
        <EmptyState
          title="No sessions yet"
          description="Create your first session to begin accepting registrations."
          action={
            <LinkButton href="/admin/sessions/new">Create session</LinkButton>
          }
        />
      ) : (
        <>
          {/* Phones and small tablets: a card per session rather than a wide table. */}
          <ul className="flex list-none flex-col gap-3 lg:hidden">
            {views.map((view) => (
              <li key={view.session.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium break-words text-brand-950">
                        {view.session.sessionName}
                      </p>
                      <p className="mt-0.5 text-[0.8125rem] break-words text-ink-500">
                        {view.session.topic}
                      </p>
                    </div>
                    <StatusBadge status={view.status} className="shrink-0" />
                  </div>

                  <dl className="mt-3 flex flex-col gap-1.5 border-t border-ink-100 pt-3 text-[0.8125rem]">
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-ink-400">Date</dt>
                      <dd className="text-ink-700">
                        {formatSessionDate(view.session.startAt, view.session.timezone)}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-ink-400">Time</dt>
                      <dd className="tabular text-ink-700">
                        {formatTimeRange(
                          view.session.startAt,
                          view.session.endAt,
                          view.session.timezone,
                        )}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-ink-400">Seats</dt>
                      <dd className="tabular text-ink-700">
                        {view.session.registeredCount} / {view.session.maximumSeats}
                        <span className="ml-2 text-ink-400">
                          {view.remainingSeats} remaining
                        </span>
                      </dd>
                    </div>
                  </dl>

                  <LinkButton
                    href={`/admin/sessions/${view.session.id}`}
                    variant="secondary"
                    fullWidth
                    className="mt-4"
                  >
                    Manage session
                  </LinkButton>
                </Card>
              </li>
            ))}
          </ul>

          {/* Wide screens: the full table. */}
          <Card className="hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">All scheduled sessions with capacity and status</caption>
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-50/60">
                    <th scope="col" className="px-4 py-3 font-semibold text-ink-600">Session</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-ink-600">Date &amp; time</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-ink-600">Capacity</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-ink-600">Remaining</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-ink-600">Status</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold text-ink-600">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {views.map((view) => (
                    <tr key={view.session.id} className="border-b border-ink-100 last:border-0">
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-brand-950">{view.session.sessionName}</p>
                        <p className="mt-0.5 text-[0.8125rem] text-ink-500">{view.session.topic}</p>
                      </td>
                      <td className="px-4 py-3.5 text-ink-600">
                        <p>{formatSessionDate(view.session.startAt, view.session.timezone)}</p>
                        <p className="tabular mt-0.5 text-[0.8125rem] text-ink-400">
                          {formatTimeRange(
                            view.session.startAt,
                            view.session.endAt,
                            view.session.timezone,
                          )}
                        </p>
                      </td>
                      <td className="tabular px-4 py-3.5 text-ink-600">
                        {view.session.registeredCount} / {view.session.maximumSeats}
                      </td>
                      <td className="tabular px-4 py-3.5 text-ink-600">{view.remainingSeats}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={view.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/admin/sessions/${view.session.id}`}
                          className="rounded text-[0.8125rem] font-medium text-brand-600 underline-offset-2 hover:underline"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
