'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  X,
  Flame,
  Newspaper,
  Star,
  Clock,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface HotStock {
  rank: number;
  symbol: string;
  price: number;
  changePct: number;
  volume: string;
  hotness: number;
  reason: string;
}

interface NewsStock {
  symbol: string;
  price: number;
  changePct: number;
  headline: string;
  source: string;
  timeAgo: string;
}

interface CustomStock {
  symbol: string;
  price: number;
  changePct: number;
}

// ─────────────────────────────────────────────
// Indian number formatting
// ─────────────────────────────────────────────

function formatINR(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatVolume(v: string): string {
  return v;
}

function changeColor(pct: number): string {
  return pct >= 0 ? 'text-ub-profit' : 'text-ub-loss';
}

// ─────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────

const HOT_STOCKS: HotStock[] = [
  { rank: 1, symbol: 'RELIANCE', price: 2948.35, changePct: 3.42, volume: '12.4L', hotness: 0.95, reason: 'Breakout near resistance with massive volume' },
  { rank: 2, symbol: 'TCS', price: 4125.80, changePct: 2.15, volume: '8.7L', hotness: 0.88, reason: 'Strong momentum above 20 DMA' },
  { rank: 3, symbol: 'HDFCBANK', price: 1692.45, changePct: 1.87, volume: '15.2L', hotness: 0.85, reason: 'Sector rotation into Banking — RSI breakout' },
  { rank: 4, symbol: 'INFY', price: 1843.20, changePct: -1.23, volume: '9.1L', hotness: 0.82, reason: 'Oversold bounce from VWAP support' },
  { rank: 5, symbol: 'ICICIBANK', price: 1245.60, changePct: 2.68, volume: '11.3L', hotness: 0.79, reason: 'Cup and handle breakout on 15-min chart' },
  { rank: 6, symbol: 'SBIN', price: 812.30, changePct: 4.12, volume: '22.1L', hotness: 0.76, reason: 'Gap up with strong FII buying' },
  { rank: 7, symbol: 'BHARTIARTL', price: 1623.75, changePct: 1.56, volume: '6.8L', hotness: 0.73, reason: '5G rollout catalyst — trend continuation' },
  { rank: 8, symbol: 'ITC', price: 468.90, changePct: -0.87, volume: '14.5L', hotness: 0.70, reason: 'Mean reversion signal at lower Bollinger Band' },
  { rank: 9, symbol: 'KOTAKBANK', price: 1876.40, changePct: 0.95, volume: '5.4L', hotness: 0.67, reason: 'Consolidation breakout with volume spike' },
  { rank: 10, symbol: 'LT', price: 3542.15, changePct: 2.34, volume: '4.2L', hotness: 0.64, reason: 'Infrastructure spend tailwind — new high' },
  { rank: 11, symbol: 'WIPRO', price: 578.25, changePct: -2.14, volume: '7.9L', hotness: 0.60, reason: 'News-driven selloff — potential reversal zone' },
  { rank: 12, symbol: 'AXISBANK', price: 1156.80, changePct: 1.43, volume: '10.1L', hotness: 0.57, reason: 'Bullish MACD crossover on daily' },
  { rank: 13, symbol: 'MARUTI', price: 12450.60, changePct: 1.78, volume: '2.1L', hotness: 0.53, reason: 'Auto sector strength — ORB breakout' },
  { rank: 14, symbol: 'SUNPHARMA', price: 1823.40, changePct: -0.56, volume: '3.8L', hotness: 0.49, reason: 'VWAP reversion play — pharma rotation' },
  { rank: 15, symbol: 'TATAMOTORS', price: 978.65, changePct: 3.87, volume: '18.6L', hotness: 0.45, reason: 'EV segment growth — strong momentum surge' },
];

const NEWS_STOCKS: NewsStock[] = [
  { symbol: 'ADANIENT', price: 3124.50, changePct: 5.67, headline: 'Adani Enterprises wins ₹18,000 crore defence contract from Indian Navy', source: 'Moneycontrol', timeAgo: '12 min ago' },
  { symbol: 'TATAPOWER', price: 462.80, changePct: 3.21, headline: 'Tata Power commissions 500 MW solar plant in Rajasthan ahead of schedule', source: 'ET', timeAgo: '28 min ago' },
  { symbol: 'HCLTECH', price: 1745.30, changePct: -2.45, headline: 'HCL Tech Q2 results miss estimates; revenue growth slows to 3.2%', source: 'NSE', timeAgo: '35 min ago' },
  { symbol: 'BAJFINANCE', price: 7234.90, changePct: 1.89, headline: 'RBI eases lending norms — NBFC stocks rally on regulatory tailwind', source: 'Moneycontrol', timeAgo: '48 min ago' },
  { symbol: 'JSWSTEEL', price: 892.15, changePct: 4.12, headline: 'Steel prices surge 8% on China stimulus; JSW Steel leads sector rally', source: 'ET', timeAgo: '1 hr ago' },
  { symbol: 'DRREDDY', price: 6345.70, changePct: -1.34, headline: 'USFDA issues warning letter to Dr Reddy\'s Hyderabad facility', source: 'Moneycontrol', timeAgo: '1.5 hr ago' },
  { symbol: 'PIIND', price: 3876.40, changePct: 6.78, headline: 'PI Industries bags $200 million multi-year agrochemical supply deal', source: 'NSE', timeAgo: '2 hr ago' },
  { symbol: 'DIVISLAB', price: 5423.10, changePct: 2.56, headline: 'Divi\'s Lab receives US FDA approval for generic cancer drug', source: 'ET', timeAgo: '2.5 hr ago' },
];

const INITIAL_CUSTOM: CustomStock[] = [
  { symbol: 'NIFTY', price: 24856.30, changePct: 0.87 },
  { symbol: 'BANKNIFTY', price: 53421.75, changePct: 1.24 },
  { symbol: 'RELIANCE', price: 2948.35, changePct: 3.42 },
  { symbol: 'SBIN', price: 812.30, changePct: 4.12 },
  { symbol: 'TCS', price: 4125.80, changePct: 2.15 },
];

const FO_UNIVERSE = [
  'NIFTY', 'BANKNIFTY', 'FINNIFTY', 'RELIANCE', 'TCS', 'HDFCBANK', 'INFY',
  'ICICIBANK', 'SBIN', 'BHARTIARTL', 'ITC', 'KOTAKBANK', 'LT', 'WIPRO',
  'AXISBANK', 'MARUTI', 'SUNPHARMA', 'TATAMOTORS', 'BAJFINANCE', 'HCLTECH',
  'ADANIENT', 'TATAPOWER', 'JSWSTEEL', 'DRREDDY', 'PIIND', 'DIVISLAB',
  'ASIANPAINT', 'TITAN', 'ULTRACEMCO', 'NESTLEIND', 'TECHM', 'ONGC',
  'NTPC', 'POWERGRID', 'COALINDIA', 'BPCL', 'HINDUNILVR', 'BAJAJFINSV',
  'INDUSINDBK', 'GRASIM', 'M_M', 'EICHERMOT', 'HEROMOTOCO', 'BRITANNIA',
];

// ─────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────

export default function WatchlistPage() {
  const [customStocks, setCustomStocks] = useState<CustomStock[]>(INITIAL_CUSTOM);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const filteredUniverse = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toUpperCase();
    const addedSymbols = new Set(customStocks.map((s) => s.symbol));
    return FO_UNIVERSE.filter(
      (s) => s.includes(q) && !addedSymbols.has(s),
    ).slice(0, 8);
  }, [searchQuery, customStocks]);

  const addStock = (symbol: string) => {
    if (customStocks.find((s) => s.symbol === symbol)) return;
    const mockPrice = 100 + Math.round(Math.random() * 5000);
    const mockChange = parseFloat((Math.random() * 8 - 3).toFixed(2));
    setCustomStocks((prev) => [...prev, { symbol, price: mockPrice, changePct: mockChange }]);
    setSearchQuery('');
    setSearchFocused(false);
  };

  const removeStock = (symbol: string) => {
    setCustomStocks((prev) => prev.filter((s) => s.symbol !== symbol));
  };

  return (
      <Tabs defaultValue="hotlist" className="space-y-4">
        <TabsList className="bg-ub-surface border border-ub-border">
          <TabsTrigger
            value="hotlist"
            className="data-[state=active]:bg-ub-accent/15 data-[state=active]:text-ub-accent text-ub-text-muted gap-1.5"
          >
            <Flame className="h-3.5 w-3.5" />
            Kronos Hot List
          </TabsTrigger>
          <TabsTrigger
            value="news"
            className="data-[state=active]:bg-ub-accent/15 data-[state=active]:text-ub-accent text-ub-text-muted gap-1.5"
          >
            <Newspaper className="h-3.5 w-3.5" />
            News-Driven
          </TabsTrigger>
          <TabsTrigger
            value="custom"
            className="data-[state=active]:bg-ub-accent/15 data-[state=active]:text-ub-accent text-ub-text-muted gap-1.5"
          >
            <Star className="h-3.5 w-3.5" />
            My Custom List
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Kronos Hot List ── */}
        <TabsContent value="hotlist">
          <Card className="bg-ub-surface border-ub-border">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-ub-text-primary flex items-center gap-2">
                  <Flame className="h-4 w-4 text-ub-accent" />
                  Kronos Hot List
                </CardTitle>
                <span className="text-[11px] text-ub-text-muted flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Auto-updated every 5 minutes
                </span>
              </div>
              <p className="text-xs text-ub-text-muted mt-1">AI-ranked opportunities across F&O universe</p>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[calc(100vh-220px)]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-ub-border hover:bg-transparent">
                      <TableHead className="text-ub-text-muted text-xs w-10">#</TableHead>
                      <TableHead className="text-ub-text-muted text-xs">Symbol</TableHead>
                      <TableHead className="text-ub-text-muted text-xs text-right">Price</TableHead>
                      <TableHead className="text-ub-text-muted text-xs text-right">Change %</TableHead>
                      <TableHead className="text-ub-text-muted text-xs text-right hidden sm:table-cell">Volume</TableHead>
                      <TableHead className="text-ub-text-muted text-xs hidden md:table-cell" style={{ minWidth: 120 }}>Hotness</TableHead>
                      <TableHead className="text-ub-text-muted text-xs hidden lg:table-cell">Reason</TableHead>
                      <TableHead className="text-ub-text-muted text-xs w-20">Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {HOT_STOCKS.map((stock) => (
                      <TableRow
                        key={stock.rank}
                        className="border-ub-border/50 hover:bg-ub-surface-hover cursor-pointer transition-colors"
                      >
                        <TableCell className="text-ub-text-muted text-xs font-mono">{stock.rank}</TableCell>
                        <TableCell className="font-medium text-ub-text-primary text-sm">{stock.symbol}</TableCell>
                        <TableCell className="text-right font-mono text-ub-text-primary text-sm">{formatINR(stock.price)}</TableCell>
                        <TableCell className={cn('text-right font-mono text-sm font-medium', changeColor(stock.changePct))}>
                          <span className="flex items-center justify-end gap-1">
                            {stock.changePct >= 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {stock.changePct >= 0 ? '+' : ''}{stock.changePct.toFixed(2)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-ub-text-muted text-xs font-mono hidden sm:table-cell">{formatVolume(stock.volume)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <Progress
                              value={stock.hotness * 100}
                              className="h-1.5 flex-1"
                            />
                            <span className="text-[10px] text-ub-text-muted font-mono w-8 text-right">
                              {(stock.hotness * 100).toFixed(0)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-ub-text-muted hidden lg:table-cell max-w-[200px] truncate">
                          {stock.reason}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 border-ub-accent/30 text-ub-accent bg-ub-accent/5"
                          >
                            Kronos AI
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: News-Driven ── */}
        <TabsContent value="news">
          <Card className="bg-ub-surface border-ub-border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold text-ub-text-primary flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-ub-accent" />
                News-Driven Stocks
              </CardTitle>
              <p className="text-xs text-ub-text-muted mt-1">Stocks with news catalysts impacting price action</p>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="space-y-3">
                {NEWS_STOCKS.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-ub-border/50 hover:border-ub-accent/30 hover:bg-ub-surface-hover transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-ub-text-primary text-sm">{item.symbol}</span>
                          <span className="font-mono text-sm text-ub-text-primary">{formatINR(item.price)}</span>
                          <span className={cn('font-mono text-xs font-medium', changeColor(item.changePct))}>
                            {item.changePct >= 0 ? '+' : ''}{item.changePct.toFixed(2)}%
                          </span>
                        </div>
                        <p className="text-xs text-ub-text-muted leading-relaxed">{item.headline}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1.5 py-0',
                            item.source === 'Moneycontrol'
                              ? 'border-ub-accent/30 text-ub-accent bg-ub-accent/5'
                              : item.source === 'ET'
                                ? 'border-ub-warning/30 text-ub-warning bg-ub-warning/5'
                                : 'border-ub-text-muted/30 text-ub-text-muted bg-ub-text-muted/5',
                          )}
                        >
                          {item.source}
                        </Badge>
                        <span className="text-[10px] text-ub-text-muted flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {item.timeAgo}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: My Custom List ── */}
        <TabsContent value="custom">
          <Card className="bg-ub-surface border-ub-border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold text-ub-text-primary flex items-center gap-2">
                <Star className="h-4 w-4 text-ub-accent" />
                My Custom List
              </CardTitle>
              <p className="text-xs text-ub-text-muted mt-1">Add and track your personal watchlist</p>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-4">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ub-text-muted" />
                <Input
                  placeholder="Search & add from F&O universe..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  className="pl-9 bg-ub-bg border-ub-border text-ub-text-primary placeholder:text-ub-text-muted/50 h-9 text-sm"
                />

                {/* Autocomplete dropdown */}
                {searchFocused && filteredUniverse.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-ub-surface border border-ub-border rounded-lg shadow-xl overflow-hidden">
                    {filteredUniverse.map((symbol) => (
                      <button
                        key={symbol}
                        onMouseDown={() => addStock(symbol)}
                        className="w-full px-3 py-2 text-left text-sm text-ub-text-primary hover:bg-ub-surface-hover flex items-center justify-between transition-colors"
                      >
                        <span className="font-medium">{symbol}</span>
                        <span className="text-[10px] text-ub-accent">+ Add</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom stock list */}
              {customStocks.length > 0 ? (
                <div className="space-y-2">
                  {customStocks.map((stock) => (
                    <div
                      key={stock.symbol}
                      className="flex items-center justify-between p-3 rounded-lg border border-ub-border/50 hover:border-ub-accent/30 hover:bg-ub-surface-hover transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-ub-text-primary text-sm min-w-[90px]">{stock.symbol}</span>
                        <span className="font-mono text-sm text-ub-text-primary">{formatINR(stock.price)}</span>
                        <span className={cn('font-mono text-xs font-medium', changeColor(stock.changePct))}>
                          {stock.changePct >= 0 ? '+' : ''}{stock.changePct.toFixed(2)}%
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); removeStock(stock.symbol); }}
                        className="h-7 w-7 p-0 text-ub-text-muted hover:text-ub-loss hover:bg-ub-loss/10"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-ub-text-muted text-sm">
                  <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Your custom watchlist is empty</p>
                  <p className="text-xs mt-1">Search above to add stocks</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
  );
}
