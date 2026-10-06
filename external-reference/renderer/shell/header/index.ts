import { HeaderChrome } from "./HeaderChrome.js";
import { HeaderNav } from "./HeaderNav.js";
import { HeaderSearch } from "./HeaderSearch.js";
import { HeaderSecondaryRow } from "./HeaderSecondaryRow.js";
import { HeaderTitle } from "./HeaderTitle.js";
import { HeaderWindowControls } from "./HeaderWindowControls.js";

export const Header = {
  Nav: HeaderNav,
  Title: HeaderTitle,
  Search: HeaderSearch,
  Chrome: HeaderChrome,
  WindowControls: HeaderWindowControls,
  SecondaryRow: HeaderSecondaryRow,
};

export {
  HeaderChrome,
  HeaderNav,
  HeaderSearch,
  HeaderSecondaryRow,
  HeaderTitle,
  HeaderWindowControls,
};
export type { HeaderNavProps, NavAction } from "./HeaderNav.js";
