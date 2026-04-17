import { getExchangeRate, getExpenseSummary, getExpenses } from '@/lib/actions';
import ExpensesView from '@/components/ExpensesView';

export default async function ExpensesPage() {
  const [rate, summary, expenses] = await Promise.all([
    getExchangeRate(),
    getExpenseSummary(),
    getExpenses(),
  ]);

  return <ExpensesView initialRate={rate} summary={summary} expenses={expenses as any[]} />;
}
