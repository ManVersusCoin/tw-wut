import React, { useMemo, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Line
} from 'recharts';
import { ArrowUp, Layers, Flame, Crown, Zap } from 'lucide-react';

interface Listing {
    tokenId: string | number;
    price: number;
    source: 'strategy' | 'opensea' | 'Cryptopunks';
}

interface MarketDepthKPIs {
    localFloor: number;
    osFloor: number;
    spreadPercent: number;
    wallCount: number;
    wallVolumeEth: number;
    isLeading: boolean;
    dominanceCount: number;
    dominanceVolumeEth: number;
    tokensBurned: number;
    priceImpactPercent: number;
}

interface MarketVisualizerProps {
    market_depth_data: Listing[];
    marketDepthKPIs: MarketDepthKPIs;
    tokenPriceUsd?: number;
}

export const MarketDepthVisualizer: React.FC<MarketVisualizerProps> = ({
    market_depth_data = [],
    marketDepthKPIs: kpis,
    tokenPriceUsd = 0
}) => {
    const [stepPercent, setStepPercent] = useState<number>(5);

    const listings = useMemo(() => {
        // Defensive: normalize price formats
        return (market_depth_data || [])
            .map(l => ({
                ...l,
                price: typeof l.price === 'string' ? parseFloat(l.price) : l.price
            }))
            .filter(l => typeof l.price === 'number' && !isNaN(l.price));
    }, [market_depth_data]);

    const chartData = useMemo(() => {
        if (!listings.length) return [];

        const prices = listings.map(l => l.price);
        let minPrice = Math.min(...prices);
        let maxPrice = Math.max(...prices);

        if (minPrice === maxPrice) {
            minPrice *= 0.99;
            maxPrice *= 1.01;
        }

        const displayMin = Math.min(minPrice, kpis?.osFloor ?? minPrice);

        const floorPrice = kpis?.localFloor || displayMin;
        const priceLimit = floorPrice * 6; // La limite est 6 fois le floor
        const osPricesUnderLimit = listings
            .filter(l => l.source !== 'strategy' && l.price < priceLimit)
            .map(l => l.price);

        let calculatedMax = maxPrice;
        if (osPricesUnderLimit.length > 0) {
            calculatedMax = Math.max(calculatedMax, ...osPricesUnderLimit);
        }

        const displayMax = Math.max(kpis?.localFloor ?? calculatedMax, Math.min(priceLimit, calculatedMax));
        //const displayMax = Math.max(maxPrice, kpis?.localFloor ?? maxPrice);

        const buckets: Array<{
            label: string;
            start: number;
            end: number;
            Strategy: number;
            MarketPlace: number;
            BucketVolumeEth: number;
        }> = [];

        let current = displayMin;
        const maxIterations = 1000;
        let iter = 0;

        while (current < displayMax && iter < maxIterations) {
            iter++;
            let next = current * (1 + stepPercent / 100);

            if (next <= current || !isFinite(next)) {
                next = current + (displayMax - displayMin) / 1000 || current + 1e-6;
            }

            const inRange = listings.filter(l => l.price >= current && l.price < next);
            const strategyCount = inRange.filter(l => l.source === 'strategy').length;
            const osCount = inRange.filter(l => l.source !== 'strategy').length;
            const bucketVolumeEth = inRange.reduce((sum, l) => sum + l.price, 0); 
            const label = `${current.toFixed(3)}–${next.toFixed(3)}`;

            if (strategyCount > 0 || osCount > 0) {
                buckets.push({
                    label,
                    start: current,
                    end: next,
                    Strategy: strategyCount,
                    MarketPlace: osCount,
                    BucketVolumeEth: bucketVolumeEth
                });
            }

            current = next;
        }

        if (buckets.length === 0) {
            buckets.push({
                label: `${displayMin.toFixed(3)}–${displayMax.toFixed(3)}`,
                start: displayMin,
                end: displayMax,
                Strategy: listings.filter(l => l.source === 'strategy').length,
                MarketPlace: listings.filter(l => l.source !== 'strategy').length,
                BucketVolumeEth: listings.reduce((sum, l) => sum + l.price, 0)
            });
        }
        // Cumulative Volume Calculation
        let cumulativeVolume = 0;
        const finalChartData = buckets.map(b => {
            cumulativeVolume += b.BucketVolumeEth;
            return {
                ...b,
                CumulativeVolume: cumulativeVolume // Key for the line
            };
        });

        return finalChartData;
    }, [listings, stepPercent, kpis]);

    const floorBucketLabel = useMemo(() => {
        if (!kpis || !chartData.length) return null;
        const found = chartData.find(
            b => kpis.localFloor >= b.start && kpis.localFloor < b.end
        );
        return found ? found.label : null;
    }, [kpis, chartData]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            
            

            const bucketEntry = payload[0]?.payload; // bucket correspondant
            if (!bucketEntry) return null;

            // Cumulatif jusqu'à ce bucket
            const index = chartData.findIndex(b => b.label === bucketEntry.label);
            const cumulativeStrategy = chartData
                .slice(0, index + 1)
                .reduce((sum, b) => sum + (b.Strategy || 0), 0);
            const cumulativeOpenSea = chartData
                .slice(0, index + 1)
                .reduce((sum, b) => sum + (b.MarketPlace || 0), 0);
            const cumulativeTotal = cumulativeStrategy + cumulativeOpenSea;

            // Cumulative Volume
            const cumulativeVolumeEntry = payload.find((p: any) => p.dataKey === 'CumulativeVolume');

            return (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg shadow-xl text-sm">
                    <div className="font-bold mb-2">Range: {label} ETH</div>
                    

                    {/* Individual bucket listings */}
                    {payload.filter((p: any) => p.dataKey !== 'CumulativeVolume').map((entry: any) => (
                        <div key={entry.name} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span>{entry.name}: <strong>{entry.value}</strong> listings</span>
                        </div>
                    ))}

                    {/* Cumulative listings */}
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-sm space-y-1">
                        <div className="text-xs text-gray-500 mb-1">Cumulative Listings:</div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span>Strategy NFTs: <strong>{cumulativeStrategy}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span>Listed NFTs: <strong>{cumulativeOpenSea}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 font-semibold">
                            <div className="w-3 h-3 rounded-full bg-purple-500" />
                            <span>Total NFTs: {cumulativeTotal}</span>
                        </div>
                    </div>

                    {cumulativeVolumeEntry && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 font-semibold text-purple-500">
                            Sweep Vol.: {cumulativeVolumeEntry.value.toFixed(3)} ETH
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };


    if (!kpis || listings.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500">
                No market data available.
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">

            {/* Header */}
            <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-start gap-2">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Layers className="w-5 h-5 text-indigo-500" />
                        Market Depth
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Strategy vs Listed</p>
                </div>

                <select
                    value={stepPercent}
                    onChange={(e) => setStepPercent(Number(e.target.value))}
                    className="text-sm bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700"
                >
                    <option value={2}>2% (precise)</option>
                    <option value={5}>5% (standard)</option>
                    <option value={10}>10% (wide)</option>
                    <option value={20}>20% (macro)</option>
                </select>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 p-6 gap-6">

                {kpis.isLeading ? (
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-500">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">Dominance</span>
                            <Crown className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="text-2xl font-bold">{kpis.dominanceCount}</div>
                        <div className="text-xs text-emerald-600">listings below floor</div>
                        <div className="text-xs text-gray-600 mt-1">Volume: {kpis.dominanceVolumeEth.toFixed(3)} ETH</div>
                    </div>
                ) : (
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold uppercase text-blue-700 dark:text-blue-300">Wall to Break</span>
                            <ArrowUp className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="text-2xl font-bold">{kpis.wallCount}</div>
                        <div className="text-xs text-blue-600">Listings under Strategy</div>
                        <div className="text-xs text-gray-600 mt-1">Volume: {kpis.wallVolumeEth.toFixed(3)} ETH</div>
                    </div>
                )}

                <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-bold uppercase text-gray-500">Spread</div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className={`text-2xl font-bold ${kpis.spreadPercent > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {Math.abs(kpis.spreadPercent).toFixed(1)}%
                        </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 flex justify-between">
                        <span>Strategy: <strong>{kpis?.localFloor?.toFixed(3)}</strong></span>
                        <span>MarketPlace: <strong>{kpis?.osFloor?.toFixed(3)}</strong></span>
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/10 dark:to-gray-800 border border-orange-100 dark:border-orange-900/30">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold uppercase text-orange-600 dark:text-orange-400">Burn Pressure</span>
                        <Flame className="w-5 h-5 text-orange-500" />
                    </div>
                    {kpis.dominanceVolumeEth > 0 ? (
                        <>
                            <div className="text-2xl font-bold">{Math.floor(kpis.tokensBurned).toLocaleString()}</div>
                            <div className="text-xs text-orange-600">potential tokens burned</div>
                            <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                <Zap className="w-3 h-3" /> {kpis.priceImpactPercent.toFixed(2)}% impact
                            </div>
                        </>
                    ) : (
                        <div className="text-sm text-gray-500 italic">No buy pressure detected</div>
                    )}
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-bold uppercase text-gray-500">Strategy Inventory</div>
                    <div className="text-2xl font-bold mt-2">
                        {listings.filter(l => l.source === 'strategy').length}
                    </div>
                    <div className="text-xs text-gray-500">active listings</div>
                    {tokenPriceUsd > 0 && (
                        <div className="text-xs text-gray-500 mt-1">Token Price: <strong>${tokenPriceUsd.toFixed(4)}</strong></div>
                    )}
                </div>

            </div>

            {/* Chart */}
            <div className="h-96 mt-8 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl p-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.3} />
                        <XAxis dataKey="label" label={{ value: 'Price Range (ETH)', position: 'insideBottom', offset: -10 }} tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        {/* Right Y-Axis (Cumulative Volume) */}
                        <YAxis
                            yAxisId="volume"
                            orientation="right"
                            stroke="#8884d8" // Color to match the line
                            tick={{ fontSize: 12, fill: '#8884d8' }}
                            tickFormatter={(value: number) => `${value.toFixed(1)}`}
                            label={{ value: 'Vol. (ETH)', angle: 90, position: 'insideRight', offset: 10, fill: '#8884d8' }}
                        />
                        {/* Right Y-Axis (Cumulative Volume) */}
                        <YAxis
                            yAxisId="volume"
                            orientation="right"
                            stroke="#8884d8" // Color to match the line
                            tick={{ fontSize: 12, fill: '#8884d8' }}
                            tickFormatter={(value: number) => `${value.toFixed(1)}`}
                            label={{ value: 'Vol. (ETH)', angle: 90, position: 'insideRight', offset: 10, fill: '#8884d8' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="top" height={36} />
                        <Bar dataKey="MarketPlace" stackId="a" fill="#3B82F6" name="MarketPlace" />
                        <Bar dataKey="Strategy" stackId="a" fill="#10B981" name="Strategy" />
                        <Line
                            type="monotone"
                            dataKey="CumulativeVolume"
                            stroke="#8884d8"
                            strokeWidth={2}
                            dot={false}
                            yAxisId="volume"
                            name="Vol. (ETH)"
                            isAnimationActive={false} // Optional: disable animation for this line
                        />
                        {floorBucketLabel && (
                            <ReferenceLine
                                x={floorBucketLabel}
                                stroke="#EF4444"
                                strokeDasharray="5 5"
                                label={{ value: 'Strategy Floor', position: 'top', fill: '#EF4444', fontSize: 11 }}
                            />
                        )}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};