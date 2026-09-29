import { cn } from "../lib/utils.js";

/**
 * The manager's avatar: their initials over the accent scheme chosen at creation, standing in for a
 * portrait until an asset set exists. The colours are the ones stored on `manager_profile`
 * (`avatarPrimaryColor` as the field, `avatarSecondaryColor` as the text and rim), so the same
 * choice the Style & Appearance panel collected is what draws here.
 *
 * `role="img"` with the manager's name as its label, so the initials are decorative and a screen
 * reader reads the name once rather than spelling the letters.
 */
export const ManagerAvatar = ({
  firstName,
  lastName,
  primary,
  secondary,
  size = "md",
}: {
  readonly firstName: string;
  readonly lastName: string;
  readonly primary: string;
  readonly secondary: string;
  readonly size?: "md" | "lg";
}) => {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?";
  const name = `${firstName} ${lastName}`.trim();

  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border-2 font-bold select-none",
        size === "lg" ? "size-14 text-heading" : "size-10 text-body",
      )}
      style={{ backgroundColor: primary, color: secondary, borderColor: secondary }}
    >
      {initials}
    </span>
  );
};
