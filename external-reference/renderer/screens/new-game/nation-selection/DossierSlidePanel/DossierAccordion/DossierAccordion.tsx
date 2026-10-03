import { Anchor, Coins, Scroll } from "lucide-react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useMemo,
  useRef,
  useState,
} from "react";
import { DossierAccordionItem } from "./DossierAccordionItem.js";
import type { DossierSection, DossierSectionId } from "./types.js";

interface DossierAccordionProps {
  economy: ReactNode;
  military: ReactNode;
  diplomacy: ReactNode;
}

const COLLAPSED_TAB_WIDTH = "clamp(2.75rem, 5vw, 3.5rem)";

function getGridTemplate(expandedIndex: number): string {
  return [0, 1, 2]
    .map((index) => (index === expandedIndex ? "minmax(0, 1fr)" : COLLAPSED_TAB_WIDTH))
    .join(" ");
}

export function DossierAccordion({
  economy,
  military,
  diplomacy,
}: DossierAccordionProps): React.JSX.Element {
  const [expanded, setExpanded] = useState<DossierSectionId>("economy");
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const sections = useMemo<DossierSection[]>(
    () => [
      {
        id: "economy",
        label: "Economy",
        text: economy,
        icon: Coins,
        accent: "gold",
      },
      {
        id: "military",
        label: "Military",
        text: military,
        icon: Anchor,
        accent: "red",
      },
      {
        id: "diplomacy",
        label: "Diplomacy",
        text: diplomacy,
        icon: Scroll,
        accent: "blue",
      },
    ],
    [economy, military, diplomacy],
  );

  const expandedIndex = sections.findIndex((section) => section.id === expanded);

  const gridStyle = {
    gridTemplateColumns: getGridTemplate(expandedIndex),
  } satisfies CSSProperties;

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    let target: number | null = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      target = (index + 1) % sections.length;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      target = (index - 1 + sections.length) % sections.length;
    }

    if (event.key === "Home") target = 0;
    if (event.key === "End") target = sections.length - 1;

    if (target !== null) {
      event.preventDefault();
      buttonRefs.current[target]?.focus();
    }
  };

  return (
    <div className="grid h-[15rem] min-h-0 w-full overflow-hidden sm:h-[10rem]" style={gridStyle}>
      {sections.map((section, index) => (
        <DossierAccordionItem
          key={section.id}
          ref={(node) => {
            buttonRefs.current[index] = node;
          }}
          section={section}
          state={expanded === section.id ? "expanded" : "collapsed"}
          onSelect={() => setExpanded(section.id)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        />
      ))}
    </div>
  );
}
