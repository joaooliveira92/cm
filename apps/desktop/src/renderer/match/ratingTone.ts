/**
 * The one rating-tone helper (map ticket 10): maps a Match Rating into a theme text token in three
 * bands. Shared by the stats table's Rat column, the Ratings tab and (ticket 20) the Form tab, so a
 * 7.8 looks the same wherever it is drawn. The number is always printed beside the colour, so a
 * reader who cannot see the tone loses nothing.
 */
export const ratingTone = (rating: number): string => {
  if (rating < 6) return "text-text-muted";
  if (rating >= 7.5) return "text-text-highlight";
  return "text-text-primary";
};
