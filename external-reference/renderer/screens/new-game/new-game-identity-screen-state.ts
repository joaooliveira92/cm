export type NamingConvention = "historical" | "generated" | "custom";
export type ShipNameReuse = "allowed" | "disabled";
export type MeasurementSystem = "imperial" | "metric";

export interface IdentityFieldOption<V extends string> {
  readonly value: V;
  readonly label: string;
}

/** Single settled source of the §4 identity enums' {value → label} vocabulary (spec §4/§6). */
export const NAMING_CONVENTION_OPTIONS: ReadonlyArray<IdentityFieldOption<NamingConvention>> = [
  { value: "historical", label: "Historical" },
  { value: "generated", label: "Generated" },
  { value: "custom", label: "Custom" },
];

export const SHIP_NAME_REUSE_OPTIONS: ReadonlyArray<IdentityFieldOption<ShipNameReuse>> = [
  { value: "disabled", label: "Disabled" },
  { value: "allowed", label: "Allowed" },
];

export const MEASUREMENT_SYSTEM_OPTIONS: ReadonlyArray<IdentityFieldOption<MeasurementSystem>> = [
  { value: "imperial", label: "Imperial" },
  { value: "metric", label: "Metric" },
];

export interface CampaignIdentityDraft {
  readonly admiralName: string;
  readonly campaignName: string;
  readonly namingConvention: NamingConvention;
  readonly shipNameReuse: ShipNameReuse;
  readonly measurementSystem: MeasurementSystem;
}

const ADMIRAL_CAMPAIGN_NAME_MAX_LENGTH = 60;

export function defaultCampaignIdentity(): CampaignIdentityDraft {
  return {
    admiralName: "",
    campaignName: "",
    namingConvention: "historical",
    shipNameReuse: "disabled",
    measurementSystem: "imperial",
  };
}

export function isCampaignIdentityValid(identity: CampaignIdentityDraft): boolean {
  return identity.admiralName.trim().length > 0 && identity.campaignName.trim().length > 0;
}

export function updateCampaignIdentity<K extends keyof CampaignIdentityDraft>(
  identity: CampaignIdentityDraft,
  field: K,
  value: CampaignIdentityDraft[K],
): CampaignIdentityDraft {
  if (field === "admiralName" || field === "campaignName") {
    const trimmedLength = (value as string).length;
    if (trimmedLength > ADMIRAL_CAMPAIGN_NAME_MAX_LENGTH) return identity;
  }
  return { ...identity, [field]: value };
}
