# Screen 17: Display and Sound Options

> **Clean-room notice:** This specification describes an original football-management simulation workflow inspired by early-2000s management games. It must not be used to copy proprietary artwork, databases, source code, logos, exact interface wording, or other protected assets. Use an original visual identity and fictional or properly licensed football data.

---

## 1. Purpose

The **Display and Sound Options** screen configures audiovisual presentation, output devices, rendering behavior, and related accessibility features.

It may be opened from the Main Menu, Game Preferences, an active career, first-run setup, or a display-recovery mode.

The screen must allow the user to:

- Select windowed, borderless, or exclusive fullscreen display modes where supported.
- Select an approved monitor and resolution.
- Configure refresh and frame-pacing behavior.
- Configure hardware acceleration and renderer options.
- Configure interface rendering quality and animation behavior.
- Preview brightness, contrast, gamma, scale, and display-mode changes safely.
- Configure master, music, interface, match, commentary, notification, and ambient sound levels.
- Select an audio output device where supported.
- Test audio channels without exposing private gameplay information.
- Configure mute behavior when unfocused or minimized.
- Configure captions, visual sound cues, mono output, and reduced sensory effects.
- Identify changes that apply immediately, require renderer restart, or require application restart.
- Recover automatically from an invalid or invisible display configuration.
- Apply settings atomically and cancel uncommitted previews safely.

This screen controls presentation only. It must not alter canonical football simulation outcomes.

---

## 2. Entry contexts

```text
Main Menu
  -> Preferences
  -> Display and Sound
```

```text
Active Career
  -> Application Menu
  -> Display and Sound
```

```text
Application Startup
  -> Previous display configuration failed
  -> Safe Display Recovery
  -> Display and Sound
```

```text
Keyboard Shortcut
  -> Toggle fullscreen
  -> Apply safe predefined transition
```

The available settings depend on platform capability, connected devices, permission, and runtime state.

---

## 3. Core concepts

### 3.1 Display mode

```typescript
type DisplayMode = "windowed" | "borderless_fullscreen" | "exclusive_fullscreen";
```

Exclusive fullscreen should appear only on supported platforms.

### 3.2 Display target

A display target is a connected monitor or virtual display exposed through a stable runtime identifier.

### 3.3 Display configuration

A display configuration combines target, mode, resolution, refresh behavior, renderer scale, and related presentation settings.

### 3.4 Preview transaction

A preview transaction applies a reversible temporary configuration and requires explicit confirmation before it becomes persistent.

### 3.5 Safe display configuration

A safe configuration is a conservative fallback expected to remain visible and usable on the current primary display.

### 3.6 Audio channel

An audio channel is a logical category with an independently configurable level.

### 3.7 Audio output device

An output device is an operating-system audio endpoint. It may appear, disappear, or change while the screen is open.

### 3.8 Sensory accessibility setting

A sensory accessibility setting reduces motion, flashing, sudden volume changes, stereo separation, or other effects without removing essential information.

---

## 4. Conceptual desktop layout

```text
+--------------------------------------------------------------------------------+
| DISPLAY AND SOUND OPTIONS                                                      |
|--------------------------------------------------------------------------------|
| [Display] [Rendering] [Sound] [Accessibility]                                  |
|--------------------------------------------------------------------------------|
| DISPLAY                                                                        |
|                                                                                |
| Monitor                  [Primary Display v]                                   |
| Display mode             [Borderless Fullscreen v]                             |
| Resolution               [1920 x 1080 v]                                       |
| Refresh behavior         [Match display v]                                     |
| Frame pacing             [Balanced v]                                          |
| Interface scale          [125% v]                                              |
|                                                                                |
| Brightness               [--------o-----] 100%                                 |
| Contrast                 [-------o------] 100%                                 |
|                                                                                |
| [Preview Display Changes]                                                      |
|                                                                                |
| Current renderer: Hardware accelerated                                         |
| Some rendering changes require restart.                                        |
|--------------------------------------------------------------------------------|
| [Cancel] [Restore Display Defaults]                     [Apply] [Apply & Close]|
+--------------------------------------------------------------------------------+
```

Sound tab:

```text
SOUND

Output device            [System Default v]
Master volume             [----------o---] 80%
Music                     [--------o-----] 60%
Interface sounds          [---------o----] 70%
Match sounds              [----------o---] 80%
Notifications             [---------o----] 70%

[x] Mute when application is minimized
[x] Lower music during spoken commentary

[Test Interface Sound] [Test Match Atmosphere]
```

These diagrams define behavior and hierarchy, not exact styling.

---

## 5. Screen regions

### 5.1 Header

Display:

- `Display and Sound Options`.
- Current platform or safe-mode state where useful.
- Unsaved-change indicator.
- Close or Back action.

### 5.2 Section navigation

Recommended sections:

- Display.
- Rendering.
- Sound.
- Accessibility.

### 5.3 Settings panel

Contains controls, descriptions, capability states, restart indicators, and validation messages.

### 5.4 Preview area

Displays synthetic interface examples, calibration images, and test controls.

### 5.5 Footer actions

Recommended actions:

- `Cancel`
- `Restore Section Defaults`
- `Apply`
- `Apply and Close`

---

## 6. Display-capability model

```typescript
interface DisplayCapabilities {
  readonly displayTargets: readonly DisplayTarget[];
  readonly supportedModes: readonly DisplayMode[];
  readonly resolutionsByDisplayId: Readonly<Record<string, readonly DisplayResolution[]>>;
  readonly refreshRatesByDisplayAndResolution: Readonly<Record<string, readonly number[]>>;
  readonly supportsVariableRefreshRate: boolean;
  readonly supportsHighDynamicRange: boolean;
  readonly supportsExclusiveFullscreen: boolean;
  readonly minimumSafeViewport: ViewportSize;
  readonly maximumRendererScale: number;
  readonly capabilityRevision: number;
}
```

Capabilities must come from a trusted platform adapter. The renderer must not invent available modes.

---

## 7. Display target selection

Each display target may include:

```typescript
interface DisplayTarget {
  readonly displayId: string;
  readonly displayName: string;
  readonly primary: boolean;
  readonly physicalResolution: DisplayResolution;
  readonly workArea: ViewportRectangle;
  readonly scaleFactor: number;
  readonly connected: boolean;
}
```

Requirements:

- Use stable runtime IDs where available.
- Label the primary display.
- Distinguish displays with identical names using safe ordinal or resolution context.
- Revalidate immediately before preview or Apply.
- Fall back to the current primary display if the chosen target disappears.

---

## 8. Display modes

### 8.1 Windowed

- Uses a movable resizable application window.
- Resolution describes the client-area target or remembered window size.
- Must enforce a minimum usable viewport.
- Remembers valid position without restoring entirely off-screen.

### 8.2 Borderless fullscreen

- Covers the selected display's usable or full area according to platform behavior.
- Normally uses the display's active resolution.
- Switching is usually safer and faster than exclusive fullscreen.

### 8.3 Exclusive fullscreen

- Uses an exclusive display mode where supported.
- Requires stronger preview and recovery behavior.
- May require renderer or application restart.
- Must revert safely if the mode fails.

---

## 9. Resolution selection

The resolution selector must show only supported values for the selected display and mode.

Possible labels:

```text
1920 x 1080, native
1600 x 900
1280 x 720
```

Rules:

- Mark native resolution.
- Reject viewports below the configured minimum.
- Use actual platform capabilities.
- Do not apply the change permanently before preview confirmation when risk exists.
- Keep interface scale separate from physical resolution.

---

## 10. Refresh behavior

Recommended options:

```typescript
type RefreshBehavior = "system_default" | "match_display" | "explicit_rate";
```

If explicit rates are exposed, list only supported display and resolution combinations.

The application is primarily data-driven and should not imply that a high refresh rate changes simulation accuracy.

---

## 11. Frame pacing

Suggested profiles:

```typescript
type FramePacingProfile = "power_saver" | "balanced" | "smooth" | "display_synchronized";
```

Frame pacing may affect:

- Animation smoothness.
- Power consumption.
- GPU activity.
- Match-view presentation.

It must not affect canonical match or world simulation results.

---

## 12. Interface scale integration

Interface scale may be exposed here and in Game Preferences, but it represents one shared preference definition.

Requirements:

- Keep one canonical preference ID.
- Synchronize draft values across both screens.
- Preview safely.
- Ensure a visible confirmation action remains on screen.
- Revert an inaccessible preview automatically.

---

## 13. Safe display preview

Risky display changes must use a preview transaction.

```text
Keep these display settings?

The previous settings will be restored in 15 seconds.

[Revert] [Keep Settings]
```

The timeout value comes from a named safety policy.

```typescript
interface DisplayPreviewPolicy {
  readonly confirmationTimeoutMs: number;
  readonly minimumVisibleConfirmationArea: number;
  readonly fallbackDisplayMode: DisplayMode;
  readonly fallbackResolutionPolicyId: string;
  readonly revertOnFocusLoss: boolean;
}
```

---

## 14. Preview transaction

```typescript
interface DisplayPreviewTransaction {
  readonly previewId: string;
  readonly priorConfiguration: DisplayConfiguration;
  readonly proposedConfiguration: DisplayConfiguration;
  readonly startedAt: string;
  readonly expiresAt: string;
  readonly capabilityRevision: number;
  readonly state:
    "applying" | "awaiting_confirmation" | "confirmed" | "reverting" | "reverted" | "failed";
}
```

If confirmation is not received, revert automatically.

---

## 15. Display Configuration

```typescript
interface DisplayConfiguration {
  readonly displayId: string;
  readonly mode: DisplayMode;
  readonly resolution: DisplayResolution;
  readonly refreshBehavior: RefreshBehavior;
  readonly explicitRefreshRateHz?: number;
  readonly framePacingProfileId: FramePacingProfile;
  readonly interfaceScaleProfileId: string;
  readonly brightnessProfileId: string;
  readonly contrastProfileId: string;
  readonly highDynamicRangeEnabled: boolean;
}
```

Unsupported field combinations must be rejected in a trusted process.

---

## 16. Window position recovery

When restoring windowed mode:

- Verify the saved display still exists.
- Intersect the remembered bounds with a connected display work area.
- Keep a configured minimum title-bar or drag region visible.
- Recenter when the prior position is invalid.
- Respect operating-system accessibility features.

Do not allow an off-screen window to make the application appear unavailable.

---

## 17. Brightness and contrast

Brightness and contrast controls should modify application rendering only unless the platform provides an approved system integration.

Requirements:

- Use a neutral calibration preview.
- Preserve readable text contrast.
- Prevent values that make confirmation controls invisible.
- Keep high-contrast mode authoritative over conflicting decorative values.
- Use named profiles or bounded values from policy.

---

## 18. Gamma and HDR

If supported:

- Expose only when the display and renderer support it.
- Mark restart or mode requirements.
- Use a calibration preview.
- Revalidate after display changes.
- Fall back safely after renderer failure.

HDR must not be enabled merely because the operating system reports capability if the renderer cannot produce valid output.

---

## 19. Rendering section

Possible settings:

- Hardware acceleration.
- Rendering backend.
- Texture or image quality.
- Animation quality.
- UI antialiasing.
- Match-view rendering quality.
- Maximum presentation frame rate.
- Background rendering.
- Reduced graphical effects.

Expose only settings users can understand and the application can validate safely.

---

## 20. Hardware acceleration

Possible values:

```typescript
type HardwareAccelerationPreference = "automatic" | "enabled" | "disabled";
```

Requirements:

- Mark application-restart requirement when necessary.
- Record renderer startup failures.
- Offer safe software fallback.
- Do not make acceleration mandatory for core data-management screens.

---

## 21. Renderer backend

If several backends are supported, use stable IDs and clear compatibility descriptions.

```typescript
interface RendererBackendOption {
  readonly backendId: string;
  readonly displayName: string;
  readonly available: boolean;
  readonly restartRequired: boolean;
  readonly supportStatus: "recommended" | "supported" | "experimental";
  readonly reasonCodes: readonly string[];
}
```

Do not expose internal command-line arguments.

---

## 22. Interface rendering quality

Suggested profiles:

- Performance.
- Balanced.
- High quality.

They may influence:

- Image scaling.
- Shadow complexity.
- Decorative transparency.
- Animation detail.

They must not reduce legibility or remove essential state indicators.

---

## 23. Match-view presentation quality

This setting affects only visual presentation of the match view.

Possible profiles:

- Minimal.
- Standard.
- Enhanced.

It must not change the match-engine decision model or result.

---

## 24. Rendering restart behavior

When an applied setting requires restart:

```text
Restart required to apply hardware acceleration changes.

[Restart Now] [Later]
```

If a career is active and has unsaved progress, `Restart Now` must route through Save and Quit.

---

## 25. Renderer startup recovery

If the application fails after a display or renderer change:

1. Detect an unclean renderer startup marker.
2. Start with a conservative safe configuration.
3. Disable the suspected backend or feature temporarily.
4. Notify the user.
5. Offer review of the failed settings.

```text
The previous display configuration could not be started safely.

The application is using a windowed software-rendered configuration.
```

---

## 26. Audio channel model

Recommended channels:

```typescript
type AudioChannelId =
  "master" | "music" | "interface" | "match" | "commentary" | "notifications" | "ambient";
```

Each channel has a policy-defined range and step size.

---

## 27. Audio configuration

```typescript
interface AudioConfiguration {
  readonly outputDeviceId: string;
  readonly channelLevels: Readonly<Record<AudioChannelId, number>>;
  readonly muted: boolean;
  readonly muteWhenMinimized: boolean;
  readonly muteWhenUnfocused: boolean;
  readonly lowerMusicDuringCommentary: boolean;
  readonly dynamicRangeProfileId: string;
  readonly stereoMode: "stereo" | "mono";
  readonly captionsEnabled: boolean;
  readonly visualSoundCuesEnabled: boolean;
}
```

Channel levels should use normalized domain values and localized percentage display.

---

## 28. Master volume

Master volume scales all sound channels without rewriting their individual levels.

Muting master volume must preserve channel values for later restoration.

---

## 29. Channel volume sliders

Each slider must:

- Have a persistent label.
- Show a value.
- Support keyboard changes.
- Use policy-defined increments.
- Preview changes without sudden excessive output.
- Respect master mute.

The system should avoid playing repeated test sounds on every tiny slider movement unless the user explicitly initiates a test.

---

## 30. Background music

Possible settings:

- Enabled.
- Volume.
- Play on Main Menu.
- Play during career screens.
- Pause during match view.
- Lower during commentary.
- Track-change behavior.

Use original or properly licensed music only.

---

## 31. Interface sounds

Examples:

- Button activation.
- Warning.
- Success.
- Navigation.
- Save completion.

No interface sound may be the sole carrier of information.

---

## 32. Match sounds

Examples:

- Crowd atmosphere.
- Whistle.
- Ball impact.
- Goal reaction.
- Weather ambience.

The product must use original or licensed audio assets.

Match-sound settings must not affect simulated match events.

---

## 33. Commentary audio

If spoken commentary exists:

- Expose its own channel.
- Support captions.
- Support lowering music during speech.
- Support language and voice selection through approved content where applicable.
- Avoid implying every text-commentary message has spoken audio.

---

## 34. Notification sounds

Notification-sound preferences should integrate with Game Preferences.

Examples:

- Inbox priority alert.
- Match reminder.
- Multiplayer turn ready.
- Save failure.

Privacy mode may suppress sounds or use a neutral cue on shared devices.

---

## 35. Output-device selection

```typescript
interface AudioOutputDevice {
  readonly deviceId: string;
  readonly displayName: string;
  readonly systemDefault: boolean;
  readonly available: boolean;
  readonly channelCapabilities: readonly string[];
}
```

Requirements:

- Include System Default.
- Handle hot-plugging.
- Revalidate before Apply.
- Fall back to System Default if the selected device disappears.
- Preserve the user's preference for later reconnection only if policy supports it.

---

## 36. Audio test controls

Recommended tests:

- Interface cue.
- Notification cue.
- Match atmosphere.
- Commentary sample, if available.
- Left and right channel test.

Tests must:

- Use synthetic or approved test assets.
- Respect master volume and mute state unless explicitly explaining otherwise.
- Stop when the screen closes.
- Avoid loops and unexpectedly loud output.
- Provide captions or visual labels.

---

## 37. Dynamic range

Suggested profiles:

- Night.
- Standard.
- Wide.

Night mode reduces sudden differences between quiet and loud sounds.

The labels and processing must be explained without claiming medical benefits.

---

## 38. Mute behavior

Possible settings:

- Global mute.
- Mute when minimized.
- Mute when unfocused.
- Pause music when unfocused.
- Preserve critical visual notifications.

Muting must never suppress textual or visual error messages.

---

## 39. Mono audio

Mono mode combines relevant stereo information so essential cues are not isolated to one channel.

It must not simply discard one side.

---

## 40. Captions and visual sound cues

Captions may represent:

- Spoken commentary.
- Match atmosphere events.
- Important navigation sounds.
- Notification cues.

Visual sound cues should be subtle, configurable, and nonflashing by default.

Example:

```text
[Whistle]
[Crowd cheers]
[High-priority inbox alert]
```

---

## 41. Sensory accessibility

Recommended settings:

- Reduced motion.
- Reduced flashing.
- Reduced sudden brightness.
- Reduced sudden volume.
- Mono audio.
- Captions.
- Visual sound cues.
- Simplified match effects.
- Persistent rather than transient notifications.

Accessibility settings should override lower-priority decorative settings safely.

---

## 42. Flashing and brightness policy

The interface should avoid rapid flashing by default.

If a match effect could flash:

- Provide a reduced-flashing mode.
- Replace it with a static highlight.
- Preserve event information through text.
- Do not require users to endure a preview to disable it.

---

## 43. Sound accessibility preview

Use a small controlled preview:

```text
Visual cue: Goal event
Caption: [Crowd celebrates]
Audio: Optional test button
```

Do not trigger audio automatically when the tab opens.

---

## 44. Setting ownership and scope

Display and audio preferences are generally device-scoped.

Possible exceptions:

- Account-synchronized theme.
- Account-synchronized accessibility preferences.
- Manager-specific notification sounds.

```typescript
interface AudiovisualPreferenceScopePolicy {
  readonly displayScope: "device";
  readonly audioDeviceScope: "device";
  readonly audioLevelScope: "device" | "account";
  readonly accessibilityScope: "device" | "account";
}
```

Cloud synchronization must not force an unavailable monitor or audio device ID onto another device.

---

## 45. Dirty and preview states

```typescript
type AudiovisualOptionsState =
  | "unchanged"
  | "modified"
  | "previewing_display"
  | "previewing_audio"
  | "validating"
  | "applying"
  | "applied"
  | "apply_failed"
  | "reverting";
```

Display preview state and ordinary preference dirty state must remain distinct.

---

## 46. Apply behavior

Selecting `Apply` must:

1. Stop transient audio tests.
2. Commit active controls.
3. Refresh display and audio capabilities.
4. Validate every changed value.
5. Validate cross-setting dependencies.
6. Build an authoritative application plan.
7. Run a display preview where required.
8. Persist confirmed preferences atomically.
9. Apply immediate audio and rendering values.
10. Record restart-required values.
11. Update effective configuration.
12. Keep the screen open.

---

## 47. Cancel behavior

Cancel must:

- Stop audio tests.
- Revert active display preview.
- Revert uncommitted brightness and contrast previews.
- Restore prior audio values if audio edits were only previews.
- Discard draft changes.
- Preserve values committed by an earlier Apply.
- Close and restore focus to the invoking control.

---

## 48. Restore defaults

Section defaults should restore the draft for the current section.

Restoring display defaults should use the current platform's safe recommended configuration rather than assuming one universal resolution.

Restoring sound defaults should preserve a working current output device or use System Default.

---

## 49. Application plan

```typescript
interface AudiovisualApplicationPlan {
  readonly planId: string;
  readonly expectedPreferenceRevision: number;
  readonly capabilityRevision: number;
  readonly displayChanges: readonly AudiovisualPreferenceChange[];
  readonly renderingChanges: readonly AudiovisualPreferenceChange[];
  readonly soundChanges: readonly AudiovisualPreferenceChange[];
  readonly accessibilityChanges: readonly AudiovisualPreferenceChange[];
  readonly requiresDisplayPreview: boolean;
  readonly requiresRendererRestart: boolean;
  readonly requiresApplicationRestart: boolean;
  readonly warningCodes: readonly string[];
  readonly blockingReasonCodes: readonly string[];
  readonly fingerprint: string;
}
```

---

## 50. Apply command

```typescript
interface ApplyAudiovisualOptionsCommand {
  readonly applicationPlanId: string;
  readonly expectedPreferenceRevision: number;
  readonly expectedCapabilityRevision: number;
  readonly expectedPlanFingerprint: string;
  readonly controllerContextId: string;
  readonly requestId: string;
}
```

The command references a trusted plan. It must not submit arbitrary display modes or device handles directly from untrusted renderer state.

---

## 51. Idempotency

Applying settings is idempotent by request ID.

Repeated submission must:

- Return the existing operation state.
- Return the original result after success.
- Not restart the renderer twice.
- Not duplicate audio-device initialization.
- Not persist duplicate preference revisions.

---

## 52. State model

```typescript
interface DisplaySoundOptionsScreenState {
  readonly activeSection: "display" | "rendering" | "sound" | "accessibility";
  readonly preferenceRevision: number;
  readonly capabilities: DisplayCapabilities;
  readonly audioDevices: readonly AudioOutputDevice[];
  readonly effectiveDisplay: DisplayConfiguration;
  readonly draftDisplay: DisplayConfiguration;
  readonly effectiveAudio: AudioConfiguration;
  readonly draftAudio: AudioConfiguration;
  readonly preview?: DisplayPreviewTransaction;
  readonly issues: readonly AudiovisualOptionIssue[];
  readonly state: AudiovisualOptionsState;
  readonly pendingRestartSettingIds: readonly string[];
}
```

---

## 53. State transitions

```text
LOADING_CAPABILITIES
  |
  v
READY
  |
  +-- edit safe option ----> MODIFIED
  |
  +-- preview display -----> BUILDING_PLAN
  |                              |
  |                              v
  |                        APPLYING_PREVIEW
  |                              |
  |                              v
  |                   AWAITING_PREVIEW_CONFIRMATION
  |                              |
  |                              +-- keep -> MODIFIED
  |                              +-- timeout or revert -> READY or MODIFIED
  |
  +-- Apply -------------> VALIDATING
  |                            |
  |                            +-- errors -> MODIFIED_WITH_ERRORS
  |                            +-- preview required -> APPLYING_PREVIEW
  |                            +-- valid -> APPLYING -> READY
  |
  +-- Cancel ------------> REVERTING -> CLOSED
```

---

## 54. Commands and events

### Commands

```text
OPEN_DISPLAY_SOUND_OPTIONS
SELECT_AUDIOVISUAL_SECTION
SET_DISPLAY_TARGET
SET_DISPLAY_MODE
SET_DISPLAY_RESOLUTION
SET_REFRESH_BEHAVIOR
SET_FRAME_PACING_PROFILE
SET_INTERFACE_SCALE
SET_BRIGHTNESS_PROFILE
SET_CONTRAST_PROFILE
SET_HDR_ENABLED
SET_HARDWARE_ACCELERATION
SET_RENDERER_BACKEND
SET_RENDERING_QUALITY
SET_MATCH_VIEW_QUALITY
SET_AUDIO_OUTPUT_DEVICE
SET_AUDIO_CHANNEL_LEVEL
SET_MASTER_MUTE
SET_AUDIO_FOCUS_BEHAVIOR
SET_DYNAMIC_RANGE_PROFILE
SET_MONO_AUDIO
SET_CAPTIONS_ENABLED
SET_VISUAL_SOUND_CUES
TEST_AUDIO_CHANNEL
STOP_AUDIO_TEST
PREVIEW_DISPLAY_CONFIGURATION
CONFIRM_DISPLAY_PREVIEW
REVERT_DISPLAY_PREVIEW
RESTORE_AUDIOVISUAL_SECTION_DEFAULTS
BUILD_AUDIOVISUAL_APPLICATION_PLAN
APPLY_AUDIOVISUAL_OPTIONS
APPLY_AND_CLOSE_AUDIOVISUAL_OPTIONS
CANCEL_AUDIOVISUAL_OPTIONS
```

### Events

```text
DISPLAY_CAPABILITIES_CHANGED
AUDIO_DEVICE_LIST_CHANGED
DISPLAY_PREVIEW_STARTED
DISPLAY_PREVIEW_CONFIRMED
DISPLAY_PREVIEW_REVERTED
DISPLAY_PREVIEW_FAILED
AUDIO_TEST_STARTED
AUDIO_TEST_STOPPED
AUDIO_DEVICE_FALLBACK_APPLIED
AUDIOVISUAL_APPLICATION_PLAN_CREATED
AUDIOVISUAL_OPTIONS_APPLIED
AUDIOVISUAL_RESTART_REQUIRED
AUDIOVISUAL_OPTIONS_FAILED
SAFE_DISPLAY_MODE_ACTIVATED
```

---

## 55. Validation issue model

```typescript
interface AudiovisualOptionIssue {
  readonly code: string;
  readonly severity: "information" | "warning" | "blocking_error";
  readonly settingId?: string;
  readonly messageKey: string;
  readonly parameters?: Readonly<Record<string, string | number>>;
  readonly correctiveActionId?: string;
}
```

Blocking examples:

- Selected display disconnected.
- Unsupported resolution or refresh combination.
- Viewport below the safe minimum.
- Unsupported renderer backend.
- Audio device unavailable when no fallback is allowed.
- Invalid channel value.
- Failed safe preview.
- Stale capability revision.

Warnings:

- Restart required.
- High power use.
- Experimental backend.
- Selected audio device may disconnect.
- HDR calibration required.
- Exclusive fullscreen may interrupt switching.

---

## 56. Error states

### Display preview failure

```text
The proposed display configuration could not be shown safely.

The previous configuration has been restored.

[Review Settings] [Use Safe Defaults]
```

### Revert failure

```text
The previous display configuration could not be restored.

Safe windowed mode has been activated.
```

### Monitor disconnected

```text
The selected display is no longer available.

The application moved to the primary display.
```

### Audio device disconnected

```text
The selected audio output device is unavailable.

Audio now uses System Default.
```

### Renderer backend failure

```text
The selected renderer could not be initialized.

Software rendering will be used after restart unless you choose another option.
```

### Apply failure

```text
Display and sound settings could not be applied completely.

Uncommitted previews were reverted. Review the affected settings.

[Retry] [Review Details]
```

---

## 57. Accessibility requirements

### Controls

Each control must announce:

- Label.
- Current value.
- Supported range.
- Apply or restart behavior.
- Description.
- Validation state.

### Sliders

Every slider must expose:

- Accessible name.
- Current value.
- Minimum and maximum.
- Increment.

### Display preview

The countdown must be announced at meaningful intervals without excessive repetition.

Example:

```text
New display settings active. Confirm within 15 seconds or settings will revert.
Five seconds remaining.
```

### Audio tests

Every sound test requires a visible and accessible textual description. Captions or visual cues must accompany tests when enabled.

### Focus management

- Preview confirmation receives focus.
- Revert is the safe default.
- Automatic reversion restores focus to Preview Display Changes.
- Device disconnection messages do not steal focus unnecessarily.
- Errors focus a linked summary.

### Non-color communication

Mute, audio levels, preview state, display safety, restart requirement, captions, and visual cues require text or icon-plus-text.

---

## 58. Keyboard interaction

- `Tab` and `Shift+Tab`: move between section navigation, controls, preview, and actions.
- Arrow keys: operate sliders, radio groups, and select controls.
- `Home` and `End`: set a slider to its minimum or maximum.
- `Page Up` and `Page Down`: change sliders by a policy-defined larger step.
- `Enter` or `Space`: activate buttons and toggles.
- `Escape`: activate Revert during display preview, otherwise cancel or close a selector.
- `Alt+Enter`: toggle a safe fullscreen mode according to application policy.
- `Ctrl+S`: Apply.

Fullscreen shortcuts must use a validated predefined transition and safe fallback.

---

## 59. Localization requirements

- Localize all labels, device descriptions, modes, profiles, errors, and test captions.
- Localize percentages, resolutions, refresh rates, countdowns, and sizes.
- Preserve stable display, audio-device, backend, and profile IDs.
- Support right-to-left layouts.
- Use complete message templates.
- Allow long device names to wrap or truncate accessibly.
- Do not concatenate translated fragments for preview warnings.

---

## 60. Responsive behavior

### Wide desktop

Use section tabs with two-column settings and preview areas.

### Standard desktop

Use one settings column with a compact preview.

### Narrow desktop

Stack:

```text
Section selector
Settings
Preview or calibration
Warnings
Actions
```

### High text scaling

- Place labels above controls.
- Let device names wrap.
- Keep slider values adjacent to labels.
- Ensure preview confirmation remains entirely visible.
- Prevent footer overlap.

### Multiple displays

Preview confirmation must appear on the proposed target and remain recoverable from the prior target according to platform capability.

---

## 61. Security and integrity requirements

Treat device names, platform capability responses, renderer options, audio metadata, and preference values as untrusted.

Protect against:

- Forged display or audio-device IDs.
- Unsupported video modes.
- Off-screen window placement.
- Preview lockout.
- Renderer command injection.
- Arbitrary backend arguments.
- Malicious device names.
- Invalid numeric values.
- Integer overflow.
- Stale capability revisions.
- Duplicate Apply side effects.
- Audio test abuse.

Rules:

1. Query devices through trusted platform adapters.
2. Apply only enumerated supported modes.
3. Build application plans outside the renderer.
4. Revalidate capability revisions before applying.
5. Maintain a safe fallback configuration.
6. Use timeout-based preview rollback for risky changes.
7. Restrict renderer backends to approved IDs.
8. Bound audio levels and test duration.
9. Stop tests when the screen closes.
10. Use expected preference revisions and idempotency keys.
11. Sanitize device names and diagnostics.
12. Never expose raw platform handles to untrusted content.

---

## 62. Persistence rules

Persist after successful Apply:

- Device-scoped display target preference.
- Display mode and valid resolution preference.
- Refresh and frame-pacing profile.
- Interface scale.
- Confirmed brightness and contrast profiles.
- Rendering backend and restart marker.
- Audio output preference.
- Channel levels.
- Mute and focus behavior.
- Captions, mono, visual cues, and sensory settings.
- Preference schema and policy versions.

Do not persist:

- Unconfirmed display preview.
- Disconnected device as effective without fallback metadata.
- Temporary audio-test state.
- Raw operating-system handles.
- Invalid numeric values.
- Partial application presented as complete success.

---

## 63. Observability

Useful operational events:

- Display and sound options opened.
- Capability enumeration success or failure.
- Preview started, confirmed, reverted, timed out, or failed.
- Safe mode activated.
- Audio device fallback.
- Renderer restart requested.
- Apply duration and failure category.

Avoid recording:

- Raw hardware serial numbers.
- Private device paths.
- Audio content.
- Manager identity.
- Full platform diagnostic dumps without consent.

---

## 64. Edge cases

### Display removed during preview

Revert to the primary connected display using the safe configuration.

### Display scale changes at operating-system level

Refresh capabilities and ensure the confirmation remains visible.

### Window position exists only on a removed monitor

Recenter on the current primary display.

### Exclusive fullscreen fails

Restore borderless or windowed safe mode.

### HDR becomes unavailable

Disable HDR draft state and explain the capability change.

### Audio device disappears during test

Stop the test and fall back safely.

### System Default changes

Follow the operating-system default when that option is selected.

### Master muted with test requested

Explain that the test is muted and offer temporary test playback only through explicit action.

### Restart requested with unsaved career progress

Route through Save and Quit.

### Preview confirmation window is off-screen

Treat the preview as failed and revert automatically.

### Application crashes during preview

Start next launch in safe display mode and mark the preview unconfirmed.

### Multiple settings screens open

Use one preference revision and conflict policy. Do not let a stale screen overwrite newer confirmed values.

---

## 65. Acceptance criteria

The screen is complete when:

1. It enumerates display and audio capabilities through trusted platform adapters.
2. Only supported display modes, resolutions, refresh rates, devices, and backends are selectable.
3. Windowed, borderless, and exclusive modes are distinguished clearly.
4. Interface scale remains separate from physical resolution.
5. Frame pacing and rendering quality do not alter canonical simulation outcomes.
6. Risky display changes use a reversible timed preview.
7. Revert is the safe default during preview.
8. Unconfirmed previews revert automatically.
9. Invalid window positions recover to a connected display.
10. Renderer failure activates a safe fallback path.
11. Master mute preserves individual channel levels.
12. Audio channels have policy-bounded levels and keyboard-operable controls.
13. Output-device disconnection falls back predictably.
14. Audio tests use approved bounded assets and stop on screen close.
15. Mono audio combines rather than discards essential channel information.
16. Captions and visual cues provide nonaudio equivalents.
17. Reduced motion, flashing, brightness, and sudden-volume options override conflicting decorative settings safely.
18. Restart-required settings are not reported as immediately active.
19. Apply uses an authoritative capability-bound plan.
20. Apply is revision-checked and idempotent.
21. Cancel reverts uncommitted display, brightness, contrast, and audio previews.
22. Multiple-device settings are scoped appropriately and do not synchronize unusable device IDs blindly.
23. Keyboard users can operate all display, rendering, sound, test, and preview controls.
24. Screen-reader users receive labels, values, ranges, preview countdown, captions, warnings, and outcomes.
25. High text scaling and right-to-left layouts remain usable.
26. No proprietary artwork, exact wording, source code, music, sound effects, logos, or original database content is required.

---

## 66. Recommended tests

### Unit tests

- Display-mode capability filtering.
- Resolution and refresh compatibility.
- Minimum viewport validation.
- Safe window-bound recovery.
- Preview timeout calculation from policy.
- Frame-pacing profile mapping.
- Renderer restart classification.
- Master and channel-volume resolution.
- Mute-state preservation.
- Audio-device fallback.
- Accessibility override precedence.
- Application-plan fingerprinting.
- Idempotency-result lookup.

### Integration tests

- Switch windowed to borderless fullscreen.
- Preview and confirm a resolution.
- Let a display preview time out.
- Revert a display preview manually.
- Switch monitors.
- Recover from a disconnected monitor.
- Change interface scale.
- Enable and disable hardware acceleration.
- Select a renderer backend.
- Change rendering quality.
- Select an audio output device.
- Adjust every audio channel.
- Test interface and match sounds.
- Enable mute when minimized.
- Enable mono, captions, and visual cues.
- Apply and restart.

### Transaction and recovery tests

- Fail while applying a display preview.
- Fail while reverting a preview.
- Crash during preview and restart in safe mode.
- Fail after preference persistence but before renderer restart.
- Disconnect the audio device during Apply.
- Change display capabilities while a plan is open.
- Retry the same Apply request after timeout.

### Security tests

- Forged display ID.
- Forged audio-device ID.
- Unsupported resolution.
- Unsupported refresh rate.
- Malicious device name.
- Invalid or overflowing numeric value.
- Forged renderer backend.
- Arbitrary backend argument injection.
- Stale capability revision.
- Forged application plan.
- Replayed Apply request.
- Excessively long audio test.
- Diagnostic hardware-identifier leakage.

### Accessibility tests

- Keyboard-only display setup.
- Slider operation with arrows, Home, End, Page Up, and Page Down.
- Preview countdown announcement.
- Escape-to-revert behavior.
- Device-disconnection announcement.
- Audio test caption.
- Mono and visual-cue settings.
- Restart-required summary.
- High-contrast mode.
- Reduced-motion mode.
- Reduced-flashing mode.
- 200 percent text scaling.
- Right-to-left layout.
- Long localized device and backend names.

### Visual regression tests

Capture at least:

- Display tab.
- Rendering tab.
- Sound tab.
- Accessibility tab.
- Windowed mode.
- Borderless fullscreen mode.
- Exclusive fullscreen warning.
- Display preview countdown.
- Safe-mode recovery.
- Monitor disconnected warning.
- Audio device fallback.
- Master muted.
- Captions and visual cues enabled.
- Restart-required summary.
- Apply failure.
- Minimum viewport.
- Ultrawide viewport.
- High text scaling.
- Right-to-left layout.

---

## 67. Condensed LLM implementation brief

```text
Implement a desktop Display and Sound Options screen for an original football-
management simulation. It may open from the Main Menu, Game Preferences, an
active career, or safe display recovery.

Enumerate monitors, display modes, resolutions, refresh rates, HDR support,
renderer backends, and audio output devices through trusted platform adapters.
Expose only supported combinations. Keep interface scale separate from physical
resolution. Presentation frame pacing, rendering quality, and match-view quality
must never change canonical football simulation outcomes.

Support windowed, borderless fullscreen, and exclusive fullscreen where
available. Risky display changes require a capability-bound preview transaction
with the prior configuration, proposed configuration, expiration time, and safe
fallback. Focus Revert by default. If the user does not confirm within the
policy-defined timeout, the display disconnects, the confirmation is not
visible, or the renderer fails, restore the prior configuration or activate safe
windowed mode automatically.

Recover invalid saved window positions by intersecting them with connected
display work areas and recentering when needed. On renderer startup failure,
launch with a conservative safe configuration and allow the user to review the
failed backend or acceleration setting.

Provide approved rendering settings for hardware acceleration, backend,
interface quality, animation quality, match-view presentation, and background
rendering. Mark renderer or application restart requirements accurately. A
Restart Now action must route through Save and Quit when an active career has
unsaved progress.

Provide Master, Music, Interface, Match, Commentary, Notifications, and Ambient
audio channels with policy-bounded values. Master mute preserves channel levels.
Support System Default and enumerated output devices, hot-plug fallback, mute
when minimized or unfocused, music ducking, dynamic-range profiles, mono audio,
captions, and visual sound cues. Audio tests must use approved bounded assets,
respect safe volume policy, provide textual descriptions, and stop when the
screen closes.

Accessibility options for reduced motion, reduced flashing, reduced sudden
brightness and volume, captions, mono audio, visual cues, and simplified match
effects must override conflicting decorative preferences without removing
essential information.

Build an authoritative AudiovisualApplicationPlan outside the renderer using
current preference and capability revisions. The Apply command references that
plan, expected revisions, fingerprint, controller context, and an idempotency
request ID. Revalidate capabilities before committing. Repeated requests must
not restart renderers, initialize devices, or persist revisions twice.

Cancel stops tests, reverts unconfirmed previews, restores prior temporary audio
and calibration values, and discards unapplied drafts. Persist only confirmed
configurations, stable preference IDs, and restart markers. Never persist raw
platform handles or temporary test state.

Support full keyboard interaction, accessible sliders, persistent labels,
visible focus, preview countdown announcements, safe Escape-to-revert behavior,
captions, high text scaling, localization, and right-to-left layouts. Treat
device names, capability data, IDs, backends, audio metadata, and renderer
commands as untrusted. Do not copy proprietary artwork, exact wording, source
code, music, sound effects, logos, or databases.
```

---

## 68. Next planned item

**Screen 18: Game Status** should define the active career's technical and simulation state, current date and processing phase, database and engine versions, loaded nations and competitions, entity counts, save and autosave status, storage and memory summaries, multiplayer participants, scheduled processing, runtime warnings, diagnostic-safe details, refresh behavior, read-only boundaries, and navigation back to the career.

---

## Suggested Git commit

```text
feat(docs): specify display and sound options screen
```
