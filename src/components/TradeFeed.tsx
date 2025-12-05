import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from "lucide-react";
// --- Base URL for the API ---
const API_BASE_URL = import.meta.env.VITE_TW_WUT_URL;

// --- CONFIGURATION ---
const ITEMS_PER_PAGE = 5; // Nouvelle constante pour la pagination

// --- Data Type (Define the structure of a trade event) ---
interface TradeEvent {
    type: 'BUY' | 'SELL';
    tokenId: string;
    price: number;
    tx: string;
    collectionName: string;
    time: string; // ISO 8601 string
    name: string;
    image: string;
}

// --- Props for the Component ---
interface TradeFeedProps {
    // 'global' or a specific strategy address (e.g., '0x...')
    sourceType: 'global' | string;
    timeframe: '24h' | '7d';
    typeFilter: 'ALL' | 'BUY' | 'SELL';
}

// --- Utility Functions (Kept from previous response) ---

/** Converts ISO time to short format (e.g., '2h ago') */
const formatTimeAgo = (isoDate: string): string => {
    const now = new Date();
    const date = new Date(isoDate);
    const diffInMs = now.getTime() - date.getTime();

    const seconds = Math.floor(diffInMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
};

/** Creates the Etherscan link */
const getTxLink = (txHash: string) => {
    const explorerUrl = 'https://etherscan.io/tx/';
    return `${explorerUrl}${txHash}`;
};

/** Checks if the event is within the given time range (24h or 7d) */
const isWithinTimeframe = (isoDate: string, timeframe: '24h' | '7d'): boolean => {
    const date = new Date(isoDate).getTime();
    const millisecondsInPeriod = timeframe === '24h' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    const cutoff = new Date().getTime() - millisecondsInPeriod;
    return date > cutoff;
};

// --- Main Component ---
const TradeFeed: React.FC<TradeFeedProps> = ({
    sourceType,
    timeframe,
    typeFilter
}) => {
    const [data, setData] = useState<TradeEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1); // État pour la pagination

    // Reset page when filters or data source changes
    useEffect(() => {
        setCurrentPage(1);
    }, [sourceType, timeframe, typeFilter]);

    // 1. Data Fetching Logic (useEffect)
    useEffect(() => {
        const fetchFeed = async () => {
            setIsLoading(true);
            setError(null);

            let url = '';
            if (sourceType === 'global') {
                url = `${API_BASE_URL}/strategies_7dfeed.json`;
            } else if (sourceType && typeof sourceType === 'string') {
                url = `${API_BASE_URL}/details/${sourceType}_feed.json`;
            } else {
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const json: TradeEvent[] = await response.json();
                setData(json);
            } catch (e) {
                console.error("Failed to fetch trade feed:", e);
                setError(e instanceof Error ? e.message : "An unknown error occurred.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchFeed();
    }, [sourceType]);


    // 2. Filtering Logic (useMemo)
    const filteredData = useMemo(() => {
        return data
            .filter(item => isWithinTimeframe(item.time, timeframe))
            .filter(item => typeFilter === 'ALL' || item.type === typeFilter)
            .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    }, [data, timeframe, typeFilter]);

    // 3. Pagination calculation
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentData = filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const totalTrades = filteredData.length;
    const totalBuys = filteredData.filter(t => t.type === 'BUY').length;
    const totalSells = filteredData.filter(t => t.type === 'SELL').length;
    const totalVolume = filteredData.reduce((sum, t) => sum + t.price, 0);


    // 4. Conditional Rendering (Loader/Error/Empty State)

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full  mx-auto flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Loading Feed...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-300 p-4 rounded-lg w-full mx-auto">
                <p className="font-bold text-sm">Error loading feed:</p>
                <p className="text-xs">{error}</p>
            </div>
        );
    }

    if (filteredData.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl text-center p-4 text-xs text-gray-500 dark:text-gray-400 w-full mx-auto">
                No trade events found for the current filters.
            </div>
        );
    }

    // 5. Pagination Controls Component
    const PaginationControls = () => (
        

        <div className="flex items-center justify-between p-4">
        <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
                className="
            flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg
            bg-gray-100 text-gray-800 hover:bg-gray-200
            dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all shadow-sm hover:shadow
        "
            >
            <ChevronLeft size={16} />
            Previous
        </button>

        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Page <span className="font-semibold">{currentPage}</span> / {totalPages}
        </span>

        <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
                className="
            flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg
            bg-gray-100 text-gray-800 hover:bg-gray-200
            dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all shadow-sm hover:shadow
        "
        >
            Next
            <ChevronRight size={16} />
        </button>
    </div>

    );

    // 6. Main Content Rendering
    return (
        <div className=" w-full mx-auto ">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-t-lg">
                <div className="text-sm flex flex-wrap items-center gap-3">

                    {/* Total trades */}
                    <span className="px-2 py-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold">
                        {totalTrades} trades
                    </span>

                    {/* Buys */}
                    <span className="px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-semibold">
                        {totalBuys} buys
                    </span>

                    {/* Sells */}
                    <span className="px-2 py-1 rounded-md bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-semibold">
                        {totalSells} sells
                    </span>

                    {/* Volume total */}
                    <span className="px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold ml-auto">
                        {totalVolume.toFixed(2)} ETH
                    </span>
                </div>
            </div>
            <ul className="">
                {currentData.map((item) => {
                    const txUrl = getTxLink(item.tx);
                    const isBuy = item.type === 'BUY';
                    const typeColor = isBuy ? 'text-green-500 dark:text-green-400' : 'text-orange-500 dark:text-orange-400';

                    return (
                        <li key={item.tx + item.tokenId} className="flex items-center space-x-2 transition duration-150 ease-in-out hover:bg-gray-50 dark:hover:bg-gray-700/50 px-4 py-2 border-b border-gray-100 dark:border-gray-800">

                            {/* Image (H-10 W-10) */}
                            <div className="flex-shrink-0">
                                <img
                                    className="h-10 w-10 rounded-md object-cover border border-gray-200 dark:border-gray-600"
                                    src={item.image}
                                    alt={item.name}
                                    loading="lazy"
                                />
                            </div>

                            {/* Details (Name and Price) */}
                            <div className="min-w-0 flex-1">
                                {/* Font size reduced to text-sm */}
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                    {item.name}
                                </p>
                                {/* Font size reduced to text-xs */}
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    <span className={`font-bold ${typeColor}`}>{item.price.toFixed(4)} ETH</span>
                                </p>
                            </div>

                            {/* Transaction Details (Time/TX Link) */}
                            <div className="flex-shrink-0 text-right">
                                {/* Time now links to the transaction, using text-xs */}
                                <a
                                    href={txUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-medium text-gray-900 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 transition"
                                    title={`View Transaction: ${item.tx}`}
                                >
                                    {formatTimeAgo(item.time)}
                                </a>

                                {/* TX hash remains (optional, but useful for quick ID), using text-xs */}
                                {/* Note: We removed the shortTx text since the time is now the main link. If you want to keep it, you must re-add the shortTx calculation. */}
                            </div>
                        </li>
                    );
                })}
            </ul>

            {/* Pagination Controls */}
            {totalPages > 1 && <PaginationControls />}
        </div>
    );
};

export default TradeFeed;