export interface ForecastPoint {
  period: string;
  actual?: number;
  forecast: number;
  lower: number;
  upper: number;
}

export function movingAverage(
  data: number[],
  window: number
): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

export function linearRegression(
  data: number[]
): { slope: number; intercept: number; r2: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0] || 0, r2: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const meanY = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssRes += (data[i] - predicted) ** 2;
    ssTot += (data[i] - meanY) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, r2 };
}

export function generateForecast(
  historicalData: { period: string; value: number }[],
  periodsAhead: number,
  periodLabels: string[]
): ForecastPoint[] {
  const values = historicalData.map((d) => d.value);
  const { slope, intercept } = linearRegression(values);

  // Calculate standard error for confidence bands
  const n = values.length;
  let sumResiduals2 = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    sumResiduals2 += (values[i] - predicted) ** 2;
  }
  const stdError = Math.sqrt(sumResiduals2 / Math.max(n - 2, 1));

  const result: ForecastPoint[] = [];

  // Historical points
  for (let i = 0; i < n; i++) {
    const forecast = slope * i + intercept;
    result.push({
      period: historicalData[i].period,
      actual: values[i],
      forecast: Math.round(forecast * 100) / 100,
      lower: Math.round((forecast - 1.96 * stdError) * 100) / 100,
      upper: Math.round((forecast + 1.96 * stdError) * 100) / 100,
    });
  }

  // Future points
  for (let i = 0; i < periodsAhead; i++) {
    const idx = n + i;
    const forecast = slope * idx + intercept;
    const widening = 1 + i * 0.1; // Widen confidence interval for further projections
    result.push({
      period: periodLabels[i] || `Period ${idx + 1}`,
      forecast: Math.round(forecast * 100) / 100,
      lower: Math.round((forecast - 1.96 * stdError * widening) * 100) / 100,
      upper: Math.round((forecast + 1.96 * stdError * widening) * 100) / 100,
    });
  }

  return result;
}

export function generateScenarios(
  baseValue: number,
  growthRate: number,
  periods: number
): { optimistic: number[]; base: number[]; pessimistic: number[] } {
  const optimistic: number[] = [];
  const base: number[] = [];
  const pessimistic: number[] = [];

  for (let i = 0; i < periods; i++) {
    base.push(Math.round(baseValue * (1 + growthRate) ** i));
    optimistic.push(Math.round(baseValue * (1 + growthRate * 1.5) ** i));
    pessimistic.push(Math.round(baseValue * (1 + growthRate * 0.5) ** i));
  }

  return { optimistic, base, pessimistic };
}
