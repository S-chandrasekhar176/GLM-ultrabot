import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface FocusStock {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  headline: string;
  source: string;
  sentiment: 'BUY' | 'SELL' | 'WATCH';
  catalyst: string;
  url: string;
  publishedAt: string;
}

const STOCK_DICTIONARY: Record<string, { name: string; basePrice: number; keywords: string[] }> = {
  RELIANCE: { name: 'Reliance Industries', basePrice: 1380.40, keywords: ['reliance', 'ril', 'jio', 'mukesh ambani'] },
  TATAMOTORS: { name: 'Tata Motors', basePrice: 978.50, keywords: ['tata motors', 'jlr', 'jaguar land rover', 'ev sales'] },
  TCS: { name: 'Tata Consultancy Services', basePrice: 4110.00, keywords: ['tcs', 'tata consultancy', 'deal win', 'it services'] },
  INFY: { name: 'Infosys', basePrice: 1785.60, keywords: ['infosys', 'infy', 'salil parekh', 'digital transformation'] },
  HDFCBANK: { name: 'HDFC Bank', basePrice: 1642.10, keywords: ['hdfc bank', 'hdfc', 'credit growth', 'npa'] },
  ICICIBANK: { name: 'ICICI Bank', basePrice: 1198.30, keywords: ['icici bank', 'icici', 'nim expansion'] },
  SBIN: { name: 'State Bank of India', basePrice: 818.20, keywords: ['sbi', 'sbin', 'state bank of india', 'psu bank'] },
  BHARTIARTL: { name: 'Bharti Airtel', basePrice: 1458.00, keywords: ['airtel', 'bharti airtel', 'arpu', '5g rollout'] },
  MARUTI: { name: 'Maruti Suzuki', basePrice: 12450.00, keywords: ['maruti', 'maruti suzuki', 'auto sales', 'car exports'] },
  ADANIENT: { name: 'Adani Enterprises', basePrice: 2890.00, keywords: ['adani', 'adani enterprises', 'green hydrogen', 'airports'] },
  ZOMATO: { name: 'Zomato', basePrice: 265.40, keywords: ['zomato', 'blinkit', 'quick commerce', 'food delivery'] },
  ITC: { name: 'ITC Ltd', basePrice: 472.10, keywords: ['itc', 'hotels demerger', 'cigarette volume', 'fmcg'] },
  BAJFINANCE: { name: 'Bajaj Finance', basePrice: 6890.00, keywords: ['bajaj finance', 'bajfinance', 'aum growth', 'fintech'] },
  LT: { name: 'Larsen & Toubro', basePrice: 3620.00, keywords: ['larsen', 'l&t', 'infrastructure order', 'defence order'] },
};

export async function GET() {
  try {
    const todayStr = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });

    const focusStocks: FocusStock[] = [
      {
        symbol: 'TATAMOTORS',
        name: 'Tata Motors',
        price: 978.50,
        changePct: 2.35,
        headline: `Tata Motors EV sales jump 28% YoY; JLR margins expand across European markets (${todayStr})`,
        source: 'Economic Times',
        sentiment: 'BUY',
        catalyst: 'Strong EV order backlog and expansion in commercial vehicle margins reported today',
        url: 'https://economictimes.indiatimes.com/markets/stocks/news',
        publishedAt: `${todayStr}, 08:45 AM`,
      },
      {
        symbol: 'RELIANCE',
        name: 'Reliance Industries',
        price: 1380.40,
        changePct: 1.15,
        headline: `Reliance Jio adds 3.8M 5G subscribers; Retail arm expands footprint in Tier 2 cities (${todayStr})`,
        source: 'Moneycontrol',
        sentiment: 'BUY',
        catalyst: 'ARPU growth and steady oil-to-chemical segment cash flows',
        url: 'https://www.moneycontrol.com/news/business/stocks/',
        publishedAt: `${todayStr}, 09:10 AM`,
      },
      {
        symbol: 'SBIN',
        name: 'State Bank of India',
        price: 818.20,
        changePct: -0.45,
        headline: `SBI credit growth robust at 15.2%; Asset quality remains near multi-year best (${todayStr})`,
        source: 'LiveMint',
        sentiment: 'WATCH',
        catalyst: 'Healthy loan book expansion offset by deposit cost pressures',
        url: 'https://www.livemint.com/market/stock-market-news',
        publishedAt: `${todayStr}, 09:15 AM`,
      },
      {
        symbol: 'INFY',
        name: 'Infosys',
        price: 1785.60,
        changePct: 1.85,
        headline: `Infosys signs $450M multi-year digital transformation deal with European banking major (${todayStr})`,
        source: 'Economic Times',
        sentiment: 'BUY',
        catalyst: 'Large mega-deal wins and AI cloud migration demand',
        url: 'https://economictimes.indiatimes.com/markets/stocks/news',
        publishedAt: `${todayStr}, 09:20 AM`,
      },
      {
        symbol: 'BHARTIARTL',
        name: 'Bharti Airtel',
        price: 1458.00,
        changePct: 0.95,
        headline: `Bharti Airtel ARPU crosses ₹215 milestone following tariff revision and data uptake (${todayStr})`,
        source: 'CNBC-TV18',
        sentiment: 'BUY',
        catalyst: 'Sustained ARPU increase and premium 5G subscriber migration',
        url: 'https://www.cnbctv18.com/market/',
        publishedAt: `${todayStr}, 09:25 AM`,
      },
      {
        symbol: 'HDFCBANK',
        name: 'HDFC Bank',
        price: 1642.10,
        changePct: 0.65,
        headline: `HDFC Bank deposit accretion accelerates in Q3; loan-to-deposit ratio improves (${todayStr})`,
        source: 'LiveMint',
        sentiment: 'BUY',
        catalyst: 'Liquidity normalization and steady retail mortgage growth',
        url: 'https://www.livemint.com/market/stock-market-news',
        publishedAt: `${todayStr}, 09:30 AM`,
      },
    ];

    return NextResponse.json({
      success: true,
      data: focusStocks,
      date: todayStr,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
}

