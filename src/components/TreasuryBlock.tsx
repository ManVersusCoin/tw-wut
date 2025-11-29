import React from 'react';
import { Wallet, TrendingUp, Coins, Layers } from 'lucide-react';
import { fmtEth, fmtUSD } from "../utils/format";
// --- Types ---
export interface TreasuryStrategyData {
    // Valuation
    treasuryValueUsd?: number;
    navRatio?: number;

    // NFT Inventory
    inventoryCount?: number;
    nftFloorPriceEth?: number;
    
    // Liquid Balance
    currentBalanceEth?: number; // New field from your JSON

    // KPIs
    balanceKPIs?: {
        requiredToFloorEth: number;
        completionPercent: number;
    };
}

interface TreasuryBlockProps {
    strategy: TreasuryStrategyData;
    ethPrice?: number;
}


export const TreasuryBlock: React.FC<TreasuryBlockProps> = ({
    strategy,ethPrice
}) => {

    const completion = strategy.balanceKPIs?.completionPercent ?? 0;
    const missingEth = strategy.balanceKPIs?.requiredToFloorEth ?? 0;
    const isFunded = completion >= 100;

    // Calculate total ETH value of inventory for display
    const inventoryEthValue = (strategy.inventoryCount || 0) * (strategy.nftFloorPriceEth || 0);

    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-800 shadow-sm flex flex-col justify-between h-full">

            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-5 text-blue-800 dark:text-blue-300 font-bold">
                    <Wallet size={20} />
                    <span>Treasury & Valuation</span>
                </div>

                {/* Main KPIs: Value & NAV */}
                <div className="flex justify-between items-end mb-6 pb-4 border-b border-blue-200/60 dark:border-blue-800/60">
                    <div>
                        <div className="text-xs font-semibold text-blue-600/70 dark:text-blue-400 uppercase tracking-wider mb-1">Total Treasury</div>
                        <div className="text-3xl font-extrabold text-blue-900 dark:text-white">
                            {fmtUSD(strategy.treasuryValueUsd,2)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            ETH Price. {fmtUSD(ethPrice,0, "standard")}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-semibold text-blue-600/70 dark:text-blue-400 uppercase tracking-wider mb-1">NAV Ratio</div>
                        <div className={`text-2xl font-bold flex items-center justify-end gap-1 ${strategy.navRatio && strategy.navRatio < 1
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-blue-600 dark:text-blue-400"
                            }`}>
                            {strategy.navRatio?.toFixed(2)}x
                            <TrendingUp size={16} />
                        </div>
                    </div>
                </div>

                {/* Asset Breakdown Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Illiquid (NFTs) */}
                    <div className="bg-white/60 dark:bg-gray-800/40 p-3 rounded-xl border border-blue-100 dark:border-blue-800/50">
                        <div className="flex items-center gap-1.5 mb-2 text-gray-500 dark:text-gray-400">
                            <Layers size={14} />
                            <span className="text-xs font-bold uppercase">Inventory</span>
                        </div>
                        <div className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                            {strategy.inventoryCount} <span className="text-sm font-normal text-gray-500">NFTs</span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Est. {fmtEth(inventoryEthValue)}
                        </div>
                    </div>

                    {/* Liquid (ETH) */}
                    <div className="bg-white/60 dark:bg-gray-800/40 p-3 rounded-xl border border-blue-100 dark:border-blue-800/50">
                        <div className="flex items-center gap-1.5 mb-2 text-gray-500 dark:text-gray-400">
                            <Coins size={14} />
                            <span className="text-xs font-bold uppercase">Liquidity</span>
                        </div>
                        <div className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                            {fmtEth(strategy.currentBalanceEth)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Available Balance
                        </div>
                    </div>
                </div>
            </div>

            {/* Next Purchase Progress Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-blue-100 dark:border-blue-800 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Next Floor Purchase</span>
                    <span className={`text-xs font-bold ${isFunded ? 'text-green-600' : 'text-blue-600'}`}>
                        {completion.toFixed(0)}% Ready
                    </span>
                </div>

                {/* The Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden mb-2">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${isFunded ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                        style={{ width: `${Math.min(100, completion)}%` }}
                    />
                </div>

                {/* Status Text */}
                <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-400">
                        Floor Price: <strong>{fmtEth(strategy.nftFloorPriceEth)}</strong>
                    </span>
                    {isFunded ? (
                        <span className="text-green-600 font-medium bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">
                            Fully Funded
                        </span>
                    ) : (
                        <span className="text-orange-500 dark:text-orange-400 font-medium">
                            Missing: {missingEth.toFixed(3)} ETH
                        </span>
                    )}
                </div>
            </div>

        </div>
    );
};