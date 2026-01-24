function Layout({ children, currentView, onViewChange, currentUser, onLogout }) {
    const [isDark, setIsDark] = React.useState(false);

    React.useEffect(() => {
        const loadTheme = async () => {
            const theme = await Storage.getTheme();
            const isDarkTheme = theme === 'dark';
            setIsDark(isDarkTheme);
            if (isDarkTheme) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };
        loadTheme();
    }, []);

    React.useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            Storage.setTheme('dark');
        } else {
            document.documentElement.classList.remove('dark');
            Storage.setTheme('light');
        }
    }, [isDark]);

    // Role Based Navigation
    const allNavItems = [
        { id: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard', roles: ['admin', 'cashier'] },
        { id: 'pos', icon: 'shopping-cart', label: 'POS Terminal', roles: ['admin', 'cashier'] },
        { id: 'inventory', icon: 'package', label: 'Inventory', roles: ['admin'] },
        { id: 'suppliers', icon: 'truck', label: 'Supplier Payments', roles: ['admin'] },
        { id: 'promotions', icon: 'tag', label: 'Promotions', roles: ['admin'] },
        { id: 'reports', icon: 'chart-bar', label: 'Reports', roles: ['admin'] },
        { id: 'users', icon: 'users', label: 'Users', roles: ['admin'] },
    ];

    const navItems = allNavItems.filter(item => item.roles.includes(currentUser.role));

    return (
        <div className="flex h-screen bg-[var(--bg-color)] overflow-hidden" data-name="layout">
            {/* Sidebar */}
            <aside className="w-20 lg:w-64 bg-[var(--surface-color)] border-r border-[var(--border-color)] flex flex-col justify-between transition-all duration-300">
                <div>
                    <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-[var(--border-color)]">
                        <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center shrink-0">
                            <span className="text-white font-bold text-lg">P</span>
                        </div>
                        <span className="hidden lg:block ml-3 font-bold text-xl tracking-tight text-[var(--text-color)]">PUB CINNAMON</span>
                    </div>

                    <nav className="p-4 space-y-2">
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => onViewChange(item.id)}
                                className={`w-full flex items-center p-3 rounded-lg transition-colors ${currentView === item.id
                                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                            >
                                <div className={`icon-${item.icon} w-6 h-6`}></div>
                                <span className="hidden lg:block ml-3 font-medium">{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-4 space-y-2 border-t border-[var(--border-color)]">
                    <button
                        onClick={() => setIsDark(!isDark)}
                        className="w-full flex items-center justify-center lg:justify-start p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                    >
                        <div className={`icon-${isDark ? 'sun' : 'moon'} w-6 h-6`}></div>
                        <span className="hidden lg:block ml-3 font-medium">
                            {isDark ? 'Light Mode' : 'Dark Mode'}
                        </span>
                    </button>

                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center lg:justify-start p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                    >
                        <div className="icon-log-out w-6 h-6"></div>
                        <span className="hidden lg:block ml-3 font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <header className="h-16 bg-[var(--surface-color)] border-b border-[var(--border-color)] flex items-center justify-between px-6 shrink-0">
                    <h2 className="text-xl font-semibold capitalize text-[var(--text-color)]">{currentView}</h2>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-[var(--text-color)]">{currentUser.name}</p>
                            <p className="text-xs text-gray-500 capitalize"><span className="text-green-500">●</span> {currentUser.role}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                            {currentUser.name.charAt(0)}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-4 lg:p-6 scroll-smooth">
                    {children}
                </div>
            </main>
        </div>
    );
}