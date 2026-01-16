import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar,
    TrendingUp,
    TrendingDown,
    Flame,
    Layers,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { fmtNum, fmtUSD, fmtEth } from "../utils/format";

// --- Interfaces (Identiques à vos fichiers sources) ---

interface RawEvent {
    type: "BUY" | "SELL";
    tokenId: string;
    price: number;
    time: string;
}

interface OhlcvData {
    timestamp: number;
    usd: { o: number; h: number; l: number; c: number; v: number };
    quote: { o: number; h: number; l: number; c: number; v: number };
}

interface BurnDataResponse {
    daily: Record<string, { burn: number; count: number }>;
}

// Interface pour une ligne agrégée du tableau
interface AggregatedRow {
    periodLabel: string;
    startDate: Date; // Pour le tri
    // Volume
    volUsd: number;
    volEth: number;
    // Market Cap & Price Action
    openPrice: number;
    closePrice: number;
    evolution: number;
    mcapUsd: number;
    // NFT Flow
    buyCount: number;
    buyVol: number;
    sellCount: number;
    sellVol: number;
    // Burn
    burnAmount: number;
}

interface StrategyAnalysisTableProps {
    strategyAddress: string;
    tokenSymbol?: string;
    collectionImage?: string;
    className?: string;
}

type Period = 'day' | 'week' | 'month';

// --- Helpers ---

// Génère une clé de regroupement (ex: "2025-10-20", "2025-W42", "2025-10")
const getPeriodKey = (date: Date, period: Period): string => {
    const y = date.getUTCFullYear();
    const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const d = date.getUTCDate().toString().padStart(2, '0');

    if (period === 'day') return `${y}-${m}-${d}`;
    if (period === 'month') return `${y}-${m}`;

    // Logique pour la semaine commençant le Lundi
    const tempDate = new Date(date.getTime());
    const day = tempDate.getUTCDay(); // 0 = Dimanche, 1 = Lundi...

    // On calcule l'écart pour revenir au lundi (si c'est dimanche (0), on recule de 6 jours)
    const diff = tempDate.getUTCDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(tempDate.setUTCDate(diff));

    return `W-${monday.getUTCFullYear()}-${(monday.getUTCMonth() + 1)}-${monday.getUTCDate()}`;
};

const getPeriodLabel = (key: string, period: Period, firstDate: Date): string => {
    if (period === 'day') {
        return firstDate.toLocaleDateString('en-US', {
            weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC'
        });
    }

    if (period === 'month') {
        return firstDate.toLocaleDateString('en-US', {
            month: 'long', year: 'numeric', timeZone: 'UTC'
        });
    }

    // Pour la semaine, on trouve le lundi
    const d = new Date(firstDate.getTime());
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setUTCDate(diff));

    return `Week of ${monday.toLocaleDateString('en-US', {
        day: 'numeric', month: 'short', timeZone: 'UTC'
    })}`;
};
export const StrategyAnalysisTable: React.FC<StrategyAnalysisTableProps> = ({ strategyAddress, className, tokenSymbol, collectionImage }) => {
    const [period, setPeriod] = useState<Period>('month');
    const [rawEvents, setRawEvents] = useState<RawEvent[]>([]);
    const [ohlcv, setOhlcv] = useState<OhlcvData[]>([]);
    const [burnStats, setBurnStats] = useState<BurnDataResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // --- 1. Fetch Data ---
    useEffect(() => {
        if (!strategyAddress) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [eventsRes, ohlcvRes, burnRes] = await Promise.all([
                    fetch(`https://tw-aggregator.wut-tw.workers.dev/details/${strategyAddress}.json`),
                    fetch(`https://tw-aggregator.wut-tw.workers.dev/details/${strategyAddress}_ohlcv.json`),
                    fetch(`https://tw-aggregator.wut-tw.workers.dev/details/${strategyAddress}_burn.json`)
                ]);

                const eventsData = eventsRes.ok ? await eventsRes.json() : {};
                setRawEvents(eventsData.rawEvents || []);
                setOhlcv(ohlcvRes.ok ? await ohlcvRes.json() : []);
                setBurnStats(burnRes.ok ? await burnRes.json() : null);

            } catch (error) {
                console.error("Failed to load table data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [strategyAddress]);

    // --- 2. Aggregation Logic ---
    const rows = useMemo(() => {
        if (!ohlcv.length) return [];

        const groups = new Map<string, AggregatedRow>();

        // A. Traitement des chandeliers (OHLCV) pour Volume & Prix
        // On trie pour être sûr d'avoir Open du début et Close de la fin
        const sortedOhlcv = [...ohlcv].sort((a, b) => a.timestamp - b.timestamp);

        sortedOhlcv.forEach((candle) => {
            const date = new Date(candle.timestamp * 1000);
            const key = getPeriodKey(date, period);

            if (!groups.has(key)) {
                groups.set(key, {
                    periodLabel: '', // Sera défini après
                    startDate: date,
                    volUsd: 0,
                    volEth: 0,
                    openPrice: candle.usd.o, // Open du premier jour
                    closePrice: candle.usd.c,
                    evolution: 0,
                    mcapUsd: 0,
                    buyCount: 0, buyVol: 0,
                    sellCount: 0, sellVol: 0,
                    burnAmount: 0
                });
            }

            const group = groups.get(key)!;
            // Accumulation Volume
            group.volUsd += candle.usd.v;
            group.volEth += candle.quote.v;
            // Update Close price (écrase jusqu'au dernier)
            group.closePrice = candle.usd.c;

            // Burn Daily Look-up
            const dateStr = date.toISOString().split('T')[0];
            if (burnStats?.daily?.[dateStr]) {
                group.burnAmount += burnStats.daily[dateStr].burn;
            }
        });

        // B. Traitement des Events (NFT Flow)
        rawEvents.forEach((ev) => {
            const date = new Date(ev.time);
            const key = getPeriodKey(date, period);
            const group = groups.get(key);

            if (group) {
                if (ev.type === 'BUY') {
                    group.buyCount++;
                    group.buyVol += ev.price;
                } else {
                    group.sellCount++;
                    group.sellVol += ev.price;
                }
            }
        });

        // C. Finalisation (Labels, Mcap, Evolution)
        const result = Array.from(groups.values()).map(group => {
            group.periodLabel = getPeriodLabel('', period, group.startDate);

            // Evolution: (Close - Open) / Open
            group.evolution = ((group.closePrice - group.openPrice) / group.openPrice) * 100;

            // Mcap approx (Supply fictive 1B pour l'exemple, à adapter si dispo dans strategy.json)
            group.mcapUsd = group.closePrice * 1_000_000_000;

            return group;
        });

        // Tri décroissant (plus récent en haut)
        return result.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

    }, [ohlcv, rawEvents, burnStats, period]);


    if (loading) return <div className="p-10 text-center text-gray-500 animate-pulse">Loading analysis...</div>;

    return (
        <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden ${className}`}>

            {/* --- Header & Controls --- */}
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-800/20">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Layers className="text-indigo-500" size={20} />
                        Strategy Activity
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Aggregated analysis of Flows, Volume & Burns</p>
                </div>

                {/* Period Switcher */}
                <div className="flex bg-gray-200 dark:bg-gray-800 p-1 rounded-lg">
                    {(['day', 'week', 'month'] as Period[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${period === p
                                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
                {/* --- Strategy Branding --- */}
                <div className="flex items-center gap-3 pl-6 border-l border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Strategy</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{tokenSymbol}</span>
                    </div>
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
                        {collectionImage && (
                            <img
                                src={collectionImage}
                                alt=""
                                className="object-cover"
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* --- Table --- */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800/80 text-[10px] uppercase tracking-wider text-gray-500 font-bold border-b border-gray-200 dark:border-gray-700">
                            <th className="px-5 py-4 w-[20%]">Period</th>
                            <th className="px-5 py-4 w-[20%]">Volume</th>
                            <th className="px-5 py-4 w-[20%]">Market Cap & Evo</th>
                            <th className="px-5 py-4 w-[25%]">NFT Flow (Buy/Sell)</th>
                            <th className="px-5 py-4 w-[15%] text-right">Burn Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {rows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                {/* 1. Period */}
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                                            <Calendar size={16} />
                                        </div>
                                        <span className="font-semibold text-sm text-gray-900 dark:text-white">
                                            {row.periodLabel}
                                        </span>
                                    </div>
                                </td>

                                {/* 2. Volume */}
                                <td className="px-5 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                                            {fmtUSD(row.volUsd)}
                                        </span>
                                        <span className="text-xs text-gray-500 font-mono mt-0.5">
                                            {fmtEth(row.volEth)}
                                        </span>
                                    </div>
                                </td>

                                {/* 3. Market Cap & Evolution */}
                                <td className="px-5 py-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                                            {fmtUSD(row.mcapUsd, 2)}
                                        </span>
                                        <div className={`flex items-center text-xs font-bold ${row.evolution >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {row.evolution >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                                            {row.evolution >= 0 ? '+' : ''}{row.evolution.toFixed(2)}%
                                        </div>
                                    </div>
                                </td>

                                {/* 4. NFT Flow (Split Bar/Stats) */}
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-4">
                                        {/* Buys */}
                                        <div className="flex flex-col items-start">
                                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-0.5">
                                                <ArrowDownRight size={12} /> {row.buyCount} Buys
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-mono">
                                                Vol: {fmtEth(row.buyVol)}
                                            </span>
                                        </div>

                                        <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>

                                        {/* Sells */}
                                        <div className="flex flex-col items-start">
                                            <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 text-xs font-bold uppercase mb-0.5">
                                                <ArrowUpRight size={12} /> {row.sellCount} Sells
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-mono">
                                                Vol: {fmtEth(row.sellVol)}
                                            </span>
                                        </div>
                                    </div>
                                </td>

                                {/* 5. Burn Amount */}
                                <td className="px-5 py-4 text-right">
                                    <div className="inline-flex flex-col items-end">
                                        <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-500 font-bold text-sm">
                                            <Flame size={14} className={row.burnAmount > 0 ? "animate-pulse" : ""} />
                                            {fmtNum(row.burnAmount)}
                                        </div>
                                        <span className="text-[10px] text-orange-400/60 uppercase font-bold tracking-wider">Tokens</span>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-400 text-sm">
                                    No data available for this period.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};