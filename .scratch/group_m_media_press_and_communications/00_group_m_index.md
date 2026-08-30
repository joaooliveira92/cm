# Group M: Media, Press and Communications

## Package contents

- [Screen 181: Media Centre](181_media_centre.md)
- [Screen 182: Press Conference](182_press_conference.md)
- [Screen 183: Individual Media Interview](183_individual_media_interview.md)
- [Screen 184: Pre-Match Media Briefing](184_pre_match_media_briefing.md)
- [Screen 185: Post-Match Media Briefing](185_post_match_media_briefing.md)
- [Screen 186: Transfer Media Response](186_transfer_media_response.md)
- [Screen 187: Player and Staff Public Statement](187_player_and_staff_public_statement.md)
- [Screen 188: Manager Public Statement](188_manager_public_statement.md)
- [Screen 189: Media Rumours and Speculation](189_media_rumours_and_speculation.md)
- [Screen 190: Journalist and Media Outlet Profile](190_journalist_and_media_outlet_profile.md)
- [Screen 191: Media Relationships](191_media_relationships.md)
- [Screen 192: Public Reaction and Narrative Tracking](192_public_reaction_and_narrative_tracking.md)
- [Screen 193: Communication History and Transcript](193_communication_history_and_transcript.md)

## Functional flow

```text
Media Centre
  -> Press Conference
  -> Individual Media Interview
  -> Pre-Match and Post-Match Briefings
  -> Transfer Media Response
  -> Player, Staff, and Manager Statements
  -> Media Rumours and Speculation
  -> Journalist and Outlet Profiles
  -> Media Relationships
  -> Public Reaction and Narrative Tracking
  -> Communication History and Transcript
```

## Shared requirements

- Constrained professional and nonabusive communication structures.
- Explicit public, private, embargoed, rumoured, and corrected states.
- Immutable questions, answers, statements, transcripts, and publication events.
- Authoritative permissions, deadlines, delegation, and publication boundaries.
- Privacy-safe narratives, rumours, relationships, and exports.

## Suggested Git commit

```text
docs(game-ui): add media press and communication specifications
```
