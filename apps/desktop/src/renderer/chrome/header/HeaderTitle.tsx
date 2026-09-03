/**
 * The centred title, and the shell's `h1`: it is the name of the surface the
 * user is on, so it stays a heading even though it is styled as chrome. The
 * career shell passes an identity instead and keeps its screens' own headings.
 * Absolutely positioned so it stays optically centred in the
 * band regardless of how wide the left and right clusters grow, and
 * pointer-transparent so it never eats a click meant for the band beneath it.
 * The containing band must be `relative`.
 */
export interface HeaderTitleProps {
  readonly title: string;
  /**
   * False when the shell already has a page heading of its own — the main
   * menu's identity block, or a career screen's `h1`. Two `h1`s naming the same
   * surface is worse than a band that is only chrome.
   */
  readonly asHeading?: boolean;
}

const TITLE_CLASS =
  "max-w-[150px] truncate text-sm font-medium text-text-secondary select-none sm:max-w-[280px]";

export const HeaderTitle = ({ title, asHeading = true }: HeaderTitleProps) => (
  <div className="pointer-events-none absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center justify-center">
    {asHeading ? (
      <h1 className={TITLE_CLASS}>{title}</h1>
    ) : (
      <p className={TITLE_CLASS}>{title}</p>
    )}
  </div>
);
