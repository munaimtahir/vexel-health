export default function UiPreviewPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/60 text-slate-900">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-teal-600/10 ring-1 ring-teal-200 flex items-center justify-center">
              <span className="text-teal-700 font-semibold">V</span>
            </div>
            <div>
              <div className="text-sm font-semibold leading-4">Vexel Health</div>
              <div className="text-xs text-slate-500">LIMS-first workspace</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <span className="text-slate-400">⌘K</span>
              <span>Search patients, orders…</span>
            </div>
            <button className="rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-200">
              New visit
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-4 px-4 py-4">
        {/* Sidebar */}
        <aside className="hidden md:block w-64 shrink-0">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="px-4 py-4">
              <div className="text-xs font-semibold text-slate-500">Navigation</div>
              <nav className="mt-3 space-y-1 text-sm">
                {[
                  ["Dashboard", true],
                  ["Patients", false],
                  ["Orders", false],
                  ["Results entry", false],
                  ["Verification", false],
                  ["Documents", false],
                  ["Admin", false],
                ].map(([label, active]) => (
                  <a
                    key={label}
                    href="#"
                    className={[
                      "flex items-center justify-between rounded-xl px-3 py-2",
                      active
                        ? "bg-teal-50 text-teal-800 ring-1 ring-teal-100"
                        : "text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <span className="font-medium">{label}</span>
                    {active ? (
                      <span className="text-[11px] rounded-full bg-teal-600/10 px-2 py-0.5 text-teal-700">
                        active
                      </span>
                    ) : null}
                  </a>
                ))}
              </nav>
            </div>
            <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
              Tenant: <span className="font-medium text-slate-700">Al Shifa</span>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 space-y-4">
          {/* Identity Header (example) */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500">Patient</div>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <div className="text-xl font-semibold tabular-nums">
                      Reg # <span className="text-slate-900">AF-000128</span>
                    </div>
                    <span className="text-slate-400">•</span>
                    <div className="text-sm text-slate-700">
                      Ayesha Khan <span className="text-slate-500">(28/F)</span>
                    </div>
                    <span className="text-slate-400">•</span>
                    <div className="text-sm text-slate-600 tabular-nums">0300-1234567</div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Chip label="Visit" value="VIS-2026-00044" tone="info" />
                    <Chip label="LIMS" value="LAB-2026-004561" tone="brand" />
                    <Chip label="Status" value="IN_PROGRESS" tone="warning" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    View patient
                  </button>
                  <button className="rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-200">
                    Enter results
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Two-column content */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Left: Queue / Table */}
            <section className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <div className="text-sm font-semibold">Orders queue</div>
                  <div className="text-xs text-slate-500">Today • Filter: In progress</div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Filters
                  </button>
                  <button className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                    Export
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                    <tr>
                      <th className="px-5 py-3">Reg #</th>
                      <th className="px-5 py-3">Patient</th>
                      <th className="px-5 py-3">Order</th>
                      <th className="px-5 py-3">Stage</th>
                      <th className="px-5 py-3">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {[
                      ["AF-000128", "Ayesha Khan", "LAB-2026-004561", "IN_PROGRESS", "12:14"],
                      ["AF-000091", "Ahmad Raza", "LAB-2026-004559", "PREP", "11:55"],
                      ["AF-000077", "Sara Ali", "LAB-2026-004558", "FINALIZED", "11:20"],
                    ].map((row) => (
                      <tr key={row[2]} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-semibold tabular-nums">{row[0]}</td>
                        <td className="px-5 py-3 text-slate-700">{row[1]}</td>
                        <td className="px-5 py-3 tabular-nums text-slate-700">{row[2]}</td>
                        <td className="px-5 py-3">
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                            {row[3]}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-500 tabular-nums">{row[4]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Right: Actions / Info */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="text-sm font-semibold">Next actions</div>
                <div className="text-xs text-slate-500">Guided UI, server enforces rules</div>
              </div>

              <div className="p-5 space-y-3">
                <ActionCard
                  title="Enter results"
                  desc="Record measured values for the order parameters."
                  tone="brand"
                  primary="Open workspace"
                />
                <ActionCard
                  title="Verify"
                  desc="Verifier reviews and approves results before publishing."
                  tone="info"
                  primary="Go to verification"
                  disabled
                  disabledReason="Not available until results are entered"
                />
                <ActionCard
                  title="Publish PDF report"
                  desc="Official report is generated by the deterministic PDF service."
                  tone="success"
                  primary="Publish"
                  disabled
                  disabledReason="Requires verification"
                />
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function Chip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "brand" | "info" | "warning" | "success";
}) {
  const toneClass =
    tone === "brand"
      ? "bg-teal-50 text-teal-800 ring-teal-100"
      : tone === "info"
      ? "bg-sky-50 text-sky-800 ring-sky-100"
      : tone === "success"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
      : "bg-amber-50 text-amber-800 ring-amber-100";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${toneClass}`}>
      <span className="text-[11px] opacity-70">{label}</span>
      <span className="tabular-nums">{value}</span>
    </span>
  );
}

function ActionCard({
  title,
  desc,
  tone,
  primary,
  disabled,
  disabledReason,
}: {
  title: string;
  desc: string;
  tone: "brand" | "info" | "success";
  primary: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const bar =
    tone === "brand"
      ? "bg-teal-600"
      : tone === "success"
      ? "bg-emerald-600"
      : "bg-sky-600";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className={`h-1 ${bar}`} />
      <div className="p-4">
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-xs text-slate-500">{desc}</div>

        {disabled && disabledReason ? (
          <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
            {disabledReason}
          </div>
        ) : null}

        <button
          className={[
            "mt-3 w-full rounded-xl px-3 py-2 text-sm font-semibold shadow-sm",
            disabled
              ? "cursor-not-allowed bg-slate-200 text-slate-500"
              : "bg-slate-900 text-white hover:bg-slate-800",
          ].join(" ")}
          disabled={disabled}
        >
          {primary}
        </button>
      </div>
    </div>
  );
}

