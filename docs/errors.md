# Error Reference

## Governance Contract Errors

| Code | Name | Description |
|------|------|-------------|
| 1 | `AlreadyInitialized` | Contract has already been initialized |
| 2 | `NotInitialized` | Contract has not been initialized |
| 10 | `ProposalNotFound` | Proposal ID does not exist |
| 11 | `ProposalNotActive` | Proposal is not in Active state |
| 12 | `ProposalNotPassed` | Proposal is not in Passed state |
| 13 | `InvalidTitle` | Title is empty or exceeds 128 characters |
| 14 | `InvalidDescription` | Description is empty or exceeds 1024 characters |
| 15 | `InvalidQuorum` | Quorum is zero or negative |
| 16 | `QuorumExceedsSupply` | Quorum exceeds total token supply |
| 17 | `InvalidDurationRange` | Duration outside [60, 2,592,000] seconds |
| 18 | `InsufficientBalance` | Proposer balance below minimum |
| 19 | `ProposalCooldown` | Proposer within cooldown period |
| 20 | `VotingNotStarted` | Voting period has not started |
| 21 | `VotingPeriodEnded` | Voting period has ended |
| 22 | `VotingStillOpen` | Voting period has not ended yet |
| 23 | `AlreadyVoted` | Voter has already voted on this proposal |
| 24 | `NoVotingPower` | Voter has zero token balance |
| 25 | `AdminVoteRestricted` | Admin cannot vote on own proposals |
| 26 | `VoteNotFound` | No vote record found for this voter |
| 30 | `NotAdmin` | Caller is not the admin |
| 31 | `InvalidNewAdmin` | New admin address is invalid |
| 40 | `ContractPaused` | Contract is paused |
| 41 | `NotPaused` | Contract is not paused |
| 50 | `ArithmeticOverflow` | Integer overflow in vote accumulation |

## Token Contract Errors

| Code | Name | Description |
|------|------|-------------|
| 1 | `AlreadyInitialized` | Contract has already been initialized |
| 2 | `NotInitialized` | Contract has not been initialized |
| 10 | `NotAdmin` | Caller is not the admin |
| 11 | `InvalidNewAdmin` | New admin address is invalid |
| 20 | `InvalidAmount` | Amount is zero or negative |
| 21 | `InsufficientBalance` | Sender has fewer tokens than requested |
| 22 | `AllowanceExceeded` | Spender allowance is insufficient |
