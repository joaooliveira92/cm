import { type KeyboardEvent, type Ref } from "react";
import { cn } from "@/lib/utils.js";
import { ACCENT_STYLES } from "./constants.js";
import type { DossierSection } from "./types.js";

export interface DossierAccordionItemProps {
  readonly section: DossierSection;
  readonly state: "expanded" | "collapsed";
  readonly onSelect: () => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  readonly ref?: Ref<HTMLButtonElement>;
}

export function DossierAccordionItem({
  section,
  state,
  onSelect,
  onKeyDown,
  ref,
}: DossierAccordionItemProps) {
  const expanded = state === "expanded";
  const Icon = section.icon;
  const accent = ACCENT_STYLES[section.accent];
  const triggerId = `dossier-${section.id}-trigger`;
  const panelId = `dossier-${section.id}-panel`;

  return (
    <article
      className={cn(
        "relative h-full min-h-0 min-w-0 overflow-hidden border-r border-[#1e2a3b] bg-[#070b12]/65 last:border-r-0",
        expanded && accent.bg,
      )}
    >
      {expanded ? (
        <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]">
          <button
            ref={ref}
            id={triggerId}
            type="button"
            aria-label={section.label}
            aria-expanded="true"
            aria-controls={panelId}
            onClick={onSelect}
            onKeyDown={onKeyDown}
            className="flex min-h-12 w-full items-center gap-2 px-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d4a359] sm:px-5"
          >
            <Icon className={cn("h-4 w-4 shrink-0", accent.text)} aria-hidden="true" />
            <span
              className={cn(
                "font-mono text-[0.75rem] font-black uppercase tracking-[0.16em]",
                accent.text,
              )}
            >
              {section.label}
            </span>
          </button>

          <section
            id={panelId}
            aria-labelledby={triggerId}
            className={cn(
              "min-h-0 overflow-y-auto overscroll-contain border-t px-3 py-3 text-[0.72rem] leading-relaxed text-[#b4c1ce] sm:px-5 sm:py-4 sm:text-xs",
              accent.border,
            )}
          >
            <div className="whitespace-normal font-mono break-words text-[.85rem]">
              {section.text}
            </div>
          </section>
        </div>
      ) : (
        <button
          ref={ref}
          id={triggerId}
          type="button"
          aria-label={section.label}
          aria-expanded="false"
          aria-controls={panelId}
          title={section.label}
          onClick={onSelect}
          onKeyDown={onKeyDown}
          className="flex h-full w-full items-center justify-center p-0 outline-none hover:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d4a359]"
        >
          <Icon className={cn("h-5 w-5 shrink-0", accent.text)} aria-hidden="true" />
        </button>
      )}
    </article>
  );
}
