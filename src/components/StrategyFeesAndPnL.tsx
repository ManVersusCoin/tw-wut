import React from 'react';
import { useMemo, useEffect, useState } from "react";
import { Coins,  Activity } from 'lucide-react';
import { fmtEth} from "../utils/format";
import { Trophy } from 'lucide-react';
// --- Types ---
export interface StrategyFeesAndPnLData {
    collection?: string;
    // Valuation
    feesStrat?: number;
    feesPnkstr?: number;

    // NFT Inventory
    feesRoyalties?: number;
    realizedPnLEth?: number;

    // Liquid Balance
    buyVolume?: number;
    saleVolume?: number;
    buyCount?: number;
    saleCount?: number;
    transactionHistory?: any[];
    // KPIs
    balanceKPIs?: {
        requiredToFloorEth: number;
        completionPercent: number;
    };
}

interface StrategyFeesAndPnLProps {
    strategy: StrategyFeesAndPnLData;
    tokenSymbol?: string;
    collectionImage?: string;
}
const PROXY = import.meta.env.VITE_TW_PROXY_URL || "";

export const StrategyFeesAndPnL: React.FC<StrategyFeesAndPnLProps> = ({
    strategy, tokenSymbol, collectionImage
}) => {


    const metrics = useMemo(() => {
        const res = {
            buyCount24h: 0,
            buyVol24h: 0,
            sellCount24h: 0,
            sellVol24h: 0,
            buyCount7d: 0,
            buyVol7d: 0,
            sellCount7d: 0,
            sellVol7d: 0,
            bestPnL: null as any
        };

        if (!strategy.transactionHistory) return res;

        const now = new Date();
        const oneDay = 86400000;
        const sevenDays = 7 * oneDay;
        const tokenProfits: Record<
            string,
            { tokenId: string; totalProfitEth: number; tradeCount: number }
        > = {};

        strategy.transactionHistory.forEach((t: any) => {
            // BUYS
            if (t.buyDate) {
                const diff = now.getTime() - t.buyDate.getTime();
                if (diff >= 0 && diff <= oneDay) {
                    res.buyCount24h++;
                    res.buyVol24h += t.buyPriceEth || 0;
                }
                if (diff >= 0 && diff <= sevenDays) {
                    res.buyCount7d++;
                    res.buyVol7d += t.buyPriceEth || 0;
                }
            }

            // SELLS
            if (t.status === "SOLD" && t.sellDate) {
                const diff = now.getTime() - t.sellDate.getTime();
                if (diff >= 0 && diff <= oneDay) {
                    res.sellCount24h++;
                    res.sellVol24h += t.sellPriceEth || 0;
                }
                if (diff >= 0 && diff <= sevenDays) {
                    res.sellCount7d++;
                    res.sellVol7d += t.sellPriceEth || 0;
                }

                // Aggregate profits per token
                if (!tokenProfits[t.tokenId]) {
                    tokenProfits[t.tokenId] = {
                        tokenId: t.tokenId,
                        totalProfitEth: 0,
                        tradeCount: 0
                    };
                }
                tokenProfits[t.tokenId].totalProfitEth += t.profitEth || 0;
                tokenProfits[t.tokenId].tradeCount++;
            }
        });

        // Find best performer
        res.bestPnL = Object.values(tokenProfits).reduce(
            (max, curr) => (curr.totalProfitEth > max.totalProfitEth ? curr : max),
            { tokenId: "", totalProfitEth: -Infinity, tradeCount: 0 }
        );

        if (res.bestPnL.totalProfitEth === -Infinity) res.bestPnL = null;

        return res;
    }, [strategy.transactionHistory]);

    const [bestNftImage, setBestNftImage] = useState<string | null | undefined>(
        undefined
    );
    
    useEffect(() => {
        if (!metrics.bestPnL?.tokenId || !strategy.collection) {
            setBestNftImage(undefined);
            return;
        }

        const url = `${PROXY}/api/os-nft/${strategy.collection}/${metrics.bestPnL.tokenId}`;

        fetch(url)
            .then((res) => res.json())
            .then((data) => setBestNftImage(data.image || data.image_url || null))
            .catch(() => setBestNftImage(null));
    }, [metrics.bestPnL?.tokenId, strategy.collection]);
    const pnl = strategy.realizedPnLEth ?? 0;

    return (
        
        < div className = "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm" >
            {/* Title */ }
        
                <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-start gap-2 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                            <Activity className="w-5 h-5 text-indigo-500" />
                            Fees & PnL
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">Lifetime collected fees from trading volume</p>
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
                                className="w-8 h-8 rounded object-cover"
                                />
                            )}
                        </div>
                    </div>

                </div>
                
                {/* Fees Section */ }
                < div className = "p-6 grid grid-cols-1 gap-6" >
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Coins size={14} className="text-gray-400" />
                            <span className="text-xs font-bold text-gray-500 uppercase">Lifetime Fees Generated</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-2 rounded border border-blue-100 dark:border-blue-900/30">
                                <div className="text-[10px] text-blue-600 dark:text-blue-400 mb-1">Strategy (8%)</div>
                                <div className="font-bold text-sm dark:text-gray-200">{fmtEth(strategy.feesStrat)}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700">
                                <div className="text-[10px] text-gray-500 mb-1">Platform (1%)</div>
                                <div className="font-bold text-sm text-gray-600 dark:text-gray-400">{fmtEth(strategy.feesPnkstr)}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700">
                                <div className="text-[10px] text-gray-500 mb-1">Royalties (1%)</div>
                                <div className="font-bold text-sm text-gray-600 dark:text-gray-400">{fmtEth(strategy.feesRoyalties)}</div>
                            </div>
                        </div>
                    </div>

            {/* P&L Section */ }
                <div className="flex flex-col gap-3">
                    <div className="text-xs text-gray-400 font-bold uppercase">
                        Trading Summary
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                        {/* BUYS */}
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-100 dark:border-green-900/30">
                            <div className="text-[10px] text-green-700 uppercase mb-1">Buys</div>
                            <div className="font-bold text-sm">
                                {fmtEth(strategy.buyVolume)}
                            </div>
                            <div className="text-[10px] text-gray-500">
                                {strategy.buyCount} tx
                            </div>
                        </div>

                        {/* SELLS */}
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-100 dark:border-red-900/30">
                            <div className="text-[10px] text-red-700 uppercase mb-1">Sells</div>
                            <div className="font-bold text-sm">
                                {fmtEth(strategy.saleVolume)}
                            </div>
                            <div className="text-[10px] text-gray-500">
                                {strategy.saleCount} tx
                            </div>
                        </div>

                        {/* PnL */}
                        <div
                            className={`p-3 rounded border ${pnl >= 0
                                    ? "bg-green-100/60 dark:bg-green-900/30 border-green-200 dark:border-green-800"
                                    : "bg-red-100/60 dark:bg-red-900/30 border-red-200 dark:border-red-800"
                                }`}
                        >
                            <div className="text-[10px] uppercase mb-1 text-gray-600 dark:text-gray-400">
                                Realized PnL
                            </div>
                            <div
                                className={`font-bold text-sm ${pnl >= 0 ? "text-green-700" : "text-red-700"
                                    }`}
                            >
                                {fmtEth(pnl)}
                            </div>
                        </div>
                    </div>

                    {/* Best NFT stays secondary */}
                    {metrics.bestPnL && metrics.bestPnL.tradeCount > 0 && (
                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <Trophy size={10} /> Best NFT
                            </span>

                            {bestNftImage && (
                                <img
                                    src={bestNftImage}
                                    className="w-10 h-10 rounded border border-gray-200"
                                />
                            )}

                            <div className="text-right">
                                <div className="text-sm font-bold text-green-600">
                                    +{metrics.bestPnL.totalProfitEth.toFixed(2)}Ξ
                                </div>
                                <div className="text-[10px] text-gray-400">
                                    #{metrics.bestPnL.tokenId}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div >
        </div >
    );
};