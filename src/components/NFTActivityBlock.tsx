// src/components/NFTActivityBlock.tsx

import React from 'react';
import { Activity,  Zap, Globe } from 'lucide-react';
import { fmtEth } from "../utils/format";
// --- Types ---
// Define the expected structure for the strategy prop
// Adjust fields based on your actual data model
export interface StrategyActivityData {

    // Strategy NFT Flow (24h)
    stratBuy24h?: number;
    stratBuy24hVol?: number;
    stratSell24h?: number;
    stratSell24hVol?: number;

    // Strategy NFT Flow (7d)
    stratBuy7d?: number;
    stratBuy7dVol?: number;
    stratSell7d?: number;
    stratSell7dVol?: number;

    // OpenSea Activity (24h & 7d)
    osTrade24h?: number;
    osVolume24h?: number;
    osTrade7d?: number;
    osVolume7d?: number;
}

interface ActivityBlockProps {
    strategy: StrategyActivityData;
}


export const NFTActivityBlock: React.FC<ActivityBlockProps> = ({
    strategy,
}) => {
    // Helper to calculate total strategy volume/trades
    const stratVol24h = (strategy.stratBuy24hVol || 0) + (strategy.stratSell24hVol || 0);
    const stratTrades24h = (strategy.stratBuy24h || 0) + (strategy.stratSell24h || 0);

    const stratVol7d = (strategy.stratBuy7dVol || 0) + (strategy.stratSell7dVol || 0);
    const stratTrades7d = (strategy.stratBuy7d || 0) + (strategy.stratSell7d || 0);
    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">

            {/* Header Section */}
            <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Activity className="text-blue-500" size={20} />
                    Market Activity & Flows
                </h3>
            </div>

            <div className="p-6 grid grid-cols-1 gap-4">

                {/* LEFT COLUMN: STRATEGY PERFORMANCE */}
                <div className="space-y-6">
                    <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-2 mb-4">
                        <Zap size={16} className="text-amber-500" /> Strategy NFT Activity
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        {/* 24h Flow */}
                        <div className="bg-gray-50 dark:bg-gray-800/40 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-semibold text-gray-500 uppercase">24h Strategy Flow</span>
                                
                            </div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {fmtEth(stratVol24h)}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Volume Traded</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-bold text-gray-700 dark:text-gray-300">
                                        {stratTrades24h}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Trades</div>
                                </div>
                            </div>
                            {/* Optional Breakdown Line */}
                            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between text-xs text-gray-400">
                                <span>Buys: {strategy.stratBuy24h} ({fmtEth(strategy.stratBuy24hVol)})</span>
                                <span>Sells: {strategy.stratSell24h} ({fmtEth(strategy.stratSell24hVol)})</span>
                            </div>
                        </div>
                        {/* 7d Flow - UPDATED DESIGN */}
                        <div className="bg-gray-50 dark:bg-gray-800/40 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-semibold text-gray-500 uppercase">7d Strategy Flow</span>
                                
                            </div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {fmtEth(stratVol7d)}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Volume Traded</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                                        {stratTrades7d}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Trades</div>
                                </div>
                            </div>
                            {/* Optional Breakdown Line */}
                            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between text-xs text-gray-400">
                                <span>Buys: {strategy.stratBuy7d} ({fmtEth(strategy.stratBuy7dVol)})</span>
                                <span>Sells: {strategy.stratSell7d} ({fmtEth(strategy.stratSell7dVol)})</span>
                            </div>
                        </div>
                    </div> 
                    <div className="space-y-6 pt-6 lg:pt-0">
                        <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-2 mb-4">
                            <Globe size={16} className="text-blue-500" /> OpenSea Collection Activity
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            {/* 24h OS Activity */}
                            <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-lg p-4 border border-blue-100 dark:border-blue-900/30">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase">24h Market Volume</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="text-3xl font-bold text-gray-900 dark:text-white">{fmtEth(strategy.osVolume24h)}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Volume Traded</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-bold text-gray-700 dark:text-gray-300">{strategy.osTrade24h ?? 0}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Trades</div>
                                    </div>
                                </div>

                                {/* Strategy Share Calc */}
                                {(strategy.osVolume24h && strategy.osVolume24h > 0) && (
                                    <div className="mt-4 pt-3 border-t border-blue-100 dark:border-blue-800/50">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-blue-600 dark:text-blue-400">Strategy Market Share (Vol)</span>
                                            <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                                                {(((strategy.stratBuy24hVol || 0) + (strategy.stratSell24hVol || 0)) / strategy.osVolume24h * 100).toFixed(2)}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-blue-200 dark:bg-blue-900/50 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                            <div
                                                className="bg-blue-600 h-full rounded-full"
                                                style={{ width: `${Math.min(100, (((strategy.stratBuy24hVol || 0) + (strategy.stratSell24hVol || 0)) / strategy.osVolume24h * 100))}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 7d OS Activity */}
                            <div className="bg-gray-50 dark:bg-gray-800/40 rounded-lg p-4 border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-full">
                                {/* Top content: title + main stats */}
                                <div className="mb-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-semibold text-gray-500 uppercase">7d Market Volume</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{fmtEth(strategy.osVolume7d)}</div>
                                            <div className="text-xs text-gray-500 mt-1">Total Volume Traded</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-gray-600 dark:text-gray-400">{strategy.osTrade7d ?? 0}</div>
                                            <div className="text-xs text-gray-500 mt-1">Trades</div>
                                        </div>
                                    </div>
                                </div>
                                {(strategy.osVolume7d && strategy.osVolume7d > 0) && (
                                    <div className="mt-4 pt-3 border-t border-blue-100 dark:border-blue-800/50">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-blue-600 dark:text-blue-400">Strategy Market Share (Vol)</span>
                                            <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                                                {(((strategy.stratBuy7dVol || 0) + (strategy.stratSell7dVol || 0)) / strategy.osVolume7d * 100).toFixed(2)}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-blue-200 dark:bg-blue-900/50 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                            <div
                                                className="bg-blue-600 h-full rounded-full"
                                                style={{ width: `${Math.min(100, (((strategy.stratBuy7dVol || 0) + (strategy.stratSell7dVol || 0)) / strategy.osVolume7d * 100))}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                                
                            </div>
                            
                        </div>
                        
                    </div>

                    
                </div>

                {/* RIGHT COLUMN: OPENSEA CONTEXT */}
                
            </div>
        </div>
    );
};