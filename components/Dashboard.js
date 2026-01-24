function Dashboard({ onViewChange, lastSaleTime, currentUser }) {
    const [stats, setStats] = React.useState({
        netSales: 0,
        deposits: 0,
        salesCount: 0,
        emptyBottles: 0
    });
    const [lowStockItems, setLowStockItems] = React.useState([]);
    const chartRef = React.useRef(null);
    const chartInstance = React.useRef(null);
    const [showPINModal, setShowPINModal] = React.useState(false);
    const [pendingView, setPendingView] = React.useState(null);

    React.useEffect(() => {
        console.log('=== Dashboard useEffect triggered, lastSaleTime:', lastSaleTime);

        const loadData = async () => {
            try {
                console.log('[Dashboard] Starting data load...');
                // For cashiers, only get their sales; for admins, get all sales
                let sales;
                if (currentUser && currentUser.role === 'cashier') {
                    console.log('[Dashboard] Loading sales for cashier user:', currentUser.id);
                    sales = await Storage.getSalesByUser(currentUser.id);
                } else {
                    console.log('[Dashboard] Loading all sales for admin user');
                    sales = await Storage.getSales();
                }
                console.log('[Dashboard] After Storage.getSales(), received:', sales);
                console.log('[Dashboard] Type:', typeof sales, 'Is Array:', Array.isArray(sales));

                const emptyData = await Storage.getEmptyBottles();
                console.log('[Dashboard] After Storage.getEmptyBottles(), received:', emptyData);

                // Fetch low stock items
                const lowStock = await Storage.getLowStockProducts(20);
                console.log('[Dashboard] Low stock items:', lowStock);
                setLowStockItems(lowStock);

                // Ensure sales is an array
                const salesArray = Array.isArray(sales) ? sales : [];
                console.log('[Dashboard] salesArray length:', salesArray.length);

                // Calculate stats for today
                // Handle both same-day and previous dates to account for timezone issues
                const now = new Date();
                const today = now.toDateString();
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
                const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();

                console.log('[Dashboard] Today range:', new Date(todayStart), 'to', new Date(todayEnd));
                console.log('[Dashboard] Filtering', salesArray.length, 'sales for today...');

                // Debug: log first sale's date to see format
                if (salesArray.length > 0) {
                    console.log('[Dashboard] First sale object:', salesArray[0]);
                    console.log('[Dashboard] First sale date raw:', salesArray[0].date);
                    console.log('[Dashboard] First sale date parsed:', new Date(salesArray[0].date));
                    console.log('[Dashboard] First sale date milliseconds:', new Date(salesArray[0].date).getTime());
                }

                const todaysSales = salesArray.filter(s => {
                    try {
                        const saleDate = new Date(s.date).getTime();
                        const isToday = saleDate >= todayStart && saleDate <= todayEnd;
                        console.log('[Dashboard] Sale', s.id, '- raw date:', s.date, '- parsed:', new Date(s.date), '- ms:', saleDate, '- isToday:', isToday, '(range:', todayStart, '-', todayEnd, ')');
                        if (isToday) {
                            console.log('[Dashboard] ✓ Today sale found:', s.id, new Date(s.date), 's.total:', s.total, 's.depositTotal:', s.depositTotal);
                        }
                        return isToday;
                    } catch (e) {
                        console.error('[Dashboard] Error parsing sale date:', s.date, e);
                        return false;
                    }
                });

                console.log('[Dashboard] Found', todaysSales.length, 'sales for today');

                // Net Sales = subtotal (excluding deposits, including discounts applied)
                // Total = subtotal - discount + tax + deposits (everything)
                // Revenue reported = subtotal (what was actually sold)
                const netSales = todaysSales.reduce((sum, s) => sum + (parseFloat(s.subtotal) || 0), 0);
                const deposits = todaysSales.reduce((sum, s) => sum + (parseFloat(s.depositTotal) || 0), 0);

                console.log('[Dashboard] Stats calculated:', {
                    totalSales: salesArray.length,
                    todaysSales: todaysSales.length,
                    netSales,
                    deposits
                });

                console.log('[Dashboard] Formula verification:', {
                    'Net Sales (Product Revenue)': 'Sum of all sales subtotal (excludes deposit charges)',
                    'Deposits (Liability)': 'Sum of deposit amounts collected from customers',
                    'Sales Count': 'Number of transactions',
                    'Note': 'These should match Reports > Financial Report'
                });

                setStats({
                    netSales,
                    deposits,
                    salesCount: todaysSales.length,
                    emptyBottles: (emptyData && emptyData.totalInHand) ? emptyData.totalInHand : 0
                });

                // Initialize Chart with valid sales array
                // Use setTimeout to ensure canvas is mounted and ready
                setTimeout(() => {
                    console.log('[Dashboard] Calling initChart after timeout');
                    initChart(salesArray);
                }, 0);
            } catch (error) {
                console.error('[Dashboard] Error loading dashboard data:', error);
            }
        };

        loadData();

        // Cleanup chart on unmount
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [lastSaleTime, currentUser]); // Re-run when a new sale is recorded or user changes

    const initChart = (sales) => {
        if (!chartRef.current || !Array.isArray(sales)) {
            console.log('[Chart] Not initializing - chartRef:', !!chartRef.current, 'isArray:', Array.isArray(sales));
            return;
        }

        console.log('[Chart] Initializing with', sales.length, 'sales');

        // Get last 7 days labels
        const labels = [];
        const dataPoints = [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            // Use LOCAL date format (YYYY-MM-DD), not UTC via toISOString()
            const dateStr = d.getFullYear() + '-' +
                String(d.getMonth() + 1).padStart(2, '0') + '-' +
                String(d.getDate()).padStart(2, '0');
            labels.push(d.toLocaleDateString('en-LK', { weekday: 'short', month: 'short', day: 'numeric' }));

            console.log('[Chart] Looking for sales on', dateStr);

            // Sum sales for this day
            const matchingSales = sales.filter(s => {
                const matches = s && s.date && s.date.startsWith(dateStr);
                if (s && s.date) {
                    console.log('[Chart]   - Sale', s.id, 'date:', s.date, 'startsWith(', dateStr, '):', matches);
                }
                return matches;
            });

            const dayTotal = matchingSales.reduce((sum, s) => sum + (s.total || 0), 0);

            if (dayTotal > 0) {
                console.log('[Chart] Day', dateStr, 'has', matchingSales.length, 'sales, total:', dayTotal);
            }
            dataPoints.push(dayTotal);
        }

        console.log('[Chart] Data points:', dataPoints);

        const ctx = chartRef.current.getContext('2d');

        // Destroy existing chart if any
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#e5e7eb' : '#374151';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        chartInstance.current = new ChartJS(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Daily Sales',
                    data: dataPoints,
                    backgroundColor: '#3b82f6',
                    borderRadius: 4,
                    hoverBackgroundColor: '#2563eb'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: gridColor
                        },
                        ticks: {
                            color: textColor,
                            callback: function (value) {
                                return value >= 1000 ? (value / 1000) + 'k' : value;
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: textColor
                        }
                    }
                }
            }
        });
    };

    const statCards = [
        { title: 'Net Sales (Today)', value: formatCurrency(stats.netSales), icon: 'coins', color: 'blue' },
        { title: 'Deposits (Liability)', value: formatCurrency(stats.deposits), icon: 'piggy-bank', color: 'yellow' },
        { title: 'Sales Count', value: stats.salesCount, icon: 'receipt', color: 'purple' },
        { title: 'Empty Bottles in Hand', value: stats.emptyBottles, icon: 'wine', color: 'emerald' },
    ];

    // Restricted features that require PIN verification for cashiers
    const restrictedFeatures = ['inventory', 'reports'];

    const handleQuickAction = (view) => {
        // If user is cashier and view is restricted, show PIN modal
        if (currentUser && currentUser.role === 'cashier' && restrictedFeatures.includes(view)) {
            setPendingView(view);
            setShowPINModal(true);
        } else {
            // Admin or unrestricted feature - navigate directly
            onViewChange(view);
        }
    };

    const handlePINVerified = () => {
        setShowPINModal(false);
        if (pendingView) {
            onViewChange(pendingView);
            setPendingView(null);
        }
    };

    return (
        <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]" data-name="dashboard">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, idx) => (
                    <Card key={idx} className="relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{stat.title}</p>
                            <h3 className="text-2xl font-bold text-[var(--text-color)]">{stat.value}</h3>
                        </div>
                        <div className={`absolute right-4 top-4 p-3 rounded-xl bg-${stat.color}-500/10 text-${stat.color}-500 group-hover:scale-110 transition-transform`}>
                            <div className={`icon-${stat.icon} w-6 h-6`}></div>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 min-h-[400px]">
                    <h3 className="text-lg font-bold mb-6 text-[var(--text-color)]">Sales Overview (Last 7 Days)</h3>
                    <div className="h-[300px]">
                        <canvas ref={chartRef}></canvas>
                    </div>

                    {/* Low Stock Items Alert */}
                    {lowStockItems.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="text-yellow-500 text-xl">⚠️</div>
                                <h4 className="text-md font-bold text-yellow-600 dark:text-yellow-400">Low Stock Alert</h4>
                            </div>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                {lowStockItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                        <div className="flex-1">
                                            <p className="font-medium text-sm text-[var(--text-color)]">{item.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.category}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{item.stock}</p>
                                                <p className="text-xs text-gray-500">units</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => handleQuickAction('inventory')}
                                className="w-full mt-4 p-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold rounded-lg transition-colors"
                            >
                                Manage Inventory
                            </button>
                        </div>
                    )}
                </Card>
                <Card>
                    <h3 className="text-lg font-bold mb-4 text-[var(--text-color)]">Quick Actions</h3>
                    <div className="grid grid-cols-1 gap-4">
                        <button
                            onClick={() => handleQuickAction('inventory')}
                            className="p-4 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-color)] transition-colors text-left group flex items-center"
                        >
                            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-lg mr-4">
                                <div className="icon-plus-circle w-6 h-6 text-emerald-500 group-hover:scale-110 transition-transform"></div>
                            </div>
                            <div>
                                <span className="block font-bold text-[var(--text-color)]">Manage Inventory</span>
                                <span className="text-xs text-gray-500">Update stock & add items</span>
                            </div>
                            <div className="icon-chevron-right ml-auto text-gray-400"></div>
                        </button>

                        <button
                            onClick={() => handleQuickAction('reports')}
                            className="p-4 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-color)] transition-colors text-left group flex items-center"
                        >
                            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg mr-4">
                                <div className="icon-file-text w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform"></div>
                            </div>
                            <div>
                                <span className="block font-bold text-[var(--text-color)]">View Reports</span>
                                <span className="text-xs text-gray-500">Sales & Profit analytics</span>
                            </div>
                            <div className="icon-chevron-right ml-auto text-gray-400"></div>
                        </button>

                        <button
                            onClick={() => handleQuickAction('pos')}
                            className="p-4 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-color)] transition-colors text-left group flex items-center"
                        >
                            <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg mr-4">
                                <div className="icon-shopping-cart w-6 h-6 text-purple-500 group-hover:scale-110 transition-transform"></div>
                            </div>
                            <div>
                                <span className="block font-bold text-[var(--text-color)]">Open POS</span>
                                <span className="text-xs text-gray-500">Start billing</span>
                            </div>
                            <div className="icon-chevron-right ml-auto text-gray-400"></div>
                        </button>
                    </div>
                </Card>
            </div>

            <PINModal
                isOpen={showPINModal}
                onClose={() => setShowPINModal(false)}
                onVerify={handlePINVerified}
                title="Verify Admin PIN"
                message={`Enter admin PIN to access ${pendingView === 'inventory' ? 'Inventory Management' : 'Reports'}`}
            />
        </div>
    );
}