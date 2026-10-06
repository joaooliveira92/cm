import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";

export interface DetailCardProps {
  readonly title: string;
  readonly className?: string;
  readonly contentClassName?: string;
  readonly children: ReactNode;
}

/** One titled block of the club profile: the overline heading every profile card shares. */
export const DetailCard = ({ title, className = "mb-3", contentClassName = "pb-2", children }: DetailCardProps) => (
  <Card className={className}>
    <CardHeader className="pb-2 pt-2">
      <CardTitle className="text-overline uppercase text-text-muted">{title}</CardTitle>
    </CardHeader>
    <CardContent className={contentClassName}>{children}</CardContent>
  </Card>
);
