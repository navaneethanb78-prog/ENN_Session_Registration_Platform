import { listAdminInHouseRequests } from "@/lib/sessions/admin-service";
import { EmptyState, PageHeading } from "@/components/ui/Primitives";
import { RequestCard } from "@/components/admin/RequestCard";

export const dynamic = "force-dynamic";

const STATUS_ORDER = ["PENDING", "PLANNING", "ACCEPTED", "REJECTED"] as const;

export default async function AdminRequestsPage() {
  const requests = await listAdminInHouseRequests();
  const counts = Object.fromEntries(
    STATUS_ORDER.map((s) => [s, requests.filter((r) => r.status === s).length]),
  );

  return (
    <div className="flex flex-col gap-7">
      <PageHeading
        eyebrow="On-site requests"
        title="Requests to train at a client site"
        description="Companies asking us to deliver a programme at their own premises. These consume no seats."
      />

      {requests.length === 0 ? (
        <EmptyState
          title="No requests yet"
          description="On-site training requests submitted from the website will appear here."
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[0.8125rem] text-ink-500">
            <span>
              <span className="tabular font-semibold text-ink-800">{requests.length}</span> total
            </span>
            {STATUS_ORDER.map((s) => (
              <span key={s}>
                <span className="tabular font-semibold text-ink-800">{counts[s]}</span>{" "}
                {s.toLowerCase()}
              </span>
            ))}
          </div>

          {/* One card per request, in a single readable column. */}
          <ul className="flex list-none flex-col gap-4">
            {requests.map((request) => (
              <li key={request.id}>
                <RequestCard request={request} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
