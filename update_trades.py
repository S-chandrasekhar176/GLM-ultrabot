import sys

content = open('src/app/trades/page.tsx', 'r', encoding='utf-8').read()

import_statement = "import { usePositions, useTrades } from '@/hooks/useApi';\n"
if 'usePositions' not in content:
    idx = content.find('import { Badge }')
    content = content[:idx] + import_statement + content[idx:]

old_pos = 'const [positions, setPositions] = useState<Position[]>(MOCK_POSITIONS);'
new_pos = '''const { data: positionsData = [], closePosition, isClosing } = usePositions();
  const positions = (positionsData as Position[]) || [];'''
content = content.replace(old_pos, new_pos)

old_close = '''  const handleClosePosition = (id: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== id));
    setCloseDialogId(null);
    const pos = positions.find((p) => p.id === id);
    toast.success(`${pos?.symbol} position closed`, {
      description: `P&L: ${INR(pos?.unrealizedPnl ?? 0)}`,
    });
  };'''
new_close = '''  const handleClosePosition = (id: string) => {
    closePosition(id, {
      onSuccess: () => {
        setCloseDialogId(null);
        toast.success('Position closed');
      },
      onError: (err) => {
        toast.error('Failed to close position', { description: String(err) });
      }
    });
  };'''
content = content.replace(old_close, new_close)

old_trades = 'const [trades, setTrades] = useState<HistoricalTrade[]>(MOCK_TRADES);'
new_trades = '''const { data: tradesData = [], isLoading: isLoadingTrades } = useTrades();
  const trades = (tradesData as HistoricalTrade[]) || [];'''
content = content.replace(old_trades, new_trades)

content = content.replace('const [isLoading] = useState(false);', 'const isLoading = isLoadingTrades;')
content = content.replace('if (resetSignal > 0) setPositions([]);', '// Positions handled by react-query reset')
content = content.replace('if (resetSignal > 0) setTrades([]);', '// Trades handled by react-query reset')

open('src/app/trades/page.tsx', 'w', encoding='utf-8').write(content)
print('Updated trades page successfully')
