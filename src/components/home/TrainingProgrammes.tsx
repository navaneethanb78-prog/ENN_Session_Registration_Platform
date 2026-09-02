import { PROGRAMME_HEADLINE, TRAINING_PROGRAMMES } from "@/lib/programmes";

/** The programme catalogue. Static content, rendered on the server. */
export function TrainingProgrammes() {
  return (
    <section id="programmes" className="scroll-mt-20 border-t border-ink-200/60">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-brand-950 sm:text-3xl">
          {PROGRAMME_HEADLINE}
        </h2>
        <p className="mt-2 max-w-2xl leading-relaxed text-ink-600">
          Any of these can be scheduled as a public session or delivered in house at your own
          premises.
        </p>

        <ul className="mt-8 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TRAINING_PROGRAMMES.map((group) => (
            <li
              key={group.title}
              className="rounded-xl border border-ink-200/80 bg-white p-5 shadow-[var(--shadow-card)]"
            >
              <h3 className="font-display text-base leading-snug font-semibold text-brand-950">
                {group.title}
              </h3>
              {group.blurb && (
                <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-500">
                  {group.blurb}
                </p>
              )}
              <ul className="mt-3 flex list-none flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-md bg-brand-50 px-2 py-1 text-[0.8125rem] font-medium text-brand-800"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-[0.9375rem] text-ink-500">
          This is a selection. Ask us about any standard or improvement topic you need — our
          catalogue runs to more than 90 programmes.
        </p>
      </div>
    </section>
  );
}
