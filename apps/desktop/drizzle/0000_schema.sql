CREATE TABLE `bids` (
	`id` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`selling_club_id` text NOT NULL,
	`bidding_club_id` text NOT NULL,
	`amount` integer NOT NULL,
	`counter_amount` integer,
	`status` text NOT NULL,
	`season_number` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`selling_club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bidding_club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "bids_amount" CHECK(amount >= 0),
	CONSTRAINT "bids_status" CHECK(status IN ('pending','countered','accepted','rejected','withdrawn'))
);
--> statement-breakpoint
CREATE TABLE `board_objective` (
	`season_number` integer PRIMARY KEY NOT NULL,
	`club_id` text NOT NULL,
	`min_position` integer NOT NULL,
	`max_position` integer NOT NULL,
	`final_position` integer,
	`verdict` text,
	FOREIGN KEY (`season_number`) REFERENCES `season`(`season_number`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "board_objective_verdict" CHECK(verdict IS NULL OR verdict IN ('exceeded','met','missed'))
);
--> statement-breakpoint
CREATE TABLE `cities` (
	`id` text PRIMARY KEY NOT NULL,
	`nation_id` text NOT NULL,
	`name` text NOT NULL,
	`population_band` text NOT NULL,
	FOREIGN KEY (`nation_id`) REFERENCES `nations`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "cities_population_band" CHECK(population_band IN ('major','large','mid','small'))
);
--> statement-breakpoint
CREATE TABLE `club_budgets` (
	`club_id` text PRIMARY KEY NOT NULL,
	`season_number` integer NOT NULL,
	`transfer_budget_remaining` integer NOT NULL,
	`wage_budget` integer NOT NULL,
	FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `clubs` (
	`id` text PRIMARY KEY NOT NULL,
	`stature_tier` text NOT NULL,
	`is_user_club` integer DEFAULT 0 NOT NULL,
	`generation_seed` integer NOT NULL,
	`city_id` text NOT NULL,
	`stadium_name` text NOT NULL,
	`stadium_capacity` integer NOT NULL,
	FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "clubs_stature_tier" CHECK(stature_tier IN ('big','mid','small')),
	CONSTRAINT "clubs_is_user_club" CHECK(is_user_club IN (0,1)),
	CONSTRAINT "clubs_generation_seed_range" CHECK(generation_seed BETWEEN 0 AND 4294967295)
);
--> statement-breakpoint
CREATE TABLE `competition_entrants` (
	`cup_competition_id` text NOT NULL,
	`source_competition_id` text NOT NULL,
	PRIMARY KEY(`cup_competition_id`, `source_competition_id`),
	FOREIGN KEY (`cup_competition_id`) REFERENCES `competitions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_competition_id`) REFERENCES `competitions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `competition_links` (
	`higher_competition_id` text NOT NULL,
	`lower_competition_id` text NOT NULL,
	`slots` integer NOT NULL,
	PRIMARY KEY(`higher_competition_id`, `lower_competition_id`),
	FOREIGN KEY (`higher_competition_id`) REFERENCES `competitions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lower_competition_id`) REFERENCES `competitions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "competition_links_slots" CHECK(slots >= 1)
);
--> statement-breakpoint
CREATE TABLE `competitions` (
	`id` text PRIMARY KEY NOT NULL,
	`nation_id` text,
	`kind` text NOT NULL,
	`tier` integer,
	`depth` text NOT NULL,
	`club_count` integer,
	FOREIGN KEY (`nation_id`) REFERENCES `nations`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "competitions_kind" CHECK(kind IN ('league','cup','reserve','continental')),
	CONSTRAINT "competitions_depth" CHECK(depth IN ('full','standard','results-only'))
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`player_id` text PRIMARY KEY NOT NULL,
	`wage` integer NOT NULL,
	`years_remaining` integer NOT NULL,
	`signed_season` integer NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "contracts_wage" CHECK(wage >= 0),
	CONSTRAINT "contracts_years_remaining" CHECK(years_remaining BETWEEN 0 AND 5)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`stream_type` text NOT NULL,
	`stream_id` text NOT NULL,
	`seq` integer NOT NULL,
	`tag` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	PRIMARY KEY(`stream_type`, `stream_id`, `seq`)
);
--> statement-breakpoint
CREATE TABLE `fixtures` (
	`id` text PRIMARY KEY NOT NULL,
	`season_number` integer NOT NULL,
	`matchday` integer NOT NULL,
	`home_club_id` text NOT NULL,
	`away_club_id` text NOT NULL,
	`home_goals` integer,
	`away_goals` integer,
	`played` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`season_number`) REFERENCES `season`(`season_number`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`home_club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`away_club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "fixtures_matchday" CHECK(matchday BETWEEN 1 AND 38),
	CONSTRAINT "fixtures_played" CHECK(played IN (0,1))
);
--> statement-breakpoint
CREATE TABLE `generation_manifest` (
	`id` integer PRIMARY KEY NOT NULL,
	`world_seed` integer NOT NULL,
	`generator_version` text NOT NULL,
	`ruleset_version` text NOT NULL,
	`reference_year` integer NOT NULL,
	`generated_at` text NOT NULL,
	`catalogue_fingerprint` text NOT NULL,
	`content_pack_id` text NOT NULL,
	`content_pack_version` text NOT NULL,
	`snapshot_id` text NOT NULL,
	CONSTRAINT "generation_manifest_single_row" CHECK(id = 1),
	CONSTRAINT "generation_manifest_world_seed_range" CHECK(world_seed BETWEEN 0 AND 4294967295)
);
--> statement-breakpoint
CREATE TABLE `manager_profile` (
	`id` integer PRIMARY KEY NOT NULL,
	`manager_name` text NOT NULL,
	`archetype_origin` text NOT NULL,
	`tactical_acumen` integer NOT NULL,
	`influence` integer NOT NULL,
	`regimen` integer NOT NULL,
	`technical_coaching` integer NOT NULL,
	CONSTRAINT "manager_profile_single_row" CHECK(id = 1),
	CONSTRAINT "manager_profile_name_length" CHECK(length(trim(manager_name)) BETWEEN 1 AND 80),
	CONSTRAINT "manager_profile_archetype_origin" CHECK(archetype_origin IN ('professor','motivator','sergeant','academy_head','custom')),
	CONSTRAINT "manager_profile_tactical_acumen" CHECK(tactical_acumen BETWEEN 1 AND 5),
	CONSTRAINT "manager_profile_influence" CHECK(influence BETWEEN 1 AND 5),
	CONSTRAINT "manager_profile_regimen" CHECK(regimen BETWEEN 1 AND 5),
	CONSTRAINT "manager_profile_technical_coaching" CHECK(technical_coaching BETWEEN 1 AND 5),
	CONSTRAINT "manager_profile_pillars_sum" CHECK(tactical_acumen + influence + regimen + technical_coaching = 12)
);
--> statement-breakpoint
CREATE TABLE `manager_status` (
	`id` integer PRIMARY KEY NOT NULL,
	`consecutive_misses` integer DEFAULT 0 NOT NULL,
	`archived_cause` text,
	`last_outcome` text DEFAULT 'none' NOT NULL,
	CONSTRAINT "manager_status_single_row" CHECK(id = 1),
	CONSTRAINT "manager_status_archived_cause" CHECK(archived_cause IS NULL OR archived_cause IN ('sacked','retired')),
	CONSTRAINT "manager_status_last_outcome" CHECK(last_outcome IN ('none','warned','sacked'))
);
--> statement-breakpoint
CREATE TABLE `nations` (
	`id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `news_message_state` (
	`stream_type` text NOT NULL,
	`stream_id` text NOT NULL,
	`seq` integer NOT NULL,
	`read` integer DEFAULT 0 NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`flagged` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	PRIMARY KEY(`stream_type`, `stream_id`, `seq`),
	CONSTRAINT "news_message_state_read" CHECK(read IN (0,1)),
	CONSTRAINT "news_message_state_archived" CHECK(archived IN (0,1)),
	CONSTRAINT "news_message_state_flagged" CHECK(flagged IN (0,1))
);
--> statement-breakpoint
CREATE TABLE `player_fitness` (
	`player_id` text PRIMARY KEY NOT NULL,
	`season_number` integer NOT NULL,
	`condition` integer DEFAULT 100 NOT NULL,
	`last_injury_severity` text DEFAULT 'none' NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`season_number`) REFERENCES `season`(`season_number`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "player_fitness_condition" CHECK(condition BETWEEN 0 AND 100),
	CONSTRAINT "player_fitness_last_injury_severity" CHECK(last_injury_severity IN ('none','light','medium','severe'))
);
--> statement-breakpoint
CREATE TABLE `player_positions` (
	`player_id` text NOT NULL,
	`position` text NOT NULL,
	`familiarity` text NOT NULL,
	PRIMARY KEY(`player_id`, `position`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "player_positions_position" CHECK(position IN ('GK','DC','DL','DR','DM','MC','ML','MR','AMC','ST')),
	CONSTRAINT "player_positions_familiarity" CHECK(familiarity IN ('natural','competent','unfamiliar'))
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`club_id` text,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`date_of_birth` text NOT NULL,
	`potential_ability` integer NOT NULL,
	`passing` integer NOT NULL,
	`shooting` integer NOT NULL,
	`tackling` integer NOT NULL,
	`dribbling` integer NOT NULL,
	`heading` integer NOT NULL,
	`crossing` integer NOT NULL,
	`finishing` integer NOT NULL,
	`first_touch` integer NOT NULL,
	`positioning` integer NOT NULL,
	`decisions` integer NOT NULL,
	`composure` integer NOT NULL,
	`determination` integer NOT NULL,
	`teamwork` integer NOT NULL,
	`flair` integer NOT NULL,
	`bravery` integer NOT NULL,
	`aggression` integer NOT NULL,
	`pace` integer NOT NULL,
	`acceleration` integer NOT NULL,
	`stamina` integer NOT NULL,
	`strength` integer NOT NULL,
	`agility` integer NOT NULL,
	`natural_fitness` integer NOT NULL,
	`injury_proneness` integer NOT NULL,
	`gk_handling` integer,
	`gk_reflexes` integer,
	`gk_aerial_reach` integer,
	`gk_command_of_area` integer,
	`gk_kicking` integer,
	`squad_slot` integer NOT NULL,
	`generation_seed` integer NOT NULL,
	FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "players_potential_ability" CHECK(potential_ability BETWEEN 1 AND 100),
	CONSTRAINT "players_passing" CHECK(passing BETWEEN 1 AND 20),
	CONSTRAINT "players_shooting" CHECK(shooting BETWEEN 1 AND 20),
	CONSTRAINT "players_tackling" CHECK(tackling BETWEEN 1 AND 20),
	CONSTRAINT "players_dribbling" CHECK(dribbling BETWEEN 1 AND 20),
	CONSTRAINT "players_heading" CHECK(heading BETWEEN 1 AND 20),
	CONSTRAINT "players_crossing" CHECK(crossing BETWEEN 1 AND 20),
	CONSTRAINT "players_finishing" CHECK(finishing BETWEEN 1 AND 20),
	CONSTRAINT "players_first_touch" CHECK(first_touch BETWEEN 1 AND 20),
	CONSTRAINT "players_positioning" CHECK(positioning BETWEEN 1 AND 20),
	CONSTRAINT "players_decisions" CHECK(decisions BETWEEN 1 AND 20),
	CONSTRAINT "players_composure" CHECK(composure BETWEEN 1 AND 20),
	CONSTRAINT "players_determination" CHECK(determination BETWEEN 1 AND 20),
	CONSTRAINT "players_teamwork" CHECK(teamwork BETWEEN 1 AND 20),
	CONSTRAINT "players_flair" CHECK(flair BETWEEN 1 AND 20),
	CONSTRAINT "players_bravery" CHECK(bravery BETWEEN 1 AND 20),
	CONSTRAINT "players_aggression" CHECK(aggression BETWEEN 1 AND 20),
	CONSTRAINT "players_pace" CHECK(pace BETWEEN 1 AND 20),
	CONSTRAINT "players_acceleration" CHECK(acceleration BETWEEN 1 AND 20),
	CONSTRAINT "players_stamina" CHECK(stamina BETWEEN 1 AND 20),
	CONSTRAINT "players_strength" CHECK(strength BETWEEN 1 AND 20),
	CONSTRAINT "players_agility" CHECK(agility BETWEEN 1 AND 20),
	CONSTRAINT "players_natural_fitness" CHECK(natural_fitness BETWEEN 1 AND 20),
	CONSTRAINT "players_injury_proneness" CHECK(injury_proneness BETWEEN 1 AND 20),
	CONSTRAINT "players_gk_handling" CHECK(gk_handling IS NULL OR gk_handling BETWEEN 1 AND 20),
	CONSTRAINT "players_gk_reflexes" CHECK(gk_reflexes IS NULL OR gk_reflexes BETWEEN 1 AND 20),
	CONSTRAINT "players_gk_aerial_reach" CHECK(gk_aerial_reach IS NULL OR gk_aerial_reach BETWEEN 1 AND 20),
	CONSTRAINT "players_gk_command_of_area" CHECK(gk_command_of_area IS NULL OR gk_command_of_area BETWEEN 1 AND 20),
	CONSTRAINT "players_gk_kicking" CHECK(gk_kicking IS NULL OR gk_kicking BETWEEN 1 AND 20),
	CONSTRAINT "players_squad_slot" CHECK(squad_slot >= 0),
	CONSTRAINT "players_generation_seed_range" CHECK(generation_seed BETWEEN 0 AND 4294967295)
);
--> statement-breakpoint
CREATE TABLE `save_meta` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `season` (
	`season_number` integer PRIMARY KEY NOT NULL,
	`current_matchday` integer DEFAULT 0 NOT NULL,
	`phase` text NOT NULL,
	CONSTRAINT "season_current_matchday" CHECK(current_matchday BETWEEN 0 AND 38),
	CONSTRAINT "season_phase" CHECK(phase IN ('pre_season','in_season','mid_window_open','season_complete'))
);
--> statement-breakpoint
CREATE TABLE `tactic_slots` (
	`club_id` text NOT NULL,
	`slot_index` integer NOT NULL,
	`position` text NOT NULL,
	`role` text NOT NULL,
	`player_id` text NOT NULL,
	PRIMARY KEY(`club_id`, `slot_index`),
	FOREIGN KEY (`club_id`) REFERENCES `tactics`(`club_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "tactic_slots_position" CHECK(position IN ('GK','DC','DL','DR','DM','MC','ML','MR','AMC','ST'))
);
--> statement-breakpoint
CREATE TABLE `tactics` (
	`club_id` text PRIMARY KEY NOT NULL,
	`formation` text NOT NULL,
	`mentality` text NOT NULL,
	`tempo` text NOT NULL,
	`pressing` text NOT NULL,
	FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "tactics_formation" CHECK(formation IN ('4-4-2','4-3-3','4-5-1','3-5-2','5-3-2')),
	CONSTRAINT "tactics_mentality" CHECK(mentality IN ('defensive','balanced','attacking')),
	CONSTRAINT "tactics_tempo" CHECK(tempo IN ('slow','normal','fast')),
	CONSTRAINT "tactics_pressing" CHECK(pressing IN ('low','medium','high'))
);
--> statement-breakpoint
CREATE TABLE `training_focus` (
	`player_id` text PRIMARY KEY NOT NULL,
	`focus` text,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "training_focus_focus" CHECK(focus IS NULL OR focus IN ('technical','mental','physical','goalkeeping'))
);
