import { Info, X } from "lucide-react";
export function InfoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                        <Info size={24} className="text-blue-600" />
                        About this Dashboard
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto flex-1 p-6 custom-scrollbar text-gray-700 dark:text-gray-300 space-y-4 text-sm leading-relaxed">
                    <p>
                        This dashboard provides monitoring and analytics for TokenWorks strategies.
                        Data is aggregated from multiple on-chain and off-chain sources to offer a complete
                        overview of performance, market conditions, and activity.
                    </p>

                    <p className="font-semibold text-gray-900 dark:text-white">Data Sources:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>
                            <strong>OpenSea</strong>: collection details, listings, activity, and market statistics.
                        </li>
                        <li>
                            <strong>Etherscan</strong>: on-chain contract activity including buys, sells,
                            fees, and wallet balance tracking.
                        </li>
                        <li>
                            <strong>GeckoTerminal</strong>: token price, holders, market data, and liquidity pool metrics.
                        </li>
                    </ul>

                    <p>
                        All data is refreshed every <strong>20 minutes</strong> globally to stay within API rate limits.
                    </p>

                    <p className="font-semibold text-gray-900 dark:text-white">
                        Upcoming / Not Yet Supported:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>ERC20, ERC1155, and custom token range support</li>
                        <li>Listings from Blur, Magic Eden, and CryptoPunks Market</li>
                    </ul>

                    <p>
                        This is an experimental project. Feedback is welcome, feel free to reach out on X:
                        <a
                            href="https://x.com/man_versus_coin"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center ml-1 gap-1.5 text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-500 transition"
                        >
                            @man_versus_coin
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
