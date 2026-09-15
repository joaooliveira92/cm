import { Check, ChevronLeft, Sparkles } from "lucide-react";
import type { JSX } from "react";
import { Button } from "@/components/ui/button.js";
import type { PlayableSlotCountryId } from "@/content/nationAssetManifest.js";

interface DossierControlsProps {
  countryId: PlayableSlotCountryId;
  nationName: string;
  onChangeNation: () => void;
  onConfirm: (countryId: PlayableSlotCountryId) => void;
  onRecommendedSetup: (countryId: PlayableSlotCountryId) => void;
}

export function DossierControls({
  countryId,
  nationName,
  onChangeNation,
  onConfirm,
  onRecommendedSetup,
}: DossierControlsProps): JSX.Element {
  return (
    <footer className="flex flex-col gap-2 border-t border-[#d4a359]/20 bg-black/25 px-4 py-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onChangeNation}
        className="w-full shrink-0 gap-2 font-mono text-xs font-black uppercase tracking-[0.12em] text-[#b4c1ce] hover:bg-white/5 hover:text-[#ece5d8] sm:w-auto"
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Change Nation
      </Button>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onRecommendedSetup(countryId)}
          className="w-full shrink-0 gap-2 border-[#d4a359]/40 bg-transparent px-4 font-mono text-xs font-black uppercase tracking-[0.12em] text-[#d4a359] hover:bg-[#d4a359]/10 sm:w-auto"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Recommended Setup
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => onConfirm(countryId)}
          className="w-full shrink-0 gap-2 border border-[#d4a359] bg-[#d4a359] px-4 font-mono text-xs font-black uppercase tracking-[0.12em] text-[#05080e] hover:bg-[#e6ba70] sm:w-auto"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Continue as {nationName}
        </Button>
      </div>
    </footer>
  );
}
