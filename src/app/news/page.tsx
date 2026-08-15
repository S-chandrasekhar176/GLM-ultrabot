'use client';

import { useState, useMemo } from 'react';
import { useNews } from '@/hooks/useApi';
import { theme } from '@/styles/theme';
import {
  Newspaper,
  TrendingUp,
  TrendingDown,
  Clock,
  ExternalLink,
  ShieldCheck,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Search,
  Filter,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function NewsPage() {
  const { data: newsItems, isLoading, isError, refetch } = useNews();
  const [filterSentiment, setFilterSentiment] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [filterProvider, setFilterProvider] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!Array.isArray(newsItems)) return [];
    return newsItems.filter((item: any) => {
      const matchesSentiment =
        filterSentiment === 'ALL' ||
        (item.sentiment || item.tradeAction || '').toUpperCase() === filterSentiment;

      const src = (item.source || '').toLowerCase();
      let matchesProvider = true;
      if (filterProvider === 'ET') {
        matchesProvider = src.includes('economic') || src.includes('et');
      } else if (filterProvider === 'MC') {
        matchesProvider = src.includes('moneycontrol');
      } else if (filterProvider === 'LM') {
        matchesProvider = src.includes('livemint') || src.includes('mint');
      } else if (filterProvider === 'OTHER') {
        matchesProvider = !src.includes('economic') && !src.includes('moneycontrol') && !src.includes('mint');
      }

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.symbol || '').toLowerCase().includes(q) ||
        (item.headline || '').toLowerCase().includes(q) ||
        (item.source || '').toLowerCase().includes(q) ||
        (item.symbols || []).some((s: string) => s.toLowerCase().includes(q));

      return matchesSentiment && matchesProvider && matchesSearch;
    });
  }, [newsItems, filterSentiment, filterProvider, searchQuery]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-ub-accent/15 border border-ub-accent/20"
          >
            <Newspaper className="w-5 h-5 text-ub-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ub-text-primary">
              Real-time Market News & Sentiment
            </h1>
            <p className="text-sm text-ub-text-muted">
              Live automated news sentiment analysis, published times & trade signals for NSE F&O stocks
            </p>
          </div>
        </div>

        {/* Filter actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-48 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ub-text-muted" />
            <Input
              placeholder="Search ticker or news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-ub-surface border-ub-border text-ub-text-primary placeholder:text-ub-text-muted/60"
            />
          </div>

          {/* Sentiment Filter */}
          <div className="flex items-center bg-ub-surface border border-ub-border rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterSentiment('ALL')}
              className={`h-7 px-2.5 text-xs font-medium rounded-md ${
                filterSentiment === 'ALL'
                  ? 'bg-ub-accent/15 text-ub-accent'
                  : 'text-ub-text-muted hover:text-ub-text-primary'
              }`}
            >
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterSentiment('BUY')}
              className={`h-7 px-2.5 text-xs font-medium rounded-md ${
                filterSentiment === 'BUY'
                  ? 'bg-ub-profit/15 text-ub-profit font-semibold'
                  : 'text-ub-text-muted hover:text-ub-text-primary'
              }`}
            >
              Buy
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterSentiment('SELL')}
              className={`h-7 px-2.5 text-xs font-medium rounded-md ${
                filterSentiment === 'SELL'
                  ? 'bg-ub-loss/15 text-ub-loss font-semibold'
                  : 'text-ub-text-muted hover:text-ub-text-primary'
              }`}
            >
              Sell
            </Button>
          </div>
        </div>
      </div>

      {/* Provider Switcher Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-ub-text-muted flex items-center gap-1 shrink-0 mr-1">
          <Filter className="h-3.5 w-3.5" /> Source Provider:
        </span>
        <button
          onClick={() => setFilterProvider('ALL')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0 ${
            filterProvider === 'ALL'
              ? 'bg-ub-accent/15 border-ub-accent text-ub-accent shadow-sm'
              : 'bg-ub-surface border-ub-border text-ub-text-muted hover:border-ub-border/80 hover:text-ub-text-primary'
          }`}
        >
          <span>🌐</span> All Providers
        </button>
        <button
          onClick={() => setFilterProvider('ET')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0 ${
            filterProvider === 'ET'
              ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm'
              : 'bg-ub-surface border-ub-border text-ub-text-muted hover:border-ub-border/80 hover:text-ub-text-primary'
          }`}
        >
          <span>📰</span> Economic Times
        </button>
        <button
          onClick={() => setFilterProvider('MC')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0 ${
            filterProvider === 'MC'
              ? 'bg-blue-500/15 border-blue-500 text-blue-400 shadow-sm'
              : 'bg-ub-surface border-ub-border text-ub-text-muted hover:border-ub-border/80 hover:text-ub-text-primary'
          }`}
        >
          <span>📊</span> Moneycontrol
        </button>
        <button
          onClick={() => setFilterProvider('LM')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0 ${
            filterProvider === 'LM'
              ? 'bg-orange-500/15 border-orange-500 text-orange-400 shadow-sm'
              : 'bg-ub-surface border-ub-border text-ub-text-muted hover:border-ub-border/80 hover:text-ub-text-primary'
          }`}
        >
          <span>⚡</span> LiveMint
        </button>
        <button
          onClick={() => setFilterProvider('OTHER')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0 ${
            filterProvider === 'OTHER'
              ? 'bg-purple-500/15 border-purple-500 text-purple-400 shadow-sm'
              : 'bg-ub-surface border-ub-border text-ub-text-muted hover:border-ub-border/80 hover:text-ub-text-primary'
          }`}
        >
          <span>🔍</span> NSE / Others
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="bg-ub-surface border-ub-border">
              <CardContent className="p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-5 w-24 rounded" />
                  <Skeleton className="h-5 w-16 rounded" />
                </div>
                <Skeleton className="h-12 w-full rounded" />
                <div className="flex justify-between items-center pt-2">
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-4 w-28 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="border-ub-loss/30 bg-ub-loss/5 p-8 text-center space-y-3">
          <p className="text-ub-loss font-medium">Failed to load news feed.</p>
          <Button
            size="sm"
            onClick={() => refetch()}
            className="bg-ub-accent hover:bg-ub-accent-hover text-ub-background text-xs font-semibold"
          >
            Retry News Feed
          </Button>
        </Card>
      ) : filteredItems && filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item: any, idx: number) => {
            const sentiment = (item.sentiment || item.tradeAction || 'NEUTRAL').toUpperCase();
            const isBuy = sentiment === 'BUY' || sentiment === 'BULLISH';
            const isSell = sentiment === 'SELL' || sentiment === 'BEARISH';
            const relatedSymbols: string[] = item.symbols || (item.symbol ? [item.symbol] : []);

            return (
              <Card
                key={idx}
                className="bg-ub-surface border-ub-border hover:border-ub-accent/40 transition-all duration-200 shadow-sm flex flex-col justify-between"
              >
                <CardContent className="p-5 flex flex-col h-full space-y-3">
                  {/* Top Bar: Primary Symbol & Trade Sentiment Signal */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className="font-bold text-xs px-2 py-0.5 border-ub-accent/30 text-ub-accent bg-ub-accent/10"
                      >
                        {item.symbol || 'NIFTY'}
                      </Badge>
                      {item.category && (
                        <span className="text-[11px] text-ub-text-muted px-1.5 py-0.5 rounded bg-ub-surface-hover">
                          {item.category}
                        </span>
                      )}
                    </div>

                    {/* Trade Signal Badge */}
                    <div className="flex items-center gap-1">
                      {isBuy ? (
                        <Badge className="bg-ub-profit/15 hover:bg-ub-profit/20 text-ub-profit border border-ub-profit/30 font-semibold text-[11px] px-2 py-0.5 flex items-center gap-1">
                          <ArrowUpRight className="h-3 w-3" />
                          BUY SIGNAL
                        </Badge>
                      ) : isSell ? (
                        <Badge className="bg-ub-loss/15 hover:bg-ub-loss/20 text-ub-loss border border-ub-loss/30 font-semibold text-[11px] px-2 py-0.5 flex items-center gap-1">
                          <ArrowDownRight className="h-3 w-3" />
                          SELL SIGNAL
                        </Badge>
                      ) : (
                        <Badge className="bg-ub-text-muted/15 text-ub-text-muted border border-ub-border font-medium text-[11px] px-2 py-0.5 flex items-center gap-1">
                          <Minus className="h-3 w-3" />
                          NEUTRAL
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* News Headline with Direct Source Link */}
                  {(() => {
                    const isGenericUrl =
                      !item.url ||
                      item.url.endsWith('/markets') ||
                      item.url.endsWith('/markets/') ||
                      item.url.endsWith('/stocks/') ||
                      item.url.endsWith('corporate-filings-announcements') ||
                      item.url.endsWith('/news') ||
                      item.url.endsWith('/finance/') ||
                      item.url.split('/').length <= 4;

                    const articleUrl = !isGenericUrl
                      ? item.url
                      : `https://news.google.com/search?q=${encodeURIComponent(
                          (item.symbol ? item.symbol + ' ' : '') + item.headline
                        )}`;

                    return (
                      <>
                        <a
                          href={articleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-ub-text-primary leading-snug line-clamp-3 hover:text-ub-accent transition-colors flex items-start gap-1 group"
                          title="Click to open full live article directly"
                        >
                          <span className="flex-1">{item.headline}</span>
                          <ExternalLink className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:text-ub-accent shrink-0 mt-0.5" />
                        </a>

                        {/* Summary / Impact Note if available */}
                        {item.summary && (
                          <p className="text-xs text-ub-text-muted line-clamp-2 leading-relaxed">
                            {item.summary}
                          </p>
                        )}

                        {/* Related Symbols / Tags */}
                        {relatedSymbols.length > 1 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="text-[10px] text-ub-text-muted flex items-center gap-0.5">
                              <Tag className="h-2.5 w-2.5" /> Related:
                            </span>
                            {relatedSymbols.slice(0, 4).map((sym: string) => (
                              <span
                                key={sym}
                                className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-ub-surface-hover border border-ub-border text-ub-text-primary"
                              >
                                {sym}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Bottom Metadata: Direct Article Verification Link & Published Time */}
                        <div className="flex items-center justify-between pt-3 mt-auto border-t border-ub-border text-xs gap-2">
                          <a
                            href={articleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 font-medium text-xs text-ub-accent hover:text-ub-accent-hover hover:underline bg-ub-accent/10 px-2 py-1 rounded-md transition-colors"
                            title="Read exact article on original publisher"
                          >
                            <span>{item.source || 'Live Source'}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>

                          <div className="flex items-center gap-1 text-[11px] text-ub-text-muted shrink-0">
                            <Clock className="h-3 w-3 text-ub-accent" />
                            <span>{item.publishedAt || item.timeAgo || 'Recently'}</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-ub-surface border-ub-border p-12 text-center">
          <Newspaper className="w-12 h-12 mx-auto mb-4 opacity-20 text-ub-text-muted" />
          <h3 className="text-base font-semibold text-ub-text-primary mb-1">
            No matching news found
          </h3>
          <p className="text-xs text-ub-text-muted">
            Try adjusting your search query or sentiment filter.
          </p>
        </Card>
      )}
    </div>
  );
}
