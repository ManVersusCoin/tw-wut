import React, { useState } from 'react';
import TradeFeedModal from './TradeFeedModal'; // Assurez-vous que le chemin est correct

// Assurez-vous d'avoir les types nécessaires définis ou importés
interface Strategy {
    id: string; // ou strategyAddress
    // Ajoutez ici les autres champs pertinents comme stratBuy7d, stratSell7d, etc.
    [key: string]: any;
}

interface TradeVolumeCellProps {
    s: Strategy;
    colId: string;
    fmtEth: (value: number) => string; // La fonction de formatage ETH
    volumeKey: keyof Strategy;
    countKey: keyof Strategy;
    title: string;
    isBuy: boolean;
    timeframe: '24h' | '7d';
}

const TradeVolumeCell: React.FC<TradeVolumeCellProps> = ({
    s,
    colId,
    fmtEth,
    volumeKey,
    countKey,
    title,
    isBuy,
    
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const volume = s[volumeKey] as number;
    const count = s[countKey] as number;
    const typeFilter = isBuy ? 'BUY' : 'SELL';

    // Le TradeFeed Modal utilise les filtres 24h/7d. 
    // On doit extraire le timeframe depuis le colId (stratBuy*24h*Vol vs stratBuy*7d*Vol)
    const modalTimeframe = colId.includes('24h') ? '24h' : '7d';

    return (
        <>
            {/* Cellule Cliquable (votre structure initiale) */}
            <div
                className="flex flex-col cursor-pointer transition transform hover:scale-[1.03]"
                onClick={() => setIsModalOpen(true)}
                title={`View ${title} trade feed`}
            >
                <div
                    className={`font-bold font-mono ${isBuy ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                >
                    {fmtEth(volume)}
                </div>
                <div className="text-[10px] text-gray-400 font-medium">
                    {count} trades
                </div>
            </div>

            {/* Modal */}
            <TradeFeedModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={title}
                // L'adresse de la stratégie est l'ID de la ligne
                sourceType={s.id}
                // Les filtres sont définis par la colonne du tableau
                timeframe={modalTimeframe}
                typeFilter={typeFilter}
            />
        </>
    );
};

export default TradeVolumeCell;