import { getExchangeRate, getIncomeSummary, getIncomes } from '@/lib/actions';
import IncomeView from '@/components/IncomeView';

export default async function IncomePage() {
  const [rate, summary, incomes] = await Promise.all([
    getExchangeRate(),
    getIncomeSummary(),
    getIncomes(),
  ]);

  return (
    <IncomeView
      initialRate={rate}
      summary={summary}
      incomes={incomes as any[]}
    />
  );
}
