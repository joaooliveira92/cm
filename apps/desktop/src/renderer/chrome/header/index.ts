/**
 * The header parts, exposed as one namespace so a shell composes a band by
 * naming its zones (`Header.Nav`, `Header.Title`, `Header.SecondaryRow`) rather
 * than by importing five files and remembering their order. Adapted from the
 * reference app's `shell/header` set.
 *
 * One part of that set was deliberately not brought over: the window-control
 * cluster, which needs a window-control IPC channel this app has no reason to
 * open — macOS keeps its native traffic lights under `titleBarStyle:
 * "hiddenInset"`, and every other platform keeps its own frame. The theme
 * cycler is also absent: it needs a theme other than the one this app has.
 */
import { AppTitleBar } from "./AppTitleBar.js";
import { HeaderNav } from "./HeaderNav.js";
import { HeaderSearch } from "./HeaderSearch.js";
import { HeaderSecondaryRow } from "./HeaderSecondaryRow.js";
import { HeaderTitle } from "./HeaderTitle.js";
import { ShellHeader } from "./ShellHeader.js";

export const Header = {
  TitleBar: AppTitleBar,
  Nav: HeaderNav,
  Title: HeaderTitle,
  Search: HeaderSearch,
  SecondaryRow: HeaderSecondaryRow,
  Shell: ShellHeader,
};

export { AppTitleBar, HeaderNav, HeaderSearch, HeaderSecondaryRow, HeaderTitle, ShellHeader };
export type { AppTitleBarProps } from "./AppTitleBar.js";
export type { HeaderNavProps, NavAction } from "./HeaderNav.js";
export type { HeaderSecondaryRowProps } from "./HeaderSecondaryRow.js";
export type { HeaderTitleProps } from "./HeaderTitle.js";
export type { ShellHeaderProps } from "./ShellHeader.js";
