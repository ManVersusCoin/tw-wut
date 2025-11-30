import { BarChart3 } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function Header({ onOpenAbout }: { onOpenAbout: () => void }) {
    return (
        <header
            className="
            px-6 py-4
            border-b border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-900
            shadow-sm
        "
        >
            <div className="flex items-center justify-between">

                {/* Left */}
                <div className="flex items-start gap-4">
                    <div
                        className="
                        p-2 rounded-xl
                        bg-blue-100 dark:bg-blue-900/40
                        text-blue-600 dark:text-blue-300
                        shadow-inner
                    "
                    >
                        <BarChart3 size={22} />
                    </div>

                    <div>
                        <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                            TokenWorks Strategy Dashboard
                        </h1>

                    </div>
                </div>

                {/* Right */}
                <div className="flex items-center gap-3">

                    
                    <button
                        onClick={onOpenAbout}
                        className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 
                                   text-gray-700 dark:text-gray-300 hover:bg-gray-200 
                                   dark:hover:bg-gray-700 transition"
                    >
                        About
                    </button>

                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
}
