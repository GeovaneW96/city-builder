# Debt and Loans

## Purpose

Allow the player to borrow money when the city is in financial trouble. Loans provide a cash infusion in exchange for a fixed monthly payment over a 12-month term. Mismanagement leads to default and bankruptcy, adding a meaningful risk layer to city finances.

## Loan Types

| Loan Name | Principal | Interest (APR) | Term (months) | Monthly Payment |
| --------- | :-------: | :------------: | :------------: | :-------------: |
| Small     |  $5,000   |      10%       |       12       |     $458.33     |
| Medium    |  $10,000  |      10%       |       12       |     $916.67     |
| Large     |  $20,000  |      10%       |       12       |    $1,833.33    |

## Loan Mechanics

### Interest

Annual Percentage Rate (APR) of 10%, compounded monthly for the loan term. The total interest is calculated upfront as a simple addition to principal:

```txt
totalRepayment = principal × (1 + annualRate)
monthlyPayment = totalRepayment / termMonths
```

Where `annualRate = 0.10` and `termMonths = 12`.

The monthly payment is a fixed amount. Unpaid interest does not accrue — the interest cost is baked into the fixed monthly payment.

### State

Each active loan is tracked in the economy state:

```ts
interface Loan {
  id: string;
  type: "small" | "medium" | "large";
  principal: number;
  monthlyPayment: number;
  remainingMonths: number;
  missedPayments: number;      // consecutive months without payment
}
```

The simulation state adds:

```ts
economy: {
  loans: Loan[];
  maxLoans: 3;
}
```

## Taking a Loan

The player can take a loan when:

1. Current money is below `LOAN_ELIGIBILITY_THRESHOLD` (default $10,000).
2. Number of active loans is less than `MAX_LOANS` (3).
3. The player has not initiated a loan in the last `LOAN_COOLDOWN_TICKS` (6 ticks).

Taking a loan:

1. Adds the principal to `economy.money`.
2. Creates a new `Loan` entry in `economy.loans`.
3. Records the tick in `economy.lastLoanTick`.

## Repayment

On each economy tick (monthly), the system processes all active loans:

```txt
for each active loan:
    if economy.money >= loan.monthlyPayment:
        economy.money -= loan.monthlyPayment
        loan.remainingMonths -= 1
        loan.missedPayments = 0
    else:
        loan.missedPayments += 1
```

When `loan.remainingMonths` reaches 0, the loan is removed from the active list.

## Default and Bankruptcy

If a loan payment cannot be made (money would go below 0):

```txt
if loan.missedPayments >= 3:
    trigger bankruptcy
```

Bankruptcy follows the existing bankruptcy rules in `docs/05_ECONOMY_AND_BALANCING.md`:

- The scenario fails immediately.
- The player is shown a "City bankrupt — too many missed loan payments" message.

Loan missed payments are tracked per loan, not globally. Missing a payment on one loan does not affect others.

## Limits

| Limit                       | Value |
| --------------------------- | :---: |
| Max outstanding loans       |   3   |
| Loan cooldown (ticks)       |   6   |
| Max missed payments allowed |   3   |
| Loan eligibility threshold  | $10,000 |

## UI Integration

### Loan Button

A "Take Loan" button appears in the economy panel when money drops below `LOAN_ELIGIBILITY_THRESHOLD` and the player is eligible. Clicking opens a dialog:

```txt
┌─ Take a Loan ──────────────────────┐
│                                     │
│  Small ($5,000) — $458/mo for 12mo  │
│  Medium ($10,000) — $916/mo for 12mo│
│  Large ($20,000) — $1,833/mo for 12mo│
│                                     │
│  [Take Small]  [Take Medium]  [Take Large]
│                                     │
│  Active loans: 1/3                  │
└─────────────────────────────────────┘
```

### Loan Status

The economy panel shows:

```txt
Loans:
  Small ($5,000) — 8 months remaining — on track
  Medium ($10,000) — 5 months remaining — 1 missed payment ⚠
```

### Warnings

| Condition                                       | Warning                    | Severity |
| ----------------------------------------------- | -------------------------- | :------: |
| `activeLoans > 0`                               | "Outstanding loans"        |  low     |
| Any loan has `missedPayments >= 1`              | "Loan payment due"         |  high    |
| Any loan has `missedPayments >= 2`              | "Loan default imminent"    |  critical|
| Money below threshold and eligible for loan     | "City running low on funds"|  medium  |

## Data Parameters

All constants in `src/data/balance/loans.ts`:

```txt
SMALL_LOAN_PRINCIPAL           = 5000
MEDIUM_LOAN_PRINCIPAL          = 10000
LARGE_LOAN_PRINCIPAL           = 20000
LOAN_ANNUAL_RATE               = 0.10
LOAN_TERM_MONTHS               = 12
MAX_LOANS                      = 3
MAX_MISSED_PAYMENTS            = 3
LOAN_ELIGIBILITY_THRESHOLD     = 10000
LOAN_COOLDOWN_TICKS            = 6
```

## Integration Points

| System     | Integration                                               |
| ---------- | --------------------------------------------------------- |
| Economy    | Monthly payment deducted as expense; principal added      |
| Bankruptcy | Missed payments trigger bankruptcy after threshold         |
| UI         | Loan dialog, loan status panel, take-loan button           |
| Warnings   | Loan-related warnings for missed and approaching payments  |

## Tests

1. Taking a Small loan adds $5,000 to money.
2. Taking a Medium loan adds $10,000 to money.
3. Taking a Large loan adds $20,000 to money.
4. Monthly payment for Small loan is $458.33 ($5,000 × 1.10 / 12).
5. Monthly payment for Medium loan is $916.67.
6. Monthly payment for Large loan is $1,833.33.
7. Loan is deducted from money each month when sufficient funds exist.
8. `remainingMonths` decrements each month after payment.
9. Loan is removed after `remainingMonths` reaches 0.
10. Taking a 4th loan is blocked when 3 are already active.
11. Taking a loan is blocked if money is above eligibility threshold.
12. Taking a loan is blocked if cooldown has not elapsed.
13. Missed payment increments when money is insufficient.
14. Bankruptcy triggers after 3 consecutive missed payments on the same loan.
15. A single successful payment resets `missedPayments` to 0 for that loan.
16. Missed payments on one loan are independent of other loans.
17. "Outstanding loans" warning appears when any active loan exists.
18. "Loan payment due" warning appears when a loan has missed payments.
19. "Loan default imminent" warning appears at 2 missed payments.
20. Loan state round-trips correctly through save/load.
21. Last loan tick is recorded and checked against cooldown.
22. Multiple loans of different types can coexist.
23. Loan dialog shows correct available amounts and monthly payment values.
