import { dashboardStats } from "@/lib/sessions/admin-service";
import { formatSessionDate, formatTimeRange } from "@/lib/time";
import { LinkButton } from "@/components/ui/Button";
import { Card, PageHeading } from "@/components/ui/Primitives";
import { StatusBadge } from "@/components/sessions/StatusBadge";
import { UtilisationChart } from "@/components/admin/UtilisationChart";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-[0.6875rem] font-semibold tracking-[0.12em] text-ink-400 uppercase">
        {label}
      </p>
      <p className="tabular font-display mt-2 text-3xl font-semibold tracking-tight text-brand-950">
        {value}
      </p>
      {detail && <p className="mt-1 text-[0.8125rem] text-ink-500">{detail}</p>}
    </Card>
  );
}

export default async function AdminOverviewPage() {
  const stats = await dashboardStats(new Date());
  const next = stats.nextSession;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeading
          eyebrow="Overview"
          title="Session dashboard"
          description="Capacity and registration activity across all scheduled sessions."
        />
        <LinkButton href="/admin/sessions/new">Create session</LinkButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total sessions" value={stats.totalSessions} />
        <StatCard
          label="Upcoming sessions"
          value={stats.upcomingSessions}
          detail="Not yet completed"
        />
        <StatCard label="Total registrations" value={stats.totalRegistrations} />
        <StatCard
          label="Seats filled"
          value={`${stats.seatsFilledPercent}%`}
          detail={`${stats.totalSeatsTaken} of ${stats.totalCapacity} upcoming seats`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-display text-base font-semibold text-brand-950">
            Seat utilisation by session
          </h2>
          <p className="mt-1 text-[0.8125rem] text-ink-500">
            Upcoming sessions, ordered by date.
          </p>
          <div className="mt-5">
            <UtilisationChart rows={stats.perSession} />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-base font-semibold text-brand-950">Next session</h2>
          {next ? (
            <div className="mt-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-brand-950">{next.session.sessionName}</p>
                <StatusBadge status={next.status} className="shrink-0" />
              </div>
              <p className="mt-1 text-[0.8125rem] text-ink-500">{next.session.topic}</p>
              <dl className="mt-4 flex flex-col gap-2 text-[0.8125rem]">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-400">Date</dt>
                  <dd className="text-right font-medium text-ink-800">
                    {formatSessionDate(next.session.startAt, next.session.timezone)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-400">Time</dt>
                  <dd className="tabular text-right font-medium text-ink-800">
                    {formatTimeRange(
                      next.session.startAt,
                      next.session.endAt,
                      next.session.timezone,
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-400">Seats</dt>
                  <dd className="tabular text-right font-medium text-ink-800">
                    {next.remainingSeats} of {next.session.maximumSeats} remaining
                  </dd>
                </div>
              </dl>
              <LinkButton
                href={`/admin/sessions/${next.session.id}`}
                variant="secondary"
                fullWidth
                className="mt-5"
              >
                Manage session
              </LinkButton>
            </div>
          ) : (
            <p className="mt-4 text-[0.9375rem] text-ink-500">
              No upcoming sessions are scheduled.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
