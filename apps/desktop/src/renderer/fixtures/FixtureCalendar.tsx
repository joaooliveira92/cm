/**
 * The competition's fixtures on reui's event calendar (`@reui/c-event-calendar-1`), vendored under
 * `components/reui/event-calendar`.
 *
 * Read-only: a fixture's date belongs to the season schedule, so drag, resize and drag-to-create
 * are all off. Only the month and agenda views are offered, because a fixture has a date and no
 * kick-off time, so the week and day time grids would render an empty hour track. "Today" is the
 * game date, not the wall clock, so the Today button, the highlight and past-fixture styling all
 * follow the season.
 */
import type { FixtureView } from "@cm-clone/contracts";
import { addDays, parseISO } from "date-fns";
import { useMemo } from "react";
import { EventCalendar } from "../components/reui/event-calendar/event-calendar.js";
import { EventCalendarContent } from "../components/reui/event-calendar/event-calendar-content.js";
import { EventCalendarNav } from "../components/reui/event-calendar/event-calendar-nav.js";
import type {
  CalendarEvent,
  CalendarView,
} from "../components/reui/event-calendar/event-calendar-types.js";
import { Card, CardContent } from "../components/ui/card.js";

const VIEWS: CalendarView[] = ["month", "agenda"];
const READ_ONLY = { drag: false, resize: false, selectSlot: false };

const fixtureTitle = (fixture: FixtureView): string =>
  fixture.played
    ? `${fixture.homeClubName} ${fixture.homeGoals} - ${fixture.awayGoals} ${fixture.awayClubName}`
    : `${fixture.homeClubName} vs ${fixture.awayClubName}`;

const toEvent = (fixture: FixtureView): CalendarEvent<FixtureView> => {
  const start = parseISO(fixture.date);
  return {
    id: String(fixture.id),
    title: fixtureTitle(fixture),
    start,
    end: addDays(start, 1),
    allDay: true,
    readOnly: true,
    color: fixture.played ? "var(--color-muted-foreground)" : "var(--color-primary)",
    data: fixture,
  };
};

export const FixtureCalendar = ({
  fixtures,
  currentDate,
}: {
  readonly fixtures: ReadonlyArray<FixtureView>;
  /** ISO `YYYY-MM-DD`: the game date, which the calendar treats as today. */
  readonly currentDate: string;
}) => {
  const events = useMemo(() => fixtures.map(toEvent), [fixtures]);
  // Memoised: the calendar compares `now` by reference to decide whether its settings changed.
  const now = useMemo(() => parseISO(currentDate), [currentDate]);

  return (
    <Card className="mt-6 py-0">
      <CardContent className="p-0">
        <EventCalendar<FixtureView>
          events={events}
          views={VIEWS}
          defaultView="month"
          defaultDate={now}
          now={now}
          weekStartsOn={1}
          interactions={READ_ONLY}
          showDayAddButton={false}
          className="h-[640px] w-full"
        >
          <EventCalendarNav />
          <EventCalendarContent />
        </EventCalendar>
      </CardContent>
    </Card>
  );
};
