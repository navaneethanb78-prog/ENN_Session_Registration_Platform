import { listAdminInHouseRequests } from "@/lib/sessions/admin-service";
import { formatPhoneForDisplay } from "@/lib/phone";
import { formatInZone } from "@/lib/time";
import { Card, EmptyState, PageHeading } from "@/components/ui/Primitives";
import { RequestStatusControl } from "@/components/admin/RequestStatusControl";

export const dynamic = "force-dynamic";

const COLUMNS = [
  "Reference",
  "Received",
  "Name",
  "Company",
  "Programmes",
  "Participants",
  "Where",
  "When",
  "Phone",
  "Email",
  "Status",
];

export default async function AdminRequestsPage() {
  const requests = await listAdminInHouseRequests();

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
          {/* Phones and small tablets: a card per request. */}
          <ul className="flex list-none flex-col gap-3 lg:hidden">
            {requests.map((r) => (
              <li key={r.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="tabular text-[0.8125rem] font-medium text-brand-700">
                        {r.requestReference}
                      </p>
                      <p className="mt-0.5 font-medium break-words text-ink-900">{r.fullName}</p>
                      <p className="text-[0.8125rem] break-words text-ink-500">
                        {r.designation} · {r.companyName}
                      </p>
                    </div>
                    <p className="tabular shrink-0 text-[0.75rem] text-ink-400">
                      {formatInZone(r.createdAt, "d MMM")}
                    </p>
                  </div>
                  <dl className="mt-3 flex flex-col gap-1.5 border-t border-ink-100 pt-3 text-[0.8125rem]">
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-ink-400">Programme</dt>
                      <dd className="break-words text-ink-700">{r.programmes.join(", ")}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-ink-400">Participants</dt>
                      <dd className="tabular text-ink-700">{r.participants}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-ink-400">Where</dt>
                      <dd className="break-words text-ink-700">{r.venueCity}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-ink-400">When</dt>
                      <dd className="break-words text-ink-700">{r.preferredTimeframe}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-ink-400">Phone</dt>
                      <dd className="tabular break-all text-ink-700">
                        {formatPhoneForDisplay(r.phoneNumber)}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-ink-400">Email</dt>
                      <dd className="break-all text-ink-700">{r.email}</dd>
                    </div>
                    {r.notes && (
                      <div className="flex gap-2">
                        <dt className="w-24 shrink-0 text-ink-400">Notes</dt>
                        <dd className="break-words text-ink-700">{r.notes}</dd>
                      </div>
                    )}
                  </dl>
                  <div className="mt-3 border-t border-ink-100 pt-3">
                    <p className="mb-1.5 text-[0.75rem] text-ink-400">Status</p>
                    <RequestStatusControl requestId={r.id} status={r.status} compact />
                  </div>
                </Card>
              </li>
            ))}
          </ul>

          {/* Wide screens: the full table. */}
          <Card className="hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">On-site training requests</caption>
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-50/60">
                    {COLUMNS.map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="px-3 py-3 font-semibold whitespace-nowrap text-ink-600"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className="border-b border-ink-100 last:border-0">
                      <td className="tabular px-3 py-3 font-medium whitespace-nowrap text-brand-900">
                        {r.requestReference}
                      </td>
                      <td className="tabular px-3 py-3 whitespace-nowrap text-ink-500">
                        {formatInZone(r.createdAt, "d MMM yyyy")}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-ink-800">{r.fullName}</td>
                      <td className="px-3 py-3 text-ink-600">{r.companyName}</td>
                      <td className="px-3 py-3 text-ink-600">{r.programmes.join(", ")}</td>
                      <td className="tabular px-3 py-3 text-ink-600">{r.participants}</td>
                      <td className="px-3 py-3 text-ink-600">{r.venueCity}</td>
                      <td className="px-3 py-3 text-ink-600">{r.preferredTimeframe}</td>
                      <td className="tabular px-3 py-3 whitespace-nowrap text-ink-600">
                        {formatPhoneForDisplay(r.phoneNumber)}
                      </td>
                      <td className="px-3 py-3 text-ink-600">{r.email}</td>
                      <td className="px-3 py-3">
                        <RequestStatusControl requestId={r.id} status={r.status} />
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
