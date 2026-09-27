import { format, parseISO } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../components/ui/button.js";
import { Calendar } from "../components/ui/calendar.js";
import { Label } from "../components/ui/label.js";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover.js";

/** The earliest birth year the picker navigates back to. A fixed floor rather than an age rule:
 *  the date picker constrains the input, and nothing in the simulation reads the manager's age. */
const EARLIEST_BIRTH_YEAR = 1930;

/**
 * The manager's date of birth, as the shadcn Date Picker: a `Popover` over a `Calendar`.
 *
 * The value crosses this field's boundary as an ISO `YYYY-MM-DD` string — the same shape
 * `players.date_of_birth` and `manager_profile.date_of_birth` store — so nothing downstream has to
 * know a `Date` was ever involved. The picker refuses future dates.
 */
export const DateOfBirthField = ({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (isoDate: string) => void;
}) => {
  const [open, setOpen] = useState(false);

  // A birth date cannot be in the future. The bound is computed once per mount rather than per
  // render; it is a UI affordance, not a game-clock fact, so the wall clock is the right source.
  const { today, startMonth } = useMemo(() => {
    const now = new Date();
    return {
      today: now,
      startMonth: new Date(EARLIEST_BIRTH_YEAR, 0, 1),
    };
  }, []);

  const selected = value.length > 0 ? parseISO(value) : undefined;

  return (
    <div>
      <Label className="block">Date of birth</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              aria-label="Date of birth"
              data-empty={selected === undefined}
              className="mt-2 w-full justify-start font-normal data-[empty=true]:text-text-muted"
            />
          }
        >
          <CalendarIcon />
          {selected ? format(selected, "d MMM yyyy") : "Select a date"}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={selected}
            defaultMonth={selected ?? new Date(1985, 0)}
            startMonth={startMonth}
            endMonth={today}
            disabled={{ after: today }}
            onSelect={(date) => {
              onChange(date ? format(date, "yyyy-MM-dd") : "");
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
