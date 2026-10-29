// National monthly minimum wage by year (2026: Decreto nº 12.797/2025). Add the new value each
// January; a year not listed falls back to the latest one.
const MONTHLY_MINIMUM_WAGE: Record<number, number> = {
  2024: 1412,
  2025: 1518,
  2026: 1621,
};

// CLT standard month for a 44-hour week, the divisor used for the official hourly minimum.
const HOURS_PER_MONTH = 220;

const LATEST_YEAR = Math.max(...Object.keys(MONTHLY_MINIMUM_WAGE).map(Number));

export function hourlyMinimumWage(year: number) {
  return (MONTHLY_MINIMUM_WAGE[year] ?? MONTHLY_MINIMUM_WAGE[LATEST_YEAR]) / HOURS_PER_MONTH;
}

/** Hours someone earning the minimum wage works to pay `amount`, at that year's rate. */
export const minimumWageHours = (amount: number, year: number) =>
  amount / hourlyMinimumWage(year);
