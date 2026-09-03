import {
  Ban,
  Citrus,
  DoorOpen,
  Flame,
  Gem,
  Orbit,
  Palette,
  Save,
  Settings,
  Sparkles,
  Waves,
} from "lucide-react";
import { BloomMenu } from "../../components/motion/bloom-menu.js";
import { PageHeader } from "../../components/shared/PageHeader.js";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog.js";
import { Button } from "../../components/ui/button.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card.js";
import type { BackgroundStyle } from "../../shell/BackgroundContext.js";
import { useBackground } from "../../shell/BackgroundContext.js";

export interface OptionsScreenProps {
  readonly saving: boolean;
  readonly onSave: () => void;
  readonly onCloseCampaign: () => void;
}

const BACKGROUND_OPTIONS: {
  label: string;
  value: BackgroundStyle;
  icon: typeof Waves;
}[] = [
  { label: "Water", value: "water", icon: Waves },
  { label: "Starfield", value: "stars", icon: Sparkles },
  { label: "Mesh - Citrus", value: "mesh-citrus", icon: Citrus },
  { label: "Mesh - Lagoon", value: "mesh-lagoon", icon: Gem },
  { label: "Auralis", value: "auralis", icon: Flame },
  { label: "Nebulore", value: "nebulore", icon: Orbit },
  { label: "None", value: "none", icon: Ban },
];

export function OptionsScreen({ saving, onSave, onCloseCampaign }: OptionsScreenProps) {
  const { background, setBackground } = useBackground();
  const activeOption =
    BACKGROUND_OPTIONS.find((option) => option.value === background) ?? BACKGROUND_OPTIONS[0];
  const activeLabel = activeOption?.label ?? "Background";
  const activeIcon = activeOption?.icon ?? Palette;

  return (
    <div className="space-y-6">
      <PageHeader icon={Settings} title="Options" description="Campaign-level actions." />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Background</CardTitle>
          <CardDescription>Choose the animated backdrop behind the app.</CardDescription>
        </CardHeader>
        <CardContent>
          <BloomMenu
            title={activeLabel}
            triggerIcon={activeIcon}
            selected={activeLabel}
            items={BACKGROUND_OPTIONS.map((option) => ({
              label: option.label,
              icon: option.icon,
            }))}
            onSelect={(label) => {
              const option = BACKGROUND_OPTIONS.find((candidate) => candidate.label === label);
              if (option !== undefined) setBackground(option.value);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Save Campaign</CardTitle>
          <CardDescription>Write the current campaign state to its package file.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="default" onClick={onSave} disabled={saving}>
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Close Campaign</CardTitle>
          <CardDescription>Return to the campaign file screen.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="outline">
                  <DoorOpen className="h-3.5 w-3.5" />
                  Close Campaign
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Close this campaign?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will be returned to the campaign file screen. Unsaved progress may be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onCloseCampaign}>Close Campaign</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
