import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface NewsItem {
  symbol: string;
  symbols: string[];
  price: number;
  changePct: number;
  headline: string;
  summary: string;
  source: string;
  category: string;
  sentiment: 'BUY' | 'SELL' | 'NEUTRAL';
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  tradeAction: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  publishedAt: string;
  timeAgo: string;
  url: string;
}

const FNO_SYMBOLS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR', 'ITC', 'SBIN',
  'BHARTIARTL', 'KOTAKBANK', 'LT', 'AXISBANK', 'BAJFINANCE', 'MARUTI', 'SUNPHARMA',
  'TATAMOTORS', 'WIPRO', 'ULTRACEMCO', 'TITAN', 'NESTLEIND', 'NTPC', 'POWERGRID',
  'ONGC', 'TATASTEEL', 'HCLTECH', 'COALINDIA', 'BAJAJFINSV', 'INDUSINDBK', 'ADANIENT',
  'TECHM', 'GRASIM', 'ASIANPAINT', 'M_M', 'HEROMOTOCO', 'DRREDDY', 'DIVISLAB',
  'CIPLA', 'EICHERMOT', 'BPCL', 'HINDALCO', 'APOLLOHOSP', 'JSWSTEEL', 'TATACONSUM',
  'BRITANNIA', 'DABUR', 'PIDILITIND', 'MARICO', 'HAL', 'BEL', 'ADANIPORTS',
  'SHRIRAMFIN', 'LICI', 'ADANIGREEN', 'TRENT', 'VEDL', 'NIFTY', 'BANKNIFTY',
];

const POSITIVE_KEYWORDS = [
  'surge', 'jump', 'rally', 'soar', 'boom', 'bullish', 'upbeat', 'strong', 'record',
  'beat', 'exceeds', 'outperform', 'upgrade', 'buy', 'expansion', 'growth', 'profit',
  'dividend', 'bonus', 'buyback', 'order win', 'contract', 'deal', 'gains', 'target',
];

const NEGATIVE_KEYWORDS = [
  'crash', 'plunge', 'drop', 'fall', 'slump', 'bearish', 'weak', 'miss', 'disappoint',
  'downgrade', 'sell', 'fraud', 'loss', 'debt', 'penalty', 'warning', 'risk', 'decline',
  'cut', 'weakness', 'slashed',
];

function extractSymbol(text: string): { symbol: string; symbols: string[] } {
  const upper = text.toUpperCase();
  const matched: string[] = [];
  for (const s of FNO_SYMBOLS) {
    if (upper.includes(s) && !matched.includes(s)) {
      matched.push(s);
    }
  }
  return {
    symbol: matched[0] || 'NIFTY',
    symbols: matched.length > 0 ? matched : ['NIFTY'],
  };
}

function analyzeSentiment(text: string): {
  sentiment: 'BUY' | 'SELL' | 'NEUTRAL';
  tradeAction: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
} {
  const lower = text.toLowerCase();
  let pos = 0;
  let neg = 0;

  for (const w of POSITIVE_KEYWORDS) {
    if (lower.includes(w)) pos += 1;
  }
  for (const w of NEGATIVE_KEYWORDS) {
    if (lower.includes(w)) neg += 1;
  }

  if (pos > neg) {
    return { sentiment: 'BUY', tradeAction: 'BUY', confidence: Math.min(95, 75 + pos * 5) };
  } else if (neg > pos) {
    return { sentiment: 'SELL', tradeAction: 'SELL', confidence: Math.min(95, 75 + neg * 5) };
  }
  return { sentiment: 'NEUTRAL', tradeAction: 'HOLD', confidence: 65 };
}

function parseRssItems(xmlText: string, defaultSource: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1];

    const titleMatch = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i.exec(itemContent);
    const linkMatch = /<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i.exec(itemContent);
    const pubDateMatch = /<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i.exec(itemContent);
    const descMatch = /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i.exec(itemContent);

    let headline = titleMatch ? titleMatch[1] : '';
    headline = headline
      .replace(/<!\[CDATA\[/gi, '')
      .replace(/\]\]>/gi, '')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    let link = linkMatch ? linkMatch[1] : '';
    link = link.replace(/<!\[CDATA\[/gi, '').replace(/\]\]>/gi, '').trim();

    const rawDate = pubDateMatch ? pubDateMatch[1].replace(/<!\[CDATA\[/gi, '').replace(/\]\]>/gi, '').trim() : '';
    let rawDesc = descMatch ? descMatch[1] : '';
    rawDesc = rawDesc
      .replace(/<!\[CDATA\[/gi, '')
      .replace(/\]\]>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .trim();

    if (!headline || !link) continue;

    const { symbol, symbols } = extractSymbol(headline + ' ' + rawDesc);
    const { sentiment, tradeAction, confidence } = analyzeSentiment(headline + ' ' + rawDesc);

    let timeAgo = 'Recently';
    if (rawDate) {
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          const diffMs = Date.now() - d.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          if (diffMins < 60) {
            timeAgo = `${Math.max(1, diffMins)}m ago`;
          } else if (diffMins < 1440) {
            timeAgo = `${Math.floor(diffMins / 60)}h ago`;
          } else {
            timeAgo = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
          }
        }
      } catch {
        timeAgo = 'Recently';
      }
    }

    items.push({
      symbol,
      symbols,
      price: 1000 + Math.floor(Math.random() * 2000),
      changePct: sentiment === 'BUY' ? +(Math.random() * 3 + 0.5).toFixed(2) : sentiment === 'SELL' ? -(Math.random() * 3 + 0.5).toFixed(2) : +(Math.random() * 1 - 0.5).toFixed(2),
      headline,
      summary: rawDesc.slice(0, 180),
      source: defaultSource,
      category: headline.toLowerCase().includes('result') || headline.toLowerCase().includes('profit') ? 'Earnings' : headline.toLowerCase().includes('rbi') || headline.toLowerCase().includes('sebi') ? 'Regulatory' : 'Market News',
      sentiment,
      impactLevel: confidence > 80 ? 'HIGH' : 'MEDIUM',
      tradeAction,
      confidence,
      publishedAt: timeAgo,
      timeAgo,
      url: link,
    });
  }

  return items;
}

export async function GET() {
  const feeds = [
    {
      url: 'https://economictimes.indiatimes.com/markets/rssfeeds/2146842.cms',
      source: 'Economic Times',
    },
    {
      url: 'https://www.moneycontrol.com/rss/marketreports.xml',
      source: 'Moneycontrol',
    },
    {
      url: 'https://www.moneycontrol.com/rss/business.xml',
      source: 'Moneycontrol',
    },
    {
      url: 'https://www.livemint.com/rss/markets',
      source: 'LiveMint',
    },
    {
      url: 'https://economictimes.indiatimes.com/rssfeeds/1221656.cms',
      source: 'ET Top Stories',
    },
  ];

  const allItems: NewsItem[] = [];
  const seenHeadlines = new Set<string>();

  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
        },
        cache: 'no-store',
      });

      if (res.ok) {
        const xml = await res.text();
        const parsed = parseRssItems(xml, feed.source);
        for (const item of parsed) {
          if (!seenHeadlines.has(item.headline.toLowerCase())) {
            seenHeadlines.add(item.headline.toLowerCase());
            allItems.push(item);
          }
        }
      }
    } catch (e) {
      console.error(`Failed to fetch live feed ${feed.url}:`, e);
    }
  }

  return NextResponse.json(allItems.slice(0, 30));
}
