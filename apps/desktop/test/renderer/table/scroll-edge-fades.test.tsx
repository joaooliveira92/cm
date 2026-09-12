// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ColumnDef } from "@tanstack/react-table";
import { Table } from "../../../src/renderer/components/ui/table.js";
import { DataTable } from "../../../src/renderer/table/DataTable.js";
import { useDataTable, visibleRowIds } from "../../../src/renderer/table/useDataTable.js";
import type { TableRowShape } from "../../../src/renderer/table/types.js";

// jsdom has no layout: `scrollWidth` and `clientWidth` read 0, and writing
// `scrollLeft` never fires `scroll`. The scroll container gets a fixed viewport
// and a content width of one fixed-width slot per rendered header cell, so
// rows arriving and columns toggling change the overflow the way they do in a
// browser. Writes stay silent, as in jsdom: a browser fires `scroll` for a
// programmatic write on the next frame, and the re-render it causes commits
// after the first paint.
const CLIENT_WIDTH = 400;
const COLUMN_WIDTH = 200;
const METRICS = ["clientWidth", "scrollWidth", "scrollLeft"] as const;

const isScrollContainer = (element: Element): boolean =>
  element.hasAttribute("data-table-scroll");

const contentWidth = (element: Element): number =>
  Math.max(CLIENT_WIDTH, COLUMN_WIDTH * element.querySelectorAll("thead th").length);

const inherited = (key: (typeof METRICS)[number]): PropertyDescriptor =>
  Object.getOwnPropertyDescriptor(Element.prototype, key)!;

const stubScrollMetrics = (): void => {
  const offsets = new WeakMap<Element, number>();
  Object.defineProperties(HTMLDivElement.prototype, {
    clientWidth: {
      configurable: true,
      get(this: HTMLDivElement): number {
        return isScrollContainer(this) ? CLIENT_WIDTH : inherited("clientWidth").get!.call(this);
      },
    },
    scrollWidth: {
      configurable: true,
      get(this: HTMLDivElement): number {
        return isScrollContainer(this) ? contentWidth(this) : inherited("scrollWidth").get!.call(this);
      },
    },
    scrollLeft: {
      configurable: true,
      get(this: HTMLDivElement): number {
        return isScrollContainer(this) ? (offsets.get(this) ?? 0) : inherited("scrollLeft").get!.call(this);
      },
      set(this: HTMLDivElement, value: number): void {
        if (!isScrollContainer(this)) {
          inherited("scrollLeft").set!.call(this, value);
          return;
        }
        offsets.set(this, Math.min(Math.max(0, value), contentWidth(this) - CLIENT_WIDTH));
      },
    },
  });
};

const restoreScrollMetrics = (): void => {
  for (const key of METRICS) Reflect.deleteProperty(HTMLDivElement.prototype, key);
};

interface EdgeRow extends TableRowShape {
  readonly age: number;
}

const COLUMNS: ReadonlyArray<ColumnDef<EdgeRow, unknown>> = [
  { id: "name", header: "Name", accessorFn: (row) => `${row.firstName} ${row.lastName}` },
  { id: "age", header: "Age", accessorFn: (row) => row.age },
  { id: "pace", header: "Pace", accessorFn: () => 12 },
  { id: "passing", header: "Passing", accessorFn: () => 13 },
  { id: "tackling", header: "Tackling", accessorFn: () => 14 },
  { id: "finishing", header: "Finishing", accessorFn: () => 15 },
];

/** Six columns at 200px each: 1200px of content in a 400px viewport. */
const ALL_VISIBLE: Readonly<Record<string, boolean>> = {};
/** Two columns at 200px each: exactly fills the viewport, nothing overflows. */
const TWO_VISIBLE: Readonly<Record<string, boolean>> = {
  pace: false, passing: false, tackling: false, finishing: false,
};

const ROWS: ReadonlyArray<EdgeRow> = [
  { id: "p1", firstName: "Alan", lastName: "Player", positions: [{ position: "ST" }], age: 25 },
  { id: "p2", firstName: "Bob", lastName: "Player", positions: [{ position: "DC" }], age: 27 },
];

const noop = (): void => {};

const EdgeTable = (props: {
  readonly rows: ReadonlyArray<EdgeRow>;
  readonly columnVisibility?: Readonly<Record<string, boolean>>;
  readonly initialScrollLeft?: number;
}) => {
  const table = useDataTable<EdgeRow>({
    columns: COLUMNS,
    data: props.rows,
    sort: null,
    onSortChange: noop,
    columnVisibility: props.columnVisibility ?? ALL_VISIBLE,
  });
  const tableRows = table.getRowModel().rows;
  return (
    <DataTable
      tableId="squad" screen="edges" region="edgeTable" table={table}
      orderedIds={visibleRowIds(table)} identityColumnId="name"
      activeId={null} onActiveChange={noop} onBookmarkChange={noop}
      selectedId={null} onToggleSelection={noop} onSortChange={noop}
      ariaLabel="Edges" announcement="" initialScrollLeft={props.initialScrollLeft}
    >
      {tableRows.length > 0 && (
        <Table className="min-w-full text-left">
          <DataTable.Header table={table} />
          <DataTable.Body rows={tableRows} />
        </Table>
      )}
    </DataTable>
  );
};

const fadeOn = (side: "left" | "right"): boolean => {
  const fade = document.querySelector(`[data-scroll-edge="${side}"]`);
  if (fade === null) throw new Error(`no ${side} edge fade rendered`);
  const on = fade.classList.contains("opacity-100");
  const off = fade.classList.contains("opacity-0");
  if (on === off) throw new Error(`${side} edge fade is neither on nor off: ${fade.className}`);
  return on;
};

const fades = () => ({ left: fadeOn("left"), right: fadeOn("right") });

const scrollContainer = (): HTMLDivElement =>
  document.querySelector<HTMLDivElement>("[data-table-scroll]")!;

beforeEach(() => {
  cleanup();
  stubScrollMetrics();
});

afterEach(() => {
  cleanup();
  restoreScrollMetrics();
});

describe("the horizontal edge fades re-measure as the table changes", () => {
  it("follow the scroll position when the container scrolls", () => {
    render(<EdgeTable rows={ROWS} />);
    expect(fades()).toEqual({ left: false, right: true });

    scrollContainer().scrollLeft = 400;
    fireEvent.scroll(scrollContainer());
    expect(fades()).toEqual({ left: true, right: true });

    scrollContainer().scrollLeft = 800;
    fireEvent.scroll(scrollContainer());
    expect(fades()).toEqual({ left: true, right: false });

    scrollContainer().scrollLeft = 0;
    fireEvent.scroll(scrollContainer());
    expect(fades()).toEqual({ left: false, right: true });
  });

  it("turn the right fade on when rows arrive after mount", () => {
    const { rerender } = render(<EdgeTable rows={[]} />);
    expect(fades()).toEqual({ left: false, right: false });

    rerender(<EdgeTable rows={ROWS} />);
    expect(fades()).toEqual({ left: false, right: true });
  });

  it("turn the right fade on when hidden columns are shown", () => {
    const { rerender } = render(<EdgeTable rows={ROWS} columnVisibility={TWO_VISIBLE} />);
    expect(fades()).toEqual({ left: false, right: false });

    rerender(<EdgeTable rows={ROWS} columnVisibility={ALL_VISIBLE} />);
    expect(fades()).toEqual({ left: false, right: true });
  });

  it("show the left fade on a mount that restores a saved scroll offset", () => {
    render(<EdgeTable rows={ROWS} initialScrollLeft={400} />);
    expect(scrollContainer().scrollLeft).toBe(400);
    expect(fades()).toEqual({ left: true, right: true });
  });
});
