# Group N: Jobs, Employment and Manager Career

## Package contents

- [Screen 194: Job Centre](194_job_centre.md)
- [Screen 195: Available Managerial Jobs](195_available_managerial_jobs.md)
- [Screen 196: Job Advertisement and Club Vacancy](196_job_advertisement_and_club_vacancy.md)
- [Screen 197: Submit Job Application](197_submit_job_application.md)
- [Screen 198: Job Interview](198_job_interview.md)
- [Screen 199: Manager Employment Offer](199_manager_employment_offer.md)
- [Screen 200: Manager Contract Negotiation](200_manager_contract_negotiation.md)
- [Screen 201: Accept Managerial Appointment](201_accept_managerial_appointment.md)
- [Screen 202: Resign from Current Position](202_resign_from_current_position.md)
- [Screen 203: Manager Dismissal and Termination](203_manager_dismissal_and_termination.md)
- [Screen 204: Job Security](204_job_security.md)
- [Screen 205: Manager Reputation and Career Progression](205_manager_reputation_and_career_progression.md)
- [Screen 206: Manager Qualifications and Coaching Badges](206_manager_qualifications_and_coaching_badges.md)
- [Screen 207: Employment History and Career Milestones](207_employment_history_and_career_milestones.md)

## Functional flow

```text
Job Centre
  -> Available Managerial Jobs
      -> Job Advertisement and Club Vacancy
      -> Submit Job Application
      -> Job Interview
      -> Manager Employment Offer
          -> Manager Contract Negotiation
          -> Accept Managerial Appointment
  -> Resign from Current Position
  -> Manager Dismissal and Termination
  -> Job Security
  -> Manager Reputation and Career Progression
  -> Manager Qualifications and Coaching Badges
  -> Employment History and Career Milestones
```

## Shared requirements

- Distinct vacancy, application, interview, offer, appointment, employment, resignation, dismissal, retirement, and unemployment states.
- Professional, respectful, and non-discriminatory communication.
- Immutable applications, answers, proposal revisions, contracts, and history events.
- Authoritative eligibility, authority, deadline, compensation, and safe-boundary validation.
- Privacy-safe hot-seat and multiplayer manager ownership.

## Suggested Git commit

```text
docs(game-ui): add jobs employment and manager career specifications
```
