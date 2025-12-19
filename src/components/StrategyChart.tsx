import React, { useState, useEffect, useMemo } from 'react';
import {
    ComposedChart,
    BarChart,
    Line,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { Loader2, TrendingUp, Flame, BarChart3 } from 'lucide-react';
import { fmtNum, fmtUSD, fmtEth } from "../utils/format";
import type { TooltipProps } from 'recharts';

// --- Types ---

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

// Nouvelle interface pour le fichier _burn.json
interface BurnDataResponse {
    lastProcessedBlock: number;
    totalBurn: number;
    totalCount: number;
    daily: Record<string, { burn: number; count: number }>;
}

interface ChartDataPoint {
    date: number;
    dateStr: string;
    // Candle
    open: number;
    close: number;
    high: number;
    low: number;
    openClose: [number, number];
    wick: [number, number];
    isUp: boolean;
    // Strat
    strategyBuyVolume: number;
    strategySellVolume: number;
    mcap: number;
    // Burn
    tokenBurn: number;
}

interface StrategyChartProps {
    strategyAddress: string;
    className?: string;
}

// --- Helper for high precision prices ---
const fmtPrice = (val: number, currency: 'usd' | 'quote') => {
    if (val === 0) return '0';
    const symbol = currency === 'usd' ? '$' : 'Ξ';
    return `${symbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
};


// --- Custom Tooltip (Displays ALL info) ---
const CustomTooltip = (
    props: TooltipProps<number, string> & { currency: 'quote' | 'usd' }
) => {
    const { active, currency } = props;

    const payload = (props as any).payload as any[] | undefined;

    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0]?.payload as ChartDataPoint | undefined;
    if (!data) return null;

    const dateStr = new Date(data.date).toLocaleDateString('en-US', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 rounded-xl shadow-xl text-xs min-w-[240px] z-50">
            <p className="text-gray-500 dark:text-gray-400 font-bold mb-2 border-b border-gray-100 dark:border-gray-800 pb-1 uppercase tracking-wider">
                {dateStr}
            </p>

            <div className="space-y-3">
                {/* 1. OHLC High Precision */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-gray-500">
                    <div className="flex justify-between"><span>Open:</span> <span className="font-mono text-gray-900 dark:text-white">{fmtPrice(data.open, currency)}</span></div>
                    <div className="flex justify-between"><span>High:</span> <span className="font-mono text-gray-900 dark:text-white">{fmtPrice(data.high, currency)}</span></div>
                    <div className="flex justify-between"><span>Low:</span> <span className="font-mono text-gray-900 dark:text-white">{fmtPrice(data.low, currency)}</span></div>
                    <div className="flex justify-between"><span>Close:</span> <span className="font-mono text-gray-900 dark:text-white">{fmtPrice(data.close, currency)}</span></div>
                </div>

                {/* 2. Strategy Volumes (ETH Only) & Mcap */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
                    <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
                        <span className="font-semibold">Market Cap:</span>
                        <span className="font-mono font-bold">
                            {currency === 'usd' ? fmtUSD(data.mcap,2) : `Ξ${fmtNum(data.mcap,2)}`}
                        </span>
                    </div>
                    {(data.strategyBuyVolume > 0 || data.strategySellVolume > 0) && (
                        <>
                            <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                                <span className="flex items-center gap-1 font-semibold">Strategy Buy:</span>
                                <span className="font-mono font-bold">Ξ{fmtEth(data.strategyBuyVolume,2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-orange-600 dark:text-orange-400">
                                <span className="flex items-center gap-1 font-semibold">Strategy Sell:</span>
                                <span className="font-mono font-bold">Ξ{fmtEth(data.strategySellVolume,2)}</span>
                            </div>
                        </>
                    )}
                </div>

                {/* 3. Burn (Tokens Only) */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center text-orange-500 dark:text-orange-500">
                        <span className="flex items-center gap-1 font-semibold"><Flame size={12} /> Burned:</span>
                        <span className="font-mono font-bold">{fmtNum(data.tokenBurn,2)} Tokens</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const StrategyChart: React.FC<StrategyChartProps> = ({ strategyAddress, className }) => {
    const [rawEvents, setRawEvents] = useState<RawEvent[]>([]);
    const [ohlcv, setOhlcv] = useState<OhlcvData[]>([]);
    const [burnStats, setBurnStats] = useState<BurnDataResponse | null>(null); // State pour les données de burn
    const [loading, setLoading] = useState<boolean>(true);
    const [currency, setCurrency] = useState<'quote' | 'usd'>('quote');

    // Fetch Data
    useEffect(() => {
        if (!strategyAddress) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                // Ajout du 3ème fetch pour le fichier _burn.json
                const [eventsRes, ohlcvRes, burnRes] = await Promise.all([
                    fetch(`https://tw-aggregator.wut-tw.workers.dev/details/${strategyAddress}.json`),
                    fetch(`https://tw-aggregator.wut-tw.workers.dev/details/${strategyAddress}_ohlcv.json`),
                    fetch(`https://tw-aggregator.wut-tw.workers.dev/details/${strategyAddress}_burn.json`)
                ]);

                const eventsData = eventsRes.ok ? await eventsRes.json() : {};
                const ohlcvData = ohlcvRes.ok ? await ohlcvRes.json() : [];
                const burnData = burnRes.ok ? await burnRes.json() : null;

                setRawEvents(eventsData.rawEvents || []);
                setOhlcv(ohlcvData || []);
                setBurnStats(burnData);

            } catch (error) {
                console.error("Failed to load chart data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [strategyAddress]);

    // Data Processing
    const chartData = useMemo(() => {
        if (!ohlcv.length) return [];

        const dataMap = new Map<string, ChartDataPoint>();
        const sortedOhlcv = [...ohlcv].sort((a, b) => a.timestamp - b.timestamp);

        sortedOhlcv.forEach((candle) => {
            const dateObj = new Date(candle.timestamp * 1000);
            const dateKey = dateObj.toISOString().split('T')[0];

            // OHLC depends on currency
            const target = currency === 'quote' ? candle.quote : candle.usd;
            const mcapVal = target.c * 1_000_000_000;

            // Récupération des données de burn précises depuis le JSON dédié
            const dailyBurn = burnStats?.daily?.[dateKey]?.burn || 0;

            dataMap.set(dateKey, {
                date: candle.timestamp * 1000,
                dateStr: dateKey,
                open: target.o,
                close: target.c,
                high: target.h,
                low: target.l,
                openClose: [Math.min(target.o, target.c), Math.max(target.o, target.c)],
                wick: [target.l, target.h],
                isUp: target.c >= target.o,
                strategyBuyVolume: 0,
                strategySellVolume: 0,
                mcap: mcapVal,
                tokenBurn: dailyBurn, // Utilisation directe de la donnée précise
            });
        });

        // Traitement uniquement des volumes BUY/SELL (le burn n'est plus calculé ici)
        rawEvents.forEach((event) => {
            const dateObj = new Date(event.time);
            const dateKey = dateObj.toISOString().split('T')[0];

            if (dataMap.has(dateKey)) {
                const point = dataMap.get(dateKey)!;
                if (event.type === 'BUY') {
                    point.strategyBuyVolume += event.price;
                } else if (event.type === 'SELL') {
                    point.strategySellVolume += event.price;
                }
            }
        });

        return Array.from(dataMap.values());
    }, [ohlcv, rawEvents, burnStats, currency]);

    // --- Calcul des Totaux pour les Cards ---
    const totals = useMemo(() => {
        const volumeTotal = ohlcv.reduce((acc, curr) => {
            const vol = currency === 'quote' ? curr.quote.v : curr.usd.v;
            return acc + vol;
        }, 0);

        // Utilisation du total précis fourni par l'API burn, sinon fallback sur la somme du tableau
        const burnTotal = burnStats?.totalBurn ?? chartData.reduce((acc, curr) => acc + curr.tokenBurn, 0);

        return { volume: volumeTotal, burn: burnTotal };
    }, [ohlcv, chartData, currency, burnStats]);


    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-indigo-500" /></div>;
    if (!chartData.length) return <div className="text-center p-20 text-gray-400 text-sm">No data available</div>;

    const commonYAxisProps = {
        width: 60,
        stroke: "#94a3b8",
        tick: { fontSize: 10 },
    };

    

    return (
        <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 ${className}`}>

            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6 gap-4">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                        Strategy Analysis
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Price, Volume & Burn Correlation</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Cards Container */}
                    <div className="flex gap-3">
                        {/* Card 1: Total Volume */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 border border-gray-100 dark:border-gray-700 px-3">
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                                <BarChart3 size={12} />
                                <span className="uppercase font-semibold tracking-wider">Vol ({currency === 'usd' ? 'USD' : 'ETH'})</span>
                            </div>
                            <div className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                                {currency === 'usd' ? fmtUSD(totals.volume) : `Ξ${fmtNum(totals.volume)}`}
                            </div>
                        </div>

                        {/* Card 2: Total Burn */}
                        <div className="bg-orange-50 dark:bg-orange-900/10 rounded-lg p-2 border border-orange-100 dark:border-orange-900/30 px-3">
                            <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 mb-0.5">
                                <Flame size={12} />
                                <span className="uppercase font-semibold tracking-wider">Total Burn</span>
                            </div>
                            <div className="text-sm font-mono font-bold text-orange-700 dark:text-orange-300">
                                {fmtNum(totals.burn)} <span className="text-[10px] opacity-70">TKN</span>
                            </div>
                        </div>
                    </div>

                    {/* Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 h-fit">
                        <button onClick={() => setCurrency('quote')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${currency === 'quote' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600' : 'text-gray-500'}`}>ETH</button>
                        <button onClick={() => setCurrency('usd')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${currency === 'usd' ? 'bg-white dark:bg-gray-700 shadow text-green-600' : 'text-gray-500'}`}>USD</button>
                    </div>
                </div>
            </div>

            {/* --- Chart 1: MASTER (Affiche la Tooltip) --- */}
            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} syncId="strategySync" margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
                        <XAxis dataKey="date" hide />
                        <YAxis {...commonYAxisProps} orientation="right" domain={['auto', 'auto']} tickFormatter={(val) => fmtNum(val)} />

                        {/* La SEULE tooltip visible */}
                        <Tooltip
                            content={<CustomTooltip currency={currency} />}
                            cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
                            isAnimationActive={false}
                        />

                        <Bar dataKey="wick" barSize={1}>
                            {chartData.map((entry, i) => <Cell key={`w-${i}`} fill={entry.isUp ? '#22c55e' : '#ef4444'} />)}
                        </Bar>
                        <Bar dataKey="openClose" barSize={8} radius={[1, 1, 1, 1]}>
                            {chartData.map((entry, i) => <Cell key={`b-${i}`} fill={entry.isUp ? '#22c55e' : '#ef4444'} />)}
                        </Bar>
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* --- Chart 2: SLAVE (Tooltip invisible mais active pour la synchro) --- */}
            <div className="h-[150px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} syncId="strategySync" margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
                        <XAxis dataKey="date" hide />
                        <YAxis yAxisId="mcap" {...commonYAxisProps} orientation="right" tickFormatter={(val) => fmtNum(val, 0)} />

                        {/* On rend la tooltip invisible ici */}
                        <Tooltip content={<div className="hidden" />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }} />

                        <Line yAxisId="mcap" type="monotone" dataKey="mcap" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        <Bar yAxisId="vol" dataKey="strategyBuyVolume" fill="#22c55e" barSize={6} radius={[2, 2, 0, 0]} opacity={0.8} />
                        <Bar yAxisId="vol" dataKey="strategySellVolume" fill="#f97316" barSize={6} radius={[2, 2, 0, 0]} opacity={0.8} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* --- Chart 3: BURN (Barres centrées) --- */}
            <div className="h-[100px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        syncId="strategySync"
                        margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
                        /* Supprime barCategoryGap si présent ou règle le à 0 pour un contrôle total */
                        barGap={0}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
                        <XAxis
                            dataKey="date"
                            scale="time"
                            type="number"
                            domain={['auto', 'auto']}
                            tickFormatter={(unix) => new Date(unix).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                            stroke="#94a3b8"
                            tick={{ fontSize: 10 }}
                            minTickGap={30}
                            /* Ajout important pour l'alignement */
                            padding={{ left: 10, right: 10 }}
                        />
                        <YAxis
                            {...commonYAxisProps}
                            orientation="right"
                            tickFormatter={(val) => fmtNum(val, 0)}
                        />

                        <Tooltip content={<div className="hidden" />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }} />

                        <Bar
                            dataKey="tokenBurn"
                            fill="#f97316"
                            /* barSize doit être identique ou proche des barres de volume du dessus */
                            barSize={8}
                            radius={[2, 2, 0, 0]}
                            /* Force le centrage sur le tick XAxis */
                            offset={-4} // La moitié du barSize pour reculer vers la droite si nécessaire
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};