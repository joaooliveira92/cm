import { useCallback, useState } from "react";
import type { BadgeKey } from "@cm-clone/shared";
import type { ClubColoursView } from "@cm-clone/contracts";
import { badgeUrl } from "../../assets/clubBadges.js";

export interface ClubBadgeProps {
  readonly badgeKey: BadgeKey | null;
  readonly colours: ClubColoursView;
  readonly clubName: string;
  /** Square side in CSS pixels. Defaults to 28. */
  readonly size?: number;
}

const initials = (name: string): string => {
  const words = name.split(/[\s&]+/);
  const first = words[0]!.charAt(0).toUpperCase();
  const last = words.length > 1 ? words[words.length - 1]!.charAt(0).toUpperCase() : "";
  return first + last;
};

/**
 * A club's badge, fitted inside a square box without stretching. When the badge key is null or
 * unknown, or when the image fails to load, it draws a shield in the club's primary colour pair
 * with the club's initials.
 */
export const ClubBadge = ({ badgeKey, colours, clubName, size = 28 }: ClubBadgeProps) => {
  const [failed, setFailed] = useState(false);
  const url = badgeKey === null ? null : badgeUrl(badgeKey);
  const showImage = url !== null && !failed;

  const handleError = useCallback(() => setFailed(true), []);

  if (showImage) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center overflow-hidden"
        style={{ width: size, height: size }}
      >
        <img
          src={url}
          alt={`${clubName} badge`}
          className="h-full w-full"
          style={{ objectFit: "contain" }}
          onError={handleError}
        />
      </span>
    );
  }

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xs text-center text-2xs font-bold leading-none select-none"
      style={{
        width: size,
        height: size,
        backgroundColor: colours.primary.background,
        color: colours.primary.foreground,
      }}
      aria-label={`${clubName} crest`}
      role="img"
    >
      {initials(clubName)}
    </span>
  );
};