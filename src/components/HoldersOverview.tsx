import React from 'react';
import { Users, Percent } from 'lucide-react';
import { fmtNum, fmtPercent } from "../utils/format";
interface HoldersOverviewProps {
    strategy: {
        stratHolders: number;
        nftHolders: number;
        stratColHolderRatio?: number;
        stratHoldersData?: {
            count: number;
            distribution: {
                top_10: string;    // % strings
                '11_30': string;
                '31_50': string;
                rest: string;
            };
        };
    };
}

export const HoldersOverview: React.FC<HoldersOverviewProps> = ({ strategy }) => {


    const distribution = strategy.stratHoldersData?.distribution || null;

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
                <Users size={20} className="text-blue-500" />
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Holders Overview</h3>
            </div>

            {/* Body */}
            <div className="p-6 grid grid-cols-1 gap-6">
                {/* Token Distribution */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
                    <h4 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                        Token Distribution
                    </h4>
                    {distribution ? (
                        <div className="space-y-3">
                            {Object.entries(distribution).map(([key, value], i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="text-xs font-mono text-gray-400 w-12">
                                        {key.replace('_', '-')}
                                    </span>
                                    <div className="flex-1">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="capitalize">
                                                {key.replace('_', '-')}
                                            </span>
                                            <span className="font-bold">
                                                {fmtPercent(value)}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className="bg-purple-500 h-full"
                                                style={{
                                                    width: `${Math.min(100, parseFloat(value))}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="text-sm text-gray-400">
                                Distribution data not available
                            </div>
                            <div className="text-xs text-gray-300 mt-1">
                                Holder breakdown could not be retrieved
                            </div>
                        </div>
                    )}
                </div>

                {/* Holders Analysis */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
                    <h4 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                        Holders Analysis
                    </h4>
                    <div className="flex items-center justify-around text-center mb-6">
                        <div>
                            <div className="text-2xl font-bold text-blue-600">{fmtNum(strategy.stratHolders, 2, "standard")}</div>
                            <div className="text-xs text-gray-400 uppercase font-bold">Token Holders</div>
                        </div>
                        <div className="text-gray-300"><Percent size={16} /></div>
                        <div>
                            <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{fmtNum(strategy.nftHolders, 2, "standard")}</div>
                            <div className="text-xs text-gray-400 uppercase font-bold">NFT Collection Holders</div>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Strategy / Collection Coverage</span>
                            <span className="font-bold">{strategy.stratColHolderRatio?.toFixed(2)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                            <div
                                className="bg-blue-500 h-full"
                                style={{ width: `${Math.min(100, strategy.stratColHolderRatio || 0)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
