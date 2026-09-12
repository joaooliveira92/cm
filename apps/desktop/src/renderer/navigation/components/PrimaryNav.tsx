import { HelpCircle, Menu } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import {
  SPEC_SECTIONS,
  MORE_ITEMS,
  type SpecSectionId,
} from "../spec-nav-config.js";
import { parseNavState } from "../nav-route-parser.js";
import { useMediaQuery } from "../../activeLeagues/useViewportWidth.js";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover.js";
import { ShortcutHint } from "../../discoverability/ShortcutHint.js";
import { FOCUS_RING } from "../../focus.js";
import { NO_DRAG } from "../../chrome/header/drag-region.js";

const WIDE_QUERY = "(min-width: 1200px)";
const MEDIUM_QUERY = "(min-width: 768px)";

export interface PrimaryNavProps {
  readonly badges?: Readonly<Record<string, { readonly count: number; readonly label: string }>>;
  readonly continueSlot?: ReactNode;
  readonly crestSlot?: ReactNode;
  readonly navSlot?: ReactNode;
  readonly searchSlot?: ReactNode;
  readonly dateLabel?: string;
  readonly onGoTo?: (sectionId: SpecSectionId) => void;
}

const HIDE_AT_MEDIUM = new Set(["world", "search"]);

export const PrimaryNav = ({
  badges,
  continueSlot,
  crestSlot,
  navSlot,
  searchSlot,
  dateLabel,
  onGoTo,
}: PrimaryNavProps) => {
  const location = useLocation();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const parsed = useMemo(
    () => parseNavState(location.pathname, searchParams),
    [location.pathname, searchParams],
  );

  const isWide = useMediaQuery(WIDE_QUERY);
  const isMedium = useMediaQuery(MEDIUM_QUERY);
  const activeId = parsed.originSectionId ?? parsed.primarySection?.id ?? null;

  if (!isMedium) {
    return (
      <NarrowPrimaryNav
        activeSectionId={activeId}
        continueSlot={continueSlot}
      />
    );
  }

  return (
    <nav
      className="flex h-11 w-full shrink-0 items-center gap-2 border-b border-border-subtle bg-bg-raised px-3 text-text-primary"
      style={NO_DRAG}
      aria-label="Primary navigation"
    >
      {crestSlot !== undefined && (
        <div className="flex shrink-0 items-center">{crestSlot}</div>
      )}

      {navSlot !== undefined && (
        <div className="flex shrink-0 items-center">{navSlot}</div>
      )}

      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {SPEC_SECTIONS.map((section, index) => {
          const active = activeId === section.id;
          const hidden = !isWide && HIDE_AT_MEDIUM.has(section.id);
          const isMore = section.id === "more";

          if (isMore) {
            return <MoreDropdown key={section.id} />;
          }

          if (hidden && isMedium) {
            return (
              <IconFallbackItem
                key={section.id}
                icon={section.icon}
                label={section.label}
                active={active}
                onClick={() => onGoTo?.(section.id)}
              />
            );
          }

          if (hidden) return null;

          const badge = badges?.[section.id];

          return (
            <PrimaryItem
              key={section.id}
              label={section.label}
              Icon={section.icon}
              active={active}
              badge={badge}
              hintKey={String(index + 1)}
              onClick={() => onGoTo?.(section.id)}
            />
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-2" style={NO_DRAG}>
        {dateLabel !== undefined && (
          <span className="hidden text-xs text-text-secondary tabular-nums md:inline">
            {dateLabel}
          </span>
        )}

        {badges?.manager !== undefined && badges.manager.count > 0 && (
          <InboxButton badge={badges.manager} />
        )}

        {searchSlot}

        {continueSlot}
      </div>
    </nav>
  );
};

const PrimaryItem = ({
  label,
  Icon,
  active,
  badge,
  hintKey,
  onClick,
}: {
  readonly label: string;
  readonly Icon: React.ComponentType<{ className?: string }>;
  readonly active: boolean;
  readonly badge?: { readonly count: number; readonly label: string } | undefined;
  readonly hintKey: string;
  readonly onClick: () => void;
}) => (
  <ShortcutHint hintKey={hintKey}>
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-1.5 whitespace-nowrap rounded-control px-3 py-1 text-sm transition-colors ${
        active
          ? "chrome-gradient-inverted border border-panel-border-dark font-semibold"
          : "bg-surface text-text-secondary hover:bg-surface-raised hover:text-text-primary"
      } ${FOCUS_RING.join(" ")}`}
      onClick={onClick}
    >
      {Icon !== undefined && <Icon className="size-4" />}
      <span>{label}</span>
      {badge !== undefined && badge.count > 0 && (
        <span
          aria-label={`${badge.count} ${badge.label ?? "unread"}`}
          className="ml-0.5 min-w-4 rounded-full bg-destructive px-1 text-center text-[0.625rem] font-semibold leading-4 text-white tabular-nums"
        >
          {badge.count > 99 ? "99+" : badge.count}
        </span>
      )}
    </button>
  </ShortcutHint>
);

const IconFallbackItem = ({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly label: string;
  readonly active: boolean;
  readonly onClick: () => void;
}) => (
  <button
    type="button"
    aria-current={active ? "page" : undefined}
    aria-label={label}
    data-icon-only="true"
    className={`flex items-center justify-center rounded-control p-1.5 text-sm transition-colors ${
      active
        ? "chrome-gradient-inverted border border-panel-border-dark"
        : "bg-surface text-text-secondary hover:bg-surface-raised hover:text-text-primary"
    } ${FOCUS_RING.join(" ")}`}
    onClick={onClick}
  >
    <Icon className="size-4" />
  </button>
);

const InboxButton = ({
  badge,
}: {
  readonly badge: { readonly count: number; readonly label: string };
}) => (
  <button
    type="button"
    aria-label={`Inbox: ${badge.count} ${badge.label}`}
    className="flex items-center gap-1 rounded-control p-1.5 text-text-secondary hover:bg-surface-raised hover:text-text-primary"
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
    <span className="min-w-4 rounded-full bg-destructive px-1 text-center text-[0.625rem] font-semibold leading-4 text-white tabular-nums">
      {badge.count > 99 ? "99+" : badge.count}
    </span>
  </button>
);

const MoreDropdown = () => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-control px-3 py-1 text-sm text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary ${FOCUS_RING.join(" ")}`}
          >
            <HelpCircle className="size-4" />
            <span>More</span>
          </button>
        }
      />
      <PopoverContent align="end" sideOffset={4} className="w-56 p-1">
        <div className="flex flex-col gap-0.5">
          {MORE_ITEMS.map((item) => {
            const ItemIcon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-text-secondary hover:bg-surface-raised hover:text-text-primary"
              >
                <ItemIcon className="size-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const NarrowPrimaryNav = ({
  activeSectionId,
  continueSlot,
}: {
  readonly activeSectionId: string | null;
  readonly continueSlot?: ReactNode;
}) => {
  const activeLabel = activeSectionId !== null
    ? SPEC_SECTIONS.find((s) => s.id === activeSectionId)?.label ?? "Menu"
    : "Menu";

  return (
    <nav
      className="flex h-11 w-full shrink-0 items-center justify-between border-b border-border-subtle bg-bg-raised px-3 text-text-primary"
      style={NO_DRAG}
      aria-label="Primary navigation"
    >
      <Popover>
        <PopoverTrigger
        render={
          <button
            type="button"
            className={`flex items-center gap-2 rounded-control px-2 py-1 text-sm text-text-secondary hover:bg-surface-raised hover:text-text-primary ${FOCUS_RING.join(" ")}`}
          >
            <Menu className="size-4" />
            <span className="font-medium">{activeLabel}</span>
          </button>
        }
      />
        <PopoverContent align="start" sideOffset={4} className="w-56 p-1">
          <div className="flex flex-col gap-0.5">
            {SPEC_SECTIONS.filter((s) => s.id !== "more").map((section) => {
              const active = activeSectionId === section.id;
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm ${
                    active
                      ? "bg-surface-raised font-semibold text-text-primary"
                      : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                  }`}
                >
                  <Icon className="size-4" />
                  <span>{section.label}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {continueSlot !== undefined && (
        <div className="flex shrink-0 items-center">{continueSlot}</div>
      )}
    </nav>
  );
};