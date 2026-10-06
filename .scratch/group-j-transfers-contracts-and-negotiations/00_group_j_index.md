# Group J: Transfers, Contracts and Negotiations

## Package contents

- [Screen 132: Transfer Centre](132_transfer_centre.md)
- [Screen 133: Incoming Transfer Offer](133_incoming_transfer_offer.md)
- [Screen 134: Make Transfer Offer](134_make_transfer_offer.md)
- [Screen 135: Transfer Negotiation](135_transfer_negotiation.md)
- [Screen 136: Loan Offer and Negotiation](136_loan_offer_and_negotiation.md)
- [Screen 137: Player Contract Offer](137_player_contract_offer.md)
- [Screen 138: Player Contract Negotiation](138_player_contract_negotiation.md)
- [Screen 139: Staff Contract Offer and Negotiation](139_staff_contract_offer_and_negotiation.md)
- [Screen 140: Contract Renewal](140_contract_renewal.md)
- [Screen 141: Contract Expiry and Bosman Status](141_contract_expiry_and_bosman_status.md)
- [Screen 142: Transfer Completion and Registration](142_transfer_completion_and_registration.md)
- [Screen 143: Transfer Cancellation and Withdrawal](143_transfer_cancellation_and_withdrawal.md)
- [Screen 144: Transfer Clauses and Installments](144_transfer_clauses_and_installments.md)
- [Screen 145: Transfer Budget and Wage Budget Review](145_transfer_budget_and_wage_budget_review.md)
- [Screen 146: Transfer History and Audit Trail](146_transfer_history_and_audit_trail.md)

## Functional flow

```text
Transfer Centre
  -> Incoming Transfer Offer
  -> Make Transfer Offer
      -> Transfer Negotiation
      -> Loan Offer and Negotiation
  -> Player and Staff Contract Offers
      -> Contract Negotiation and Renewal
      -> Expiry and Pre-Contract Status
  -> Clauses and Installments
  -> Budget Review
  -> Transfer Completion and Registration
  -> Cancellation and Withdrawal
  -> Transfer History and Audit Trail
```

## Shared requirements

- Immutable negotiation and proposal revisions.
- Explicit money, currency, payment, deadline, and clause models.
- Distinct offer, agreement, completion, employment, and registration states.
- Authoritative budget, permission, contract, window, and registration validation.
- Atomic completion and idempotent revision-bound commands.
- Full keyboard, screen-reader, localization, scaling, and RTL support.

## Suggested Git commit

```text
docs(game-ui): add transfer contract and negotiation specifications
```
