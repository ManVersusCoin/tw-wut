import { BarChart3 } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
    return (
        <header className="
            px-6 py-4
            border-b border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-900
            shadow-sm
        ">
            <div className="flex items-center justify-between">

                {/* Left */}
                <div className="flex items-start gap-4">
                    <div className="
                        p-2 rounded-xl
                        bg-blue-100 dark:bg-blue-900/40
                        text-blue-600 dark:text-blue-300
                        shadow-inner
                    ">
                        <BarChart3 size={22} />
                    </div>

                    <div>
                        <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                            TokenWorks Strategy Dashboard
                        </h1>

                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            A community tool - not affiliated with official project
                        </p>
                    </div>
                </div>

                {/* Right */}
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
}
