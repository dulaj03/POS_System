function Reports() {
    const [sales, setSales] = React.useState([]);
    const [dateRange, setDateRange] = React.useState({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [categories, setCategories] = React.useState([]);
    const [showCategoryReport, setShowCategoryReport] = React.useState(false);
    const [selectedCategory, setSelectedCategory] = React.useState(null);
    const [categorySales, setCategorySales] = React.useState([]);
    const [loadingCategorySales, setLoadingCategorySales] = React.useState(false);

    // Cashier Sales Report States
    const [users, setUsers] = React.useState([]);
    const [showUserReport, setShowUserReport] = React.useState(false);
    const [selectedUser, setSelectedUser] = React.useState(null);
    const [userSales, setUserSales] = React.useState([]);
    const [loadingUserSales, setLoadingUserSales] = React.useState(false);
    const [commissionPercentage, setCommissionPercentage] = React.useState(0);
    const [cashierCommissions, setCashierCommissions] = React.useState({});

    React.useEffect(() => {
        const loadData = async () => {
            try {
                const salesData = await Storage.getSales();
                setSales((salesData || []).reverse());

                // Load categories
                const categoriesData = await API.getSalesCategories();
                setCategories(categoriesData || []);

                // Load users
                const usersData = await API.getUsers();
                setUsers(usersData || []);

                // Load commissions
                const commissionsData = await API.getAllCommissions();
                setCashierCommissions(commissionsData || {});
            } catch (error) {
                console.error('Error loading data:', error);
                setSales([]);
                setCategories([]);
                setUsers([]);
                setCashierCommissions({});
            }
        };
        loadData();
    }, []);

    const filterSalesByDate = () => {
        const start = new Date(dateRange.start);
        start.setHours(0, 0, 0, 0);
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);

        return sales.filter(s => {
            const date = new Date(s.date);
            return date >= start && date <= end;
        });
    };

    const getFilteredSales = () => filterSalesByDate();

    // 1. Detailed Sales Report
    const exportSalesDetailed = () => {
        const filtered = getFilteredSales();
        const data = filtered.map(s => ({
            "Date": new Date(s.date).toLocaleDateString('en-LK'),
            "Invoice": s.id,
            "Items": s.items.map(i => i.name).join(', '),
            "Net Sales": parseFloat(s.subtotal).toFixed(2),
            "Deposits": parseFloat(s.depositTotal).toFixed(2),
            "Total": parseFloat(s.total).toFixed(2),
            "Cost": s.items.reduce((acc, i) => acc + (i.costPrice || 0) * i.qty, 0).toFixed(2),
            "Profit": (s.subtotal - s.items.reduce((acc, i) => acc + (i.costPrice || 0) * i.qty, 0)).toFixed(2)
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sales Detailed");
        XLSX.writeFile(wb, `Sales_Detailed_${dateRange.start}_to_${dateRange.end}.xlsx`);
    };

    // 2. Daily Profit & Cost Report (User Request)
    const exportProductProfitReport = () => {
        const filtered = getFilteredSales();
        const productStats = {};

        // Aggregate data by Product AND Date
        filtered.forEach(sale => {
            const date = new Date(sale.date).toLocaleDateString('en-LK');
            sale.items.forEach(item => {
                const key = `${date}_${item.id}`;
                if (!productStats[key]) {
                    productStats[key] = {
                        date: date,
                        name: item.name,
                        costPrice: item.costPrice || 0,
                        sellingPrice: item.price,
                        qtySold: 0,
                        totalCost: 0,
                        totalRevenue: 0,
                        totalProfit: 0
                    };
                }
                const stats = productStats[key];
                stats.qtySold += item.qty;
                stats.totalCost += (item.costPrice || 0) * item.qty;
                stats.totalRevenue += item.price * item.qty;
                stats.totalProfit += (item.price - (item.costPrice || 0)) * item.qty;
            });
        });

        const data = Object.values(productStats).map(p => ({
            "Date": p.date,
            "Product": p.name,
            "Cost Price": parseFloat(p.costPrice).toFixed(2),
            "Selling Price": parseFloat(p.sellingPrice).toFixed(2),
            "Qty Sold": p.qtySold,
            "Total Cost": p.totalCost.toFixed(2),
            "Total Revenue": p.totalRevenue.toFixed(2),
            "Profit": p.totalProfit.toFixed(2)
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Product Profit Analysis");
        XLSX.writeFile(wb, `Product_Profit_${dateRange.start}_to_${dateRange.end}.xlsx`);
    };

    // 3. Full Financial Report (Income vs Expenses)
    const exportFullFinancialReport = async () => {
        const filteredSales = getFilteredSales();

        // Income
        const totalNetSales = filteredSales.reduce((sum, s) => sum + s.subtotal, 0);
        const totalDeposits = filteredSales.reduce((sum, s) => sum + s.depositTotal, 0);

        // Expenses (Suppliers + Empty Purchases)
        const allSupplierPayments = await Storage.getSupplierPayments();
        const emptyData = await Storage.getEmptyBottles();
        const emptyBottleData = (emptyData && emptyData.history) ? emptyData.history.filter(h => h.type === 'PURCHASE') : [];

        const start = new Date(dateRange.start); start.setHours(0, 0, 0, 0);
        const end = new Date(dateRange.end); end.setHours(23, 59, 59, 999);

        const filteredSupplierPayments = allSupplierPayments.filter(p => {
            const d = new Date(p.date);
            return d >= start && d <= end;
        });
        const filteredEmptyPurchases = emptyBottleData.filter(p => {
            const d = new Date(p.date);
            return d >= start && d <= end;
        });

        const totalSupplierPaid = filteredSupplierPayments.reduce((sum, p) => sum + p.amount, 0);
        const totalEmptyPurchased = filteredEmptyPurchases.reduce((sum, p) => sum + p.cost, 0); // Note: cost field in empty history

        // Prepare Sheet Data
        const summaryData = [
            { "Category": "INCOME", "Description": "Net Sales (Product Revenue)", "Amount": totalNetSales.toFixed(2) },
            { "Category": "INCOME", "Description": "Bottle Deposits Collected", "Amount": totalDeposits.toFixed(2) },
            { "Category": "TOTAL INCOME", "Description": "", "Amount": (totalNetSales + totalDeposits).toFixed(2) },
            { "Category": "", "Description": "", "Amount": "" },
            { "Category": "EXPENSES", "Description": "Supplier Payments", "Amount": totalSupplierPaid.toFixed(2) },
            { "Category": "EXPENSES", "Description": "Empty Bottle Purchases", "Amount": totalEmptyPurchased.toFixed(2) },
            { "Category": "TOTAL EXPENSES", "Description": "", "Amount": (totalSupplierPaid + totalEmptyPurchased).toFixed(2) },
            { "Category": "", "Description": "", "Amount": "" },
            { "Category": "NET CASH FLOW", "Description": "(Income - Expenses)", "Amount": ((totalNetSales + totalDeposits) - (totalSupplierPaid + totalEmptyPurchased)).toFixed(2) },
        ];

        const ws = XLSX.utils.json_to_sheet(summaryData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Financial Summary");
        XLSX.writeFile(wb, `Financial_Report_${dateRange.start}_to_${dateRange.end}.xlsx`);
    };

    // 4. Category Sales Report
    const loadCategorySalesReport = async (category) => {
        setLoadingCategorySales(true);
        try {
            const categorySalesData = await API.getSalesByCategory(category, dateRange.start, dateRange.end);
            setCategorySales(categorySalesData || []);
            setSelectedCategory(category);
            setShowCategoryReport(true);
        } catch (error) {
            console.error('Error loading category sales:', error);
            setCategorySales([]);
        } finally {
            setLoadingCategorySales(false);
        }
    };

    const getCategorySalesStats = () => {
        const stats = {
            totalSales: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            totalItems: 0,
            avgTransactionValue: 0
        };

        categorySales.forEach(sale => {
            stats.totalSales++;
            stats.totalRevenue += sale.total;
            stats.totalItems += sale.items.reduce((sum, item) => sum + item.qty, 0);

            sale.items.forEach(item => {
                stats.totalCost += (item.costPrice || 0) * item.qty;
            });
        });

        stats.totalProfit = stats.totalRevenue - stats.totalCost;
        stats.avgTransactionValue = stats.totalSales > 0 ? stats.totalRevenue / stats.totalSales : 0;

        return stats;
    };

    const printCategoryReport = () => {
        const printWindow = window.open('', '', 'height=600,width=800');
        const stats = getCategorySalesStats();

        let tableHTML = `
            <html>
            <head>
                <title>${selectedCategory} Sales Report</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        background: white;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 2px solid #333;
                        padding-bottom: 15px;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 24px;
                        color: #333;
                    }
                    .header p {
                        margin: 5px 0;
                        color: #666;
                        font-size: 12px;
                    }
                    .stats-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 20px;
                        margin-bottom: 30px;
                    }
                    .stat-box {
                        border: 1px solid #ddd;
                        padding: 15px;
                        background: #f9f9f9;
                    }
                    .stat-label {
                        font-size: 12px;
                        color: #666;
                        text-transform: uppercase;
                        margin-bottom: 5px;
                    }
                    .stat-value {
                        font-size: 20px;
                        font-weight: bold;
                        color: #333;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }
                    th {
                        background: #f0f0f0;
                        padding: 10px;
                        text-align: left;
                        font-weight: bold;
                        border-bottom: 2px solid #333;
                        font-size: 12px;
                    }
                    td {
                        padding: 10px;
                        border-bottom: 1px solid #ddd;
                        font-size: 11px;
                    }
                    tr:nth-child(even) {
                        background: #f9f9f9;
                    }
                    .text-right {
                        text-align: right;
                    }
                    .footer {
                        margin-top: 30px;
                        text-align: center;
                        font-size: 11px;
                        color: #666;
                    }
                    @media print {
                        body {
                            margin: 0;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${selectedCategory} Sales Report</h1>
                    <p>Period: ${new Date(dateRange.start).toLocaleDateString('en-LK')} to ${new Date(dateRange.end).toLocaleDateString('en-LK')}</p>
                    <p>Report Generated: ${new Date().toLocaleDateString('en-LK')} ${new Date().toLocaleTimeString('en-LK')}</p>
                </div>

                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="stat-label">Total Transactions</div>
                        <div class="stat-value">${stats.totalSales}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Total Revenue</div>
                        <div class="stat-value">${formatCurrency(stats.totalRevenue)}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Total Profit</div>
                        <div class="stat-value" style="color: ${stats.totalProfit >= 0 ? '#10b981' : '#ef4444'}">${formatCurrency(stats.totalProfit)}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Total Items Sold</div>
                        <div class="stat-value">${stats.totalItems}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Avg Transaction</div>
                        <div class="stat-value">${formatCurrency(stats.avgTransactionValue)}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Profit Margin</div>
                        <div class="stat-value">${stats.totalRevenue > 0 ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1) : 0}%</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Invoice</th>
                            <th>Date</th>
                            <th>Items</th>
                            <th class="text-right">Amount</th>
                            <th class="text-right">Cost</th>
                            <th class="text-right">Profit</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        categorySales.forEach(sale => {
            const saleCost = sale.items.reduce((sum, item) => sum + (item.costPrice || 0) * item.qty, 0);
            const saleProfit = sale.total - saleCost;
            const itemCount = sale.items.reduce((sum, item) => sum + item.qty, 0);

            tableHTML += `
                <tr>
                    <td>${sale.id}</td>
                    <td>${new Date(sale.date).toLocaleDateString('en-LK')}</td>
                    <td>${itemCount}</td>
                    <td class="text-right">${formatCurrency(sale.total)}</td>
                    <td class="text-right">${formatCurrency(saleCost)}</td>
                    <td class="text-right" style="color: ${saleProfit >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">${formatCurrency(saleProfit)}</td>
                </tr>
            `;
        });

        tableHTML += `
                    </tbody>
                </table>

                <hr style="border: none; border-top: 1px solid #333; margin: 20px 0;">
                <div class="footer">
                    <p>System Design and Developed by <br> PANDAN LABS | +94 70 693 2532</p>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(tableHTML);
        printWindow.document.close();
        printWindow.print();
    };

    // 5. User/Cashier Sales Report
    const loadUserSalesReport = async (userId) => {
        setLoadingUserSales(true);
        setCommissionPercentage(0);
        try {
            const userSalesData = await API.getSalesByUser(userId);
            setUserSales(userSalesData || []);

            const user = users.find(u => u.id === userId);
            setSelectedUser(user);
            setShowUserReport(true);
        } catch (error) {
            console.error('Error loading user sales:', error);
            setUserSales([]);
        } finally {
            setLoadingUserSales(false);
        }
    };

    const getUserSalesStats = () => {
        const stats = {
            totalSales: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            totalItems: 0
        };

        userSales.forEach(sale => {
            stats.totalSales++;
            stats.totalRevenue += sale.total;
            stats.totalItems += sale.items.reduce((sum, item) => sum + item.qty, 0);

            sale.items.forEach(item => {
                stats.totalCost += (item.costPrice || 0) * item.qty;
            });
        });

        stats.totalProfit = stats.totalRevenue - stats.totalCost;

        return stats;
    };

    const getTotalCommission = () => {
        const stats = getUserSalesStats();
        return (stats.totalRevenue * commissionPercentage) / 100;
    };

    const printUserCommissionReport = () => {
        const printWindow = window.open('', '', 'height=600,width=800');
        const stats = getUserSalesStats();
        const totalCommission = getTotalCommission();

        let tableHTML = `
            <html>
            <head>
                <title>${selectedUser.name} - Commission Report</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        background: white;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 2px solid #333;
                        padding-bottom: 15px;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 24px;
                        color: #333;
                    }
                    .header p {
                        margin: 5px 0;
                        color: #666;
                        font-size: 12px;
                    }
                    .summary {
                        margin: 30px 0;
                        padding: 20px;
                        border: 1px solid #ddd;
                        background: #f9f9f9;
                    }
                    .summary-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 10px 0;
                        border-bottom: 1px solid #eee;
                        font-size: 14px;
                    }
                    .summary-row:last-child {
                        border-bottom: none;
                    }
                    .summary-label {
                        font-weight: bold;
                    }
                    .summary-value {
                        text-align: right;
                        font-weight: bold;
                    }
                    .total-row {
                        background: #f0f0f0;
                        padding: 15px 0;
                        font-size: 16px;
                        margin-top: 10px;
                    }
                    .footer {
                        margin-top: 30px;
                        text-align: center;
                        font-size: 11px;
                        color: #666;
                    }
                    @media print {
                        body {
                            margin: 0;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Commission Report</h1>
                    <p>Cashier: ${selectedUser.name}</p>
                    <p>Month: ${new Date().toLocaleDateString('en-LK', { month: 'long', year: 'numeric' })}</p>
                    <p>Report Generated: ${new Date().toLocaleDateString('en-LK')} ${new Date().toLocaleTimeString('en-LK')}</p>
                </div>

                <div class="summary">
                    <div class="summary-row">
                        <span class="summary-label">Total Sales</span>
                        <span class="summary-value">${stats.totalSales}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Total Sales Amount</span>
                        <span class="summary-value">${formatCurrency(stats.totalRevenue)}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Commission Rate</span>
                        <span class="summary-value">${commissionPercentage}%</span>
                    </div>
                    <div class="summary-row total-row">
                        <span class="summary-label">TOTAL COMMISSION</span>
                        <span class="summary-value">${formatCurrency(totalCommission)}</span>
                    </div>
                </div>

                <hr style="border: none; border-top: 1px solid #333; margin: 20px 0;">
                <div class="footer">
                    <p>System Design and Developed by <br> PANDAN LABS | +94 70 693 2532</p>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(tableHTML);
        printWindow.document.close();
        printWindow.print();
    };

    // Save commission when modal closes
    const handleSaveCommission = async () => {
        if (selectedUser && commissionPercentage >= 0) {
            try {
                // Save to database
                await API.saveCommission(selectedUser.id, commissionPercentage);

                // Update local state
                setCashierCommissions(prev => ({
                    ...prev,
                    [selectedUser.id]: commissionPercentage
                }));

                console.log('Commission saved successfully for', selectedUser.name);
            } catch (error) {
                console.error('Error saving commission:', error);
            }
        }
        setShowUserReport(false);
    };

    // Get all cashiers with their sales and commission
    const getCashiersSummaryData = () => {
        return users
            .filter(u => u.role !== 'admin')
            .map(user => {
                const userAllSales = sales.filter(s => s.userId === user.id);
                const totalRevenue = userAllSales.reduce((sum, s) => sum + s.total, 0);
                const commPercentage = cashierCommissions[user.id] || 0;
                const totalCommission = (totalRevenue * commPercentage) / 100;

                return {
                    id: user.id,
                    name: user.name,
                    totalSales: userAllSales.length,
                    totalRevenue,
                    commission: commPercentage,
                    totalCommission
                };
            });
    };

    // Print all cashiers commission summary
    const printAllCashiersCommissionReport = () => {
        const printWindow = window.open('', '', 'height=600,width=800');
        const summaryData = getCashiersSummaryData();
        const grandTotalRevenue = summaryData.reduce((sum, c) => sum + c.totalRevenue, 0);
        const grandTotalCommission = summaryData.reduce((sum, c) => sum + c.totalCommission, 0);

        let tableHTML = `
            <html>
            <head>
                <title>All Cashiers Commission Report</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        background: white;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 2px solid #333;
                        padding-bottom: 15px;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 24px;
                        color: #333;
                    }
                    .header p {
                        margin: 5px 0;
                        color: #666;
                        font-size: 12px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 20px 0;
                    }
                    th {
                        background: #f0f0f0;
                        padding: 10px;
                        text-align: left;
                        font-weight: bold;
                        border-bottom: 2px solid #333;
                        font-size: 12px;
                    }
                    td {
                        padding: 10px;
                        border-bottom: 1px solid #ddd;
                        font-size: 11px;
                    }
                    tr:nth-child(even) {
                        background: #f9f9f9;
                    }
                    .text-right {
                        text-align: right;
                    }
                    .total-row {
                        background: #e8e8e8;
                        font-weight: bold;
                    }
                    .footer {
                        margin-top: 30px;
                        text-align: center;
                        font-size: 11px;
                        color: #666;
                    }
                    @media print {
                        body {
                            margin: 0;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>All Cashiers Commission Report</h1>
                    <p>Period: ${new Date().toLocaleDateString('en-LK')}</p>
                    <p>Report Generated: ${new Date().toLocaleDateString('en-LK')} ${new Date().toLocaleTimeString('en-LK')}</p>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Cashier Name</th>
                            <th class="text-right">Total Sales</th>
                            <th class="text-right">Total Amount</th>
                            <th class="text-right">Commission %</th>
                            <th class="text-right">Total Commission</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        summaryData.forEach(cashier => {
            tableHTML += `
                <tr>
                    <td>${cashier.name}</td>
                    <td class="text-right">${cashier.totalSales}</td>
                    <td class="text-right">${formatCurrency(cashier.totalRevenue)}</td>
                    <td class="text-right">${cashier.commission}%</td>
                    <td class="text-right">${formatCurrency(cashier.totalCommission)}</td>
                </tr>
            `;
        });

        tableHTML += `
                    </tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td colspan="2">TOTAL</td>
                            <td class="text-right">${formatCurrency(grandTotalRevenue)}</td>
                            <td></td>
                            <td class="text-right">${formatCurrency(grandTotalCommission)}</td>
                        </tr>
                    </tfoot>
                </table>

                <hr style="border: none; border-top: 1px solid #333; margin: 20px 0;">
                <div class="footer">
                    <p>System Design and Developed by <br> PANDAN LABS | +94 70 693 2532</p>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(tableHTML);
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <div className="space-y-6" data-name="reports">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-xl font-bold text-[var(--text-color)]">Reports & Analytics</h2>

                <div className="flex gap-2 bg-[var(--surface-color)] p-2 rounded-lg border border-[var(--border-color)]">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-medium uppercase">From</span>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded px-2 py-1 text-sm text-[var(--text-color)] outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-medium uppercase">To</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded px-2 py-1 text-sm text-[var(--text-color)] outline-none"
                        />
                    </div>
                </div>
            </div>

            <Card>
                <h3 className="font-bold mb-4 text-[var(--text-color)]">Generate Excel Reports</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={exportProductProfitReport}
                        className="p-4 rounded-xl border border-[var(--border-color)] bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 text-left transition-colors group"
                    >
                        <div className="icon-trending-up w-8 h-8 text-blue-500 mb-2 group-hover:scale-110 transition-transform"></div>
                        <h4 className="font-bold text-blue-700 dark:text-blue-300">Product Profit Analysis</h4>
                        <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">Daily breakdown of Cost vs Revenue per Product.</p>
                    </button>

                    <button
                        onClick={exportSalesDetailed}
                        className="p-4 rounded-xl border border-[var(--border-color)] bg-emerald-50 dark:bg-emerald-900/10 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 text-left transition-colors group"
                    >
                        <div className="icon-list w-8 h-8 text-emerald-500 mb-2 group-hover:scale-110 transition-transform"></div>
                        <h4 className="font-bold text-emerald-700 dark:text-emerald-300">Detailed Sales Log</h4>
                        <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">Granular list of every invoice and item sold.</p>
                    </button>

                    <button
                        onClick={() => exportFullFinancialReport()}
                        className="p-4 rounded-xl border border-[var(--border-color)] bg-purple-50 dark:bg-purple-900/10 hover:bg-purple-100 dark:hover:bg-purple-900/20 text-left transition-colors group"
                    >
                        <div className="icon-scale w-8 h-8 text-purple-500 mb-2 group-hover:scale-110 transition-transform"></div>
                        <h4 className="font-bold text-purple-700 dark:text-purple-300">Full Financial Summary</h4>
                        <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1">Income (Sales) vs Expenses (Suppliers + Empties).</p>
                    </button>
                </div>
            </Card>

            <Card>
                <h3 className="font-bold mb-4 text-[var(--text-color)]">Category Sales Report</h3>
                <p className="text-xs text-gray-500 mb-4">Select a category to view detailed sales information with transaction breakdown and profit analysis.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {categories.map(category => (
                        <button
                            key={category}
                            onClick={() => loadCategorySalesReport(category)}
                            disabled={loadingCategorySales}
                            className="p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] hover:bg-amber-50 dark:hover:bg-amber-900/10 text-left transition-colors hover:border-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="flex items-center gap-2">
                                <div className="icon-box w-5 h-5 text-amber-500 flex-shrink-0"></div>
                                <span className="font-medium text-sm text-[var(--text-color)] truncate">{category}</span>
                            </div>
                        </button>
                    ))}
                </div>
                {categories.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        <p>No categories found</p>
                    </div>
                )}
            </Card>

            <Card>
                <h3 className="font-bold mb-4 text-[var(--text-color)]">Cashier Sales & Commission Report</h3>
                <p className="text-xs text-gray-500 mb-4">Select a cashier to view their monthly sales and calculate commission.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {users.filter(u => u.role !== 'admin').map(user => (
                        <button
                            key={user.id}
                            onClick={() => loadUserSalesReport(user.id)}
                            disabled={loadingUserSales}
                            className="p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] hover:bg-blue-50 dark:hover:bg-blue-900/10 text-left transition-colors hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="flex items-center gap-2">
                                <div className="icon-user w-5 h-5 text-blue-500 flex-shrink-0"></div>
                                <div className="flex-1 min-w-0">
                                    <span className="font-medium text-sm text-[var(--text-color)] truncate block">{user.name}</span>
                                    <span className="text-xs text-gray-500 capitalize">{user.role}</span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
                {users.filter(u => u.role !== 'admin').length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        <p>No cashiers found</p>
                    </div>
                )}
            </Card>

            {/* All Cashiers Commission Summary */}
            <Card>
                <h3 className="font-bold mb-4 text-[var(--text-color)]">All Cashiers Commission Summary</h3>
                <p className="text-xs text-gray-500 mb-4">Summary of all cashiers' sales and assigned commissions. Updates after you set commissions for each cashier.</p>

                {getCashiersSummaryData().length > 0 ? (
                    <>
                        <div className="overflow-x-auto border border-[var(--border-color)] rounded-lg mb-4">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr className="border-b border-[var(--border-color)]">
                                        <th className="p-3 text-left font-semibold text-gray-600 dark:text-gray-400">Cashier Name</th>
                                        <th className="p-3 text-center font-semibold text-gray-600 dark:text-gray-400">Total Sales</th>
                                        <th className="p-3 text-right font-semibold text-gray-600 dark:text-gray-400">Total Amount</th>
                                        <th className="p-3 text-center font-semibold text-gray-600 dark:text-gray-400">Commission %</th>
                                        <th className="p-3 text-right font-semibold text-gray-600 dark:text-gray-400">Total Commission</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-color)]">
                                    {getCashiersSummaryData().map(cashier => (
                                        <tr key={cashier.id} className="hover:bg-[var(--bg-color)] transition-colors">
                                            <td className="p-3 text-[var(--text-color)] font-medium">{cashier.name}</td>
                                            <td className="p-3 text-center text-[var(--text-color)]">{cashier.totalSales}</td>
                                            <td className="p-3 text-right text-[var(--text-color)] font-semibold">{formatCurrency(cashier.totalRevenue)}</td>
                                            <td className="p-3 text-center text-[var(--text-color)] font-semibold">{cashier.commission}%</td>
                                            <td className={`p-3 text-right font-bold ${cashier.commission > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                                                {formatCurrency(cashier.totalCommission)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 dark:bg-gray-800 font-bold">
                                    <tr className="border-t-2 border-[var(--border-color)]">
                                        <td colSpan="2" className="p-3 text-[var(--text-color)]">TOTAL</td>
                                        <td className="p-3 text-right text-[var(--text-color)]">{formatCurrency(getCashiersSummaryData().reduce((sum, c) => sum + c.totalRevenue, 0))}</td>
                                        <td colSpan="1" className="p-3 text-center text-[var(--text-color)]"></td>
                                        <td className="p-3 text-right text-emerald-600">{formatCurrency(getCashiersSummaryData().reduce((sum, c) => sum + c.totalCommission, 0))}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={printAllCashiersCommissionReport}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <div className="icon-printer w-4 h-4"></div>
                                Print All Commissions
                            </button>
                            <button
                                onClick={() => {
                                    const data = getCashiersSummaryData().map(cashier => ({
                                        "Cashier": cashier.name,
                                        "Total Sales": cashier.totalSales,
                                        "Total Amount": cashier.totalRevenue.toFixed(2),
                                        "Commission %": cashier.commission + '%',
                                        "Total Commission": cashier.totalCommission.toFixed(2)
                                    }));
                                    const ws = XLSX.utils.json_to_sheet(data);
                                    const wb = XLSX.utils.book_new();
                                    XLSX.utils.book_append_sheet(wb, ws, "Commission Summary");
                                    XLSX.writeFile(wb, `All_Cashiers_Commission_${new Date().toISOString().split('T')[0]}.xlsx`);
                                }}
                                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <div className="icon-download w-4 h-4"></div>
                                Export All to Excel
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <p>No commission data available. Set commissions for cashiers first.</p>
                    </div>
                )}
            </Card>

            {/* Category Sales Report Modal */}
            <Modal isOpen={showCategoryReport} onClose={() => setShowCategoryReport(false)} title={`${selectedCategory} Sales Report`}>
                <div className="space-y-4">
                    {/* Summary Stats */}
                    {categorySales.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 p-5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-lg">
                            {(() => {
                                const stats = getCategorySalesStats();
                                return (
                                    <>
                                        <div className="flex flex-col justify-center">
                                            <div className="text-xs font-medium text-gray-500 uppercase mb-2 tracking-wider">Transactions</div>
                                            <div className="text-xl lg:text-2xl font-bold text-amber-600 whitespace-nowrap">{stats.totalSales}</div>
                                        </div>
                                        <div className="flex flex-col justify-center">
                                            <div className="text-xs font-medium text-gray-500 uppercase mb-2 tracking-wider">Total Revenue</div>
                                            <div className="text-xl lg:text-2xl font-bold text-emerald-600 whitespace-nowrap">{formatCurrency(stats.totalRevenue)}</div>
                                        </div>
                                        <div className="flex flex-col justify-center">
                                            <div className="text-xs font-medium text-gray-500 uppercase mb-2 tracking-wider">Total Profit</div>
                                            <div className={`text-xl lg:text-2xl font-bold whitespace-nowrap ${stats.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {formatCurrency(stats.totalProfit)}
                                            </div>
                                        </div>
                                        <div className="flex flex-col justify-center">
                                            <div className="text-xs font-medium text-gray-500 uppercase mb-2 tracking-wider">Items Sold</div>
                                            <div className="text-xl lg:text-2xl font-bold text-blue-600 whitespace-nowrap">{stats.totalItems}</div>
                                        </div>
                                        <div className="flex flex-col justify-center">
                                            <div className="text-xs font-medium text-gray-500 uppercase mb-2 tracking-wider">Avg Transaction</div>
                                            <div className="text-xl lg:text-2xl font-bold text-purple-600 whitespace-nowrap">{formatCurrency(stats.avgTransactionValue)}</div>
                                        </div>
                                        <div className="flex flex-col justify-center">
                                            <div className="text-xs font-medium text-gray-500 uppercase mb-2 tracking-wider">Profit Margin</div>
                                            <div className="text-xl lg:text-2xl font-bold text-indigo-600 whitespace-nowrap">
                                                {stats.totalRevenue > 0 ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1) : 0}%
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {/* Sales Table */}
                    {categorySales.length > 0 ? (
                        <div className="overflow-x-auto border border-[var(--border-color)] rounded-lg">
                            <table className="w-full text-xs">
                                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                                    <tr className="border-b border-[var(--border-color)]">
                                        <th className="p-3 text-left font-semibold text-gray-600 dark:text-gray-400">Invoice</th>
                                        <th className="p-3 text-left font-semibold text-gray-600 dark:text-gray-400">Date</th>
                                        <th className="p-3 text-center font-semibold text-gray-600 dark:text-gray-400">Items</th>
                                        <th className="p-3 text-right font-semibold text-gray-600 dark:text-gray-400">Amount</th>
                                        <th className="p-3 text-right font-semibold text-gray-600 dark:text-gray-400">Cost</th>
                                        <th className="p-3 text-right font-semibold text-gray-600 dark:text-gray-400">Profit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-color)]">
                                    {categorySales.map(sale => {
                                        const saleCost = sale.items.reduce((sum, item) => sum + (item.costPrice || 0) * item.qty, 0);
                                        const saleProfit = sale.total - saleCost;
                                        const itemCount = sale.items.reduce((sum, item) => sum + item.qty, 0);

                                        return (
                                            <tr key={sale.id} className="hover:bg-[var(--bg-color)] transition-colors">
                                                <td className="p-3 text-[var(--text-color)] font-medium">{sale.id}</td>
                                                <td className="p-3 text-[var(--text-color)]">{new Date(sale.date).toLocaleDateString('en-LK')}</td>
                                                <td className="p-3 text-center text-[var(--text-color)] font-semibold">{itemCount}</td>
                                                <td className="p-3 text-right text-[var(--text-color)] font-semibold">{formatCurrency(sale.total)}</td>
                                                <td className="p-3 text-right text-[var(--text-color)]">{formatCurrency(saleCost)}</td>
                                                <td className={`p-3 text-right font-bold ${saleProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {formatCurrency(saleProfit)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <p>No sales found for this category in the selected period</p>
                        </div>
                    )}

                    {/* Print Button */}
                    {categorySales.length > 0 && (
                        <div className="flex gap-3 mt-6 pt-4 border-t border-[var(--border-color)]">
                            <button
                                onClick={printCategoryReport}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <div className="icon-printer w-4 h-4"></div>
                                Print Report
                            </button>
                            <button
                                onClick={() => {
                                    const data = categorySales.map(sale => {
                                        const saleCost = sale.items.reduce((sum, item) => sum + (item.costPrice || 0) * item.qty, 0);
                                        const saleProfit = sale.total - saleCost;
                                        const itemCount = sale.items.reduce((sum, item) => sum + item.qty, 0);
                                        return {
                                            "Invoice": sale.id,
                                            "Date": new Date(sale.date).toLocaleDateString('en-LK'),
                                            "Items": itemCount,
                                            "Amount": sale.total.toFixed(2),
                                            "Cost": saleCost.toFixed(2),
                                            "Profit": saleProfit.toFixed(2)
                                        };
                                    });
                                    const ws = XLSX.utils.json_to_sheet(data);
                                    const wb = XLSX.utils.book_new();
                                    XLSX.utils.book_append_sheet(wb, ws, selectedCategory);
                                    XLSX.writeFile(wb, `${selectedCategory}_Sales_Report_${dateRange.start}_to_${dateRange.end}.xlsx`);
                                }}
                                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <div className="icon-download w-4 h-4"></div>
                                Export Excel
                            </button>
                        </div>
                    )}
                </div>
            </Modal>

            {/* User Sales Report Modal */}
            <Modal isOpen={showUserReport} onClose={handleSaveCommission} title={`${selectedUser?.name} - Monthly Sales & Commission`}>
                <div className="space-y-4">
                    {/* Sales Table */}
                    {userSales.length > 0 ? (
                        <>
                            <div className="overflow-x-auto border border-[var(--border-color)] rounded-lg mb-4">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                                        <tr className="border-b border-[var(--border-color)]">
                                            <th className="p-3 text-left font-semibold text-gray-600 dark:text-gray-400">Invoice</th>
                                            <th className="p-3 text-left font-semibold text-gray-600 dark:text-gray-400">Date</th>
                                            <th className="p-3 text-center font-semibold text-gray-600 dark:text-gray-400">Items</th>
                                            <th className="p-3 text-right font-semibold text-gray-600 dark:text-gray-400">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-color)]">
                                        {userSales.map(sale => {
                                            const itemCount = sale.items.reduce((sum, item) => sum + item.qty, 0);
                                            return (
                                                <tr key={sale.id} className="hover:bg-[var(--bg-color)] transition-colors">
                                                    <td className="p-3 text-[var(--text-color)] font-medium">{sale.id}</td>
                                                    <td className="p-3 text-[var(--text-color)]">{new Date(sale.date).toLocaleDateString('en-LK')}</td>
                                                    <td className="p-3 text-center text-[var(--text-color)] font-semibold">{itemCount}</td>
                                                    <td className="p-3 text-right text-[var(--text-color)] font-semibold">{formatCurrency(sale.total)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Sales Summary and Commission Calculation */}
                            {(() => {
                                const stats = getUserSalesStats();
                                const totalCommission = getTotalCommission();
                                return (
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Left: Summary */}
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                                            <div className="space-y-3">
                                                <div>
                                                    <div className="text-xs font-medium text-gray-500 uppercase mb-1">Total Sales</div>
                                                    <div className="text-2xl font-bold text-blue-600">{stats.totalSales}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-medium text-gray-500 uppercase mb-1">Total Sales Amount</div>
                                                    <div className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalRevenue)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-medium text-gray-500 uppercase mb-1">Total Items</div>
                                                    <div className="text-2xl font-bold text-purple-600">{stats.totalItems}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Commission Calculator */}
                                        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500 uppercase block mb-2">Commission Rate (%)</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.1"
                                                        value={commissionPercentage}
                                                        onChange={(e) => setCommissionPercentage(parseFloat(e.target.value) || 0)}
                                                        onFocus={(e) => e.target.select()}
                                                        className="w-full px-3 py-2 bg-[var(--bg-color)] border border-[var(--border-color)] rounded text-sm text-[var(--text-color)] outline-none focus:border-amber-300"
                                                        placeholder="Enter percentage"
                                                    />
                                                </div>
                                                <div className="pt-3 border-t border-amber-200 dark:border-amber-800">
                                                    <div className="text-xs font-medium text-gray-500 uppercase mb-2">Total Commission</div>
                                                    <div className="text-3xl font-bold text-amber-600">{formatCurrency(totalCommission)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Print, Export and Save Buttons */}
                            <div className="flex gap-3 mt-6 pt-4 border-t border-[var(--border-color)]">
                                <button
                                    onClick={() => handleSaveCommission()}
                                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <div className="icon-save w-4 h-4"></div>
                                    Save Commission
                                </button>
                                <button
                                    onClick={printUserCommissionReport}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <div className="icon-printer w-4 h-4"></div>
                                    Print Report
                                </button>
                                <button
                                    onClick={() => {
                                        const stats = getUserSalesStats();
                                        const totalCommission = getTotalCommission();
                                        const data = [{
                                            "Cashier": selectedUser.name,
                                            "Total Sales": stats.totalSales,
                                            "Total Sales Amount": stats.totalRevenue.toFixed(2),
                                            "Commission Rate": commissionPercentage + '%',
                                            "Total Commission": totalCommission.toFixed(2)
                                        }];
                                        const ws = XLSX.utils.json_to_sheet(data);
                                        const wb = XLSX.utils.book_new();
                                        XLSX.utils.book_append_sheet(wb, ws, "Commission Report");
                                        XLSX.writeFile(wb, `${selectedUser.name}_Commission_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
                                    }}
                                    className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <div className="icon-download w-4 h-4"></div>
                                    Export Excel
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <p>No sales found for this cashier</p>
                        </div>
                    )}
                </div>
            </Modal>

            <Card>
                <h3 className="font-bold mb-4 text-[var(--text-color)]">Quick Stats ({dateRange.start} to {dateRange.end})</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 font-medium">
                            <tr>
                                <th className="p-3">Date</th>
                                <th className="p-3 text-right">Transactions</th>
                                <th className="p-3 text-right">Revenue</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {getFilteredSales().slice(0, 5).map(s => (
                                <tr key={s.id} className="hover:bg-[var(--bg-color)]">
                                    <td className="p-3 text-[var(--text-color)]">{new Date(s.date).toLocaleDateString()}</td>
                                    <td className="p-3 text-right text-[var(--text-color)]">{s.id}</td>
                                    <td className="p-3 text-right font-bold text-[var(--text-color)]">{formatCurrency(s.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}