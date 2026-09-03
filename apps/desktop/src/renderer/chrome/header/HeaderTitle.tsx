/**
 * The centred title. Absolutely positioned so it stays optically centred in the
 * band regardless of how wide the left and right clusters grow, and
 * pointer-transparent so it never eats a click meant for the band beneath it.
 * The containing band must be `relative`.
 */
export interface HeaderTitleProps {
  readonly title: string;
}

export const HeaderTitle = ({ title }: HeaderTitleProps) => (
  <div className="pointer-events-none absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center justify-center">
    <span className="max-w-[150px] truncate text-sm font-medium text-text-secondary select-none sm:max-w-[280px]">
      {title}
    </span>
  </div>
);
