import Header from "./Header";

import { X } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
    

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            
            {/* Main area */}
            <div className="flex flex-col flex-1 relative">
                <Header  />

                {/* Main content */}
                <main className="flex-1 p-6 overflow-y-auto  bg-white dark:bg-gray-900">
                    <div className="min-h-[calc(100vh-120px)] relative"> {/* Adjust height as needed */}
                        {children}
                    </div>
                </main>

                {/* Footer - Not animated, fixed at bottom */}
                <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400 px-6 py-3 w-full">
                    <div className="flex justify-center items-center flex-wrap gap-1">
                        <span>{new Date().getFullYear()} - A community TokenWorks Dashboard - By</span>
                        <a
                            href="https://x.com/man_versus_coin"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-500 transition"
                        >
                            <X size={14} />
                            <span>@man_versus_coin</span>
                        </a>
                    </div>
                </footer>
            </div>
        </div>
    );
}