import React from 'react';
import TradeFeed from './TradeFeed'; // Assurez-vous d'avoir bien importé le TradeFeed mis à jour

// --- Props du composant Modal ---
interface TradeFeedModalProps {
    isOpen: boolean;
    onClose: () => void;
    
    // Props à passer au composant TradeFeed interne
    sourceType: 'global' | string;
    timeframe: '24h' | '7d';
    typeFilter: 'ALL' | 'BUY' | 'SELL';
    title: string; // Titre de la modale (ex: "Global Activity" ou "Strategy X")
}

const TradeFeedModal: React.FC<TradeFeedModalProps> = ({
    isOpen,
    onClose,
    sourceType,
    timeframe,
    typeFilter,
    title,
}) => {
    if (!isOpen) {
        return null;
    }

    return (
        // 1. Modal Overlay (Fond sombre)
        // Fixed position for full screen, dark background with transparency
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-80 backdrop-blur-sm"
            onClick={onClose} // Fermer en cliquant sur l'arrière-plan
        >
            
            {/* 2. Modal Container */}
            {/* Stop propagation pour empêcher la fermeture si on clique DANS la modale */}
            <div 
                className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()} 
            >
                {/* Modal Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 transition"
                        aria-label="Close modal"
                    >
                        {/* Icône de fermeture (Croix) */}
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                {/* Modal Body: Integration du TradeFeed */}
                <div className="overflow-y-auto flex-grow p-4">
                    {/* Le composant TradeFeed. Notez que nous enlevons le padding et le shadow que le TradeFeed avait, 
                        car ils sont maintenant gérés par la modale elle-même. 
                        Pour cela, il faudrait que TradeFeed accepte une prop `isModal` ou `noWrapper`, 
                        mais pour l'exemple, nous allons laisser TradeFeed tel quel et cela fonctionnera quand même. */}
                    <TradeFeed
                        sourceType={sourceType}
                        timeframe={timeframe}
                        typeFilter={typeFilter}
                        // Note: Le TradeFeed existant contient déjà un conteneur principal 
                        // avec `bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4`.
                        // Dans un scénario réel, vous rendriez TradeFeed plus "léger" 
                        // en retirant ces styles de TradeFeed et en les laissant à la modale.
                    />
                </div>
            </div>
        </div>
    );
};

export default TradeFeedModal;