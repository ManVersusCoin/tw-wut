import React, { useMemo, useState } from 'react';
import {
    ArrowUpRight, TrendingUp,
    ShoppingCart, Zap, X, Activity, Flame, AlertCircle,
} from 'lucide-react';
import { fmtEth, fmtUSD, fmtToken } from "../utils/format";

// --- Types & Interfaces ---
interface Listing {
    tokenId: string | number;
    price: number;
    source: 'strategy' | 'opensea' | 'Cryptopunks';
}

interface PoolDataExt {
    base_token_price_usd: string;
    quote_token_price_usd: string;
    reserve_in_usd: string;
    fdv_usd: string;
}

interface StepDetail {
    stepId: number;
    rawIn: number;
    fee8: number;
    fee1P: number;
    fee1R: number;
    tokensBought: number;
    priceAfterUsd: number;
    marketCapUsd: number;
}

interface SimulationResult {
    pctIncrease: number;
    targetFloor: number;

    // Global Cost
    totalEthCost: number;
    totalNftCount: number;

    // Breakdown
    mpCount: number;
    mpVol: number;
    stratCount: number;
    stratVol: number;

    // Results
    tokensBurned: number;
    totalFeesEth: number;
    totalFee8: number; // For Re-buy

    // Market Data
    priceImpact: number;
    finalFdv: number;
    finalPriceUsd: number;

    // Fee Re-buy Data
    rebuyCount: number;
    rebuyCost: number;
    rebuyLeftover: number;

    // Steps for Modal
    steps: StepDetail[];

    // Meta
    isMaxStrategyReached: boolean;
}

interface FloorImpactTableProps {
    listings: Listing[];
    poolData: PoolDataExt;
    tokenSymbol?: string;
    collectionImage?: string; 
}

// --- Helper Functions ---
const safeFloat = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleanStr = val.toString().replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) ? 0 : parsed;
};

// --- Modal Component ---
const DetailsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    data: SimulationResult | null;
    tokenSymbol: string;
    
}> = ({ isOpen, onClose, data, tokenSymbol }) => {
    if (!isOpen || !data) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">

                {/* Modal Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Activity className="text-indigo-500" />
                            Simulation Details
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Breakdown for +{data.pctIncrease}% Floor Target ({fmtEth(data.targetFloor)} ETH)
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="overflow-y-auto p-6 space-y-6 custom-scrollbar">

                    {data.isMaxStrategyReached && (
                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-bold text-orange-800 dark:text-orange-200">Max Strategy Inventory Reached</h4>
                                <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                                    This simulation step consumes all available Strategy NFTs. No further strategy volume can be generated beyond this point.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* 1. Re-buy Simulation Block */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300 mb-3 flex items-center gap-2">
                            <ShoppingCart size={14} /> Marketplace Re-buy Simulation
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                                <div className="text-[10px] text-gray-400 uppercase font-bold">Strategy Fees (8%)</div>
                                <div className="text-lg font-bold text-gray-900 dark:text-white">{fmtEth(data.totalFee8)} ETH</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                                <div className="text-[10px] text-gray-400 uppercase font-bold">Extra NFTs Swept</div>
                                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">+{data.rebuyCount} NFTs</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                                <div className="text-[10px] text-gray-400 uppercase font-bold">Unused Fees</div>
                                <div className="text-lg font-bold text-gray-500">{fmtEth(data.rebuyLeftover)} ETH</div>
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-3 italic">
                            * The accumulated 8% strategy fees were used to simulate buying remaining Marketplace listings starting from the new floor price.
                        </p>
                    </div>

                    {/* 2. Swap Steps */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
                            <Flame size={14} /> Swap & Burn Execution
                        </h4>
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 dark:bg-gray-800 p-3 flex text-[9px] uppercase text-gray-500 font-bold tracking-wider">
                                <div className="w-[10%]">Step</div>
                                <div className="w-[20%]">In (ETH)</div>
                                <div className="w-[25%] text-center">Fees (8/1/1%)</div>
                                <div className="w-[25%] text-right">Burn ({tokenSymbol})</div>
                                <div className="w-[20%] text-right">Price ($)</div>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar bg-white dark:bg-gray-900">
                                {data.steps.map((step) => (
                                    <div key={step.stepId} className="flex p-3 border-b border-gray-100 dark:border-gray-800 text-xs hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <div className="w-[10%] font-bold text-gray-400">#{step.stepId}</div>
                                        <div className="w-[20%] font-medium">{fmtEth(step.rawIn)}</div>
                                        <div className="w-[25%] flex justify-center gap-1 text-[10px] text-gray-500">
                                            <span className="text-indigo-500 font-bold">{step.fee8.toFixed(3)}</span>
                                            <span className="opacity-50">/</span>
                                            <span>{step.fee1P.toFixed(3)}</span>
                                            <span className="opacity-50">/</span>
                                            <span>{step.fee1R.toFixed(3)}</span>
                                        </div>
                                        <div className="w-[25%] text-right font-mono text-orange-600 dark:text-orange-400 font-bold">
                                            {fmtToken(step.tokensBought)}
                                        </div>
                                        <div className="w-[20%] text-right font-medium">
                                            {fmtUSD(step.priceAfterUsd, 4)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- Main Component ---
export const FloorImpactTable: React.FC<FloorImpactTableProps> = ({
    listings = [],
    poolData,
    tokenSymbol = "TOKEN",
    collectionImage = ""
}) => {
    const [selectedSimulation, setSelectedSimulation] = useState<SimulationResult | null>(null);

    // Sort listings once
    const sortedListings = useMemo(() => [...listings].sort((a, b) => a.price - b.price), [listings]);
    const currentFloor = sortedListings.length > 0 ? sortedListings[0].price : 0;

    // Calculate total Strategy Inventory
    const totalStrategyListings = useMemo(() =>
        listings.filter(l => l.source !== 'opensea' && l.source !== 'Cryptopunks').length
        , [listings]);

    const tableRows = useMemo(() => {
        if (!poolData || currentFloor === 0) return [];

        const results: SimulationResult[] = [];
        const percentages = Array.from({ length: 20 }, (_, i) => (i + 1) * 10); // 10% to 200%

        for (const pct of percentages) {
            const targetPrice = currentFloor * (1 + pct / 100);

            // --- 1. Selection Phase ---
            let mpCount = 0;
            let mpVol = 0;
            let stratCount = 0;
            let stratVol = 0;
            let lastIndexProcessed = -1;

            for (let i = 0; i < sortedListings.length; i++) {
                const listing = sortedListings[i];
                if (listing.price <= targetPrice) {
                    if (listing.source === 'opensea' || listing.source === 'Cryptopunks') {
                        mpCount++;
                        mpVol += listing.price;
                    } else {
                        stratCount++;
                        stratVol += listing.price;
                    }
                    lastIndexProcessed = i;
                } else {
                    break;
                }
            }

            // --- 2. AMM Swap Phase (Only Strategy Volume) ---
            const liquidityUsd = safeFloat(poolData.reserve_in_usd);
            const ethPriceUsd = safeFloat(poolData.quote_token_price_usd) || 3000;
            const initialPriceUsd = safeFloat(poolData.base_token_price_usd);
            const initialFdv = safeFloat(poolData.fdv_usd);

            let reserveEth = (liquidityUsd / 2) / ethPriceUsd;
            let reserveToken = (liquidityUsd / 2) / initialPriceUsd;

            let ethToSwap = stratVol;
            let totalBurned = 0;

            // Fee accumulators
            let totalFee8 = 0;
            let totalFee1P = 0;
            let totalFee1R = 0;

            const steps: StepDetail[] = [];
            const CHUNK_SIZE = 1.0;
            let stepCounter = 1;

            while (ethToSwap > 0.000001) {
                const amountInRaw = Math.min(ethToSwap, CHUNK_SIZE);

                // Fees
                const fee8 = amountInRaw * 0.08;
                const fee1P = amountInRaw * 0.01;
                const fee1R = amountInRaw * 0.01;

                totalFee8 += fee8;
                totalFee1P += fee1P;
                totalFee1R += fee1R;

                // Net into Pool (90%)
                const amountInNet = amountInRaw * 0.90;

                // Uniswap Formula
                const amountOut = (amountInNet * reserveToken) / (reserveEth + amountInNet);

                reserveEth += amountInNet;
                reserveToken -= amountOut;
                totalBurned += amountOut;
                ethToSwap -= amountInRaw;

                const currentPriceEth = reserveEth / reserveToken;
                const currentPriceUsd = currentPriceEth * ethPriceUsd;

                steps.push({
                    stepId: stepCounter++,
                    rawIn: amountInRaw,
                    fee8,
                    fee1P,
                    fee1R,
                    tokensBought: amountOut,
                    priceAfterUsd: currentPriceUsd,
                    marketCapUsd: initialFdv * (currentPriceUsd / initialPriceUsd)
                });
            }

            const currentPriceEth = reserveEth / reserveToken;
            const currentPriceUsd = currentPriceEth * ethPriceUsd;

            // --- 3. Fee Re-buy Logic ---
            let rebuyEth = totalFee8;
            let rebuyCount = 0;
            let rebuyCost = 0;

            for (let i = lastIndexProcessed + 1; i < sortedListings.length; i++) {
                const listing = sortedListings[i];
                if (listing.source === 'opensea' || listing.source === 'Cryptopunks') {
                    if (rebuyEth >= listing.price) {
                        rebuyEth -= listing.price;
                        rebuyCost += listing.price;
                        rebuyCount++;
                    } else {
                        break;
                    }
                }
            }

            const isMaxReached = stratCount >= totalStrategyListings;

            results.push({
                pctIncrease: pct,
                targetFloor: targetPrice,

                totalEthCost: mpVol + stratVol,
                totalNftCount: mpCount + stratCount,

                mpCount,
                mpVol,
                stratCount,
                stratVol,

                tokensBurned: totalBurned,
                totalFeesEth: totalFee8 + totalFee1P + totalFee1R,
                totalFee8,

                priceImpact: ((currentPriceUsd / initialPriceUsd) - 1) * 100,
                finalFdv: initialFdv * (currentPriceUsd / initialPriceUsd),
                finalPriceUsd: currentPriceUsd,

                rebuyCount,
                rebuyCost,
                rebuyLeftover: rebuyEth,
                steps,
                isMaxStrategyReached: isMaxReached
            });

            // STOP Condition
            if (isMaxReached) {
                break;
            }
        }

        return results;

    }, [sortedListings, currentFloor, poolData, totalStrategyListings]);

    if (!poolData || listings.length === 0) {
        return <div className="p-8 text-center text-gray-400 animate-pulse">Loading simulation data...</div>;
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">

            {/* Header */}
            <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                        Floor Impact & Strategy Analysis
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Simulation stops when all Strategy NFTs ({totalStrategyListings}) are consumed.
                    </p>
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

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800 text-[9px] uppercase tracking-wider text-gray-500 font-bold border-b border-gray-200 dark:border-gray-700">
                            <th className="px-4 py-3 whitespace-nowrap">Target Floor</th>
                            <th className="px-4 py-3 whitespace-nowrap">Total ETH Cost</th>
                            <th className="px-4 py-3 whitespace-nowrap text-right text-indigo-600 dark:text-indigo-400">Strategy Swept</th>
                            <th className="px-4 py-3 whitespace-nowrap text-right text-orange-600 dark:text-orange-400">Total Burned</th>
                            <th className="px-4 py-3 whitespace-nowrap text-right">Price Impact</th>
                            <th className="px-4 py-3 whitespace-nowrap text-right">Final FDV</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {tableRows.map((row) => (
                            <tr
                                key={row.pctIncrease}
                                className={`group transition-colors ${row.isMaxStrategyReached
                                        ? 'bg-orange-50/50 dark:bg-orange-900/10 hover:bg-orange-100/50 dark:hover:bg-orange-900/20'
                                        : 'hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10'
                                    }`}
                            >
                                {/* 1. Floor Target */}
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded-md text-xs font-bold w-12 text-center ${row.isMaxStrategyReached
                                                ? 'bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                            }`}>
                                            +{row.pctIncrease}%
                                        </span>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-900 dark:text-white">{fmtEth(row.targetFloor,3)} ETH</span>
                                        </div>
                                    </div>
                                </td>

                                {/* 2. ETH Cost (Detailed) */}
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm font-bold text-gray-900 dark:text-white">{fmtEth(row.totalEthCost)} ETH</div>
                                    <div className="flex flex-col gap-0.5 mt-1">
                                        <div className="text-[9px] text-gray-400 flex items-center gap-1">
                                            <ShoppingCart size={10} />
                                            <span>{fmtEth(row.mpVol)} ({row.mpCount} MP)</span>
                                        </div>
                                        <div className="text-[9px] text-indigo-400 flex items-center gap-1">
                                            <Zap size={10} />
                                            <span>{fmtEth(row.stratVol)} ({row.stratCount} Strat)</span>
                                        </div>
                                    </div>
                                </td>

                                {/* 3. Strategy Only */}
                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                    <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{row.stratCount} NFTs</div>
                                    <div className="text-[10px] text-gray-400">Cost: {fmtEth(row.stratVol)} ETH</div>
                                    {row.isMaxStrategyReached && (
                                        <div className="text-[8px] font-bold text-orange-500 uppercase tracking-wide mt-1">Max Supply</div>
                                    )}
                                </td>

                                {/* 4. Burned (Clickable) */}
                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                    <button
                                        onClick={() => setSelectedSimulation(row)}
                                        className="text-right hover:scale-105 transition-transform cursor-pointer focus:outline-none"
                                    >
                                        <div className="text-sm font-bold text-orange-600 dark:text-orange-400 underline decoration-dotted decoration-orange-300">
                                            {fmtToken(row.tokensBurned)}
                                        </div>
                                        <div className="text-[9px] text-gray-400 flex justify-end items-center gap-1 mt-0.5">
                                            <span>Fees: {fmtEth(row.totalFeesEth)}</span>
                                            <Activity size={10} />
                                        </div>
                                    </button>
                                </td>

                                {/* 5. Price Impact */}
                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                    <div className="flex items-center justify-end gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                                        <ArrowUpRight size={14} />
                                        {row.priceImpact.toFixed(2)}%
                                    </div>
                                    <div className="text-[10px] text-gray-400">{fmtUSD(row.finalPriceUsd, 5)}</div>
                                </td>

                                {/* 6. FDV */}
                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                    <div className="text-sm font-bold text-gray-900 dark:text-white">{fmtUSD(row.finalFdv, 1)}</div>
                                    {row.rebuyCount > 0 && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 mt-1">
                                            +{row.rebuyCount} Re-buy
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            <DetailsModal
                isOpen={!!selectedSimulation}
                onClose={() => setSelectedSimulation(null)}
                data={selectedSimulation}
                tokenSymbol={tokenSymbol}
            />

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1;
                    border-radius: 4px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #334155;
                }
            `}</style>
        </div>
    );
};