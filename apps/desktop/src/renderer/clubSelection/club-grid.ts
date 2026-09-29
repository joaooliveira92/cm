/** The club table's CSS-Grid columns: identity, stature, squad quality. The identity column takes
 *  the flexible width; stature and quality stay fixed so their labels and badges never wrap. */
const CLUB_GRID_TEMPLATE = "grid-cols-[minmax(0,1fr)_4.5rem_6.5rem]";

/** The grid shared by the header row and every body row, so the columns line up. */
export const CLUB_ROW_GRID = `grid items-center gap-2 px-3 py-1.5 ${CLUB_GRID_TEMPLATE}`;
