function Suppliers() {
    const [suppliers, setSuppliers] = React.useState([]);
    const [payments, setPayments] = React.useState([]);
    const [selectedSupplier, setSelectedSupplier] = React.useState(null);
    const [dailyReport, setDailyReport] = React.useState([]);
    const [monthlyReport, setMonthlyReport] = React.useState([]);
    const [summary, setSummary] = React.useState({ supplier_name: '', total_paid: 0, current_month_total: 0 });
    const [showNewSupplierForm, setShowNewSupplierForm] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [formData, setFormData] = React.useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
    });
    const [newSupplierData, setNewSupplierData] = React.useState({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: ''
    });

    // Load suppliers on mount
    React.useEffect(() => {
        loadSuppliers();
    }, []);

    // Load reports when supplier is selected
    React.useEffect(() => {
        if (selectedSupplier) {
            loadReports(selectedSupplier.id);
        }
    }, [selectedSupplier]);

    const loadSuppliers = async () => {
        try {
            const response = await fetch('api/suppliers.php?action=all-suppliers');
            const data = await response.json();
            if (data.success) {
                setSuppliers(data.data || []);
            }
        } catch (error) {
            console.error('Error loading suppliers:', error);
        }
    };

    const loadReports = async (supplierId) => {
        try {
            // Get daily report
            const dailyResponse = await fetch(`api/suppliers.php?action=daily-report&supplier_id=${supplierId}`);
            const dailyData = await dailyResponse.json();
            if (dailyData.success) {
                setDailyReport(dailyData.data || []);
            }

            // Get monthly report
            const monthlyResponse = await fetch(`api/suppliers.php?action=monthly-report&supplier_id=${supplierId}`);
            const monthlyData = await monthlyResponse.json();
            if (monthlyData.success) {
                setMonthlyReport(monthlyData.data || []);
            }

            // Get supplier summary
            const summaryResponse = await fetch(`api/suppliers.php?action=summary&supplier_id=${supplierId}`);
            const summaryData = await summaryResponse.json();
            if (summaryData.success) {
                setSummary(summaryData.data);
            }

            // Load all payments for history
            const paymentsResponse = await fetch('api/suppliers.php?action=all-payments');
            const paymentsData = await paymentsResponse.json();
            if (paymentsData.success) {
                setPayments((paymentsData.data || []).filter(p => p.supplier_id === supplierId));
            }
        } catch (error) {
            console.error('Error loading reports:', error);
        }
    };

    // Filter suppliers based on search query
    const getFilteredSuppliers = () => {
        if (!searchQuery.trim()) {
            return [];
        }
        return suppliers.filter(supplier =>
            supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (supplier.contact_person && supplier.contact_person.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (supplier.phone && supplier.phone.includes(searchQuery)) ||
            (supplier.email && supplier.email.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    };

    const handleAddNewSupplier = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('api/suppliers.php?action=add-supplier', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSupplierData)
            });
            const data = await response.json();
            if (response.ok && data.success) {
                const newSupplier = data.data;
                setSuppliers([...suppliers, newSupplier]);
                setSelectedSupplier(newSupplier);
                setNewSupplierData({ name: '', contact_person: '', phone: '', email: '', address: '' });
                setShowNewSupplierForm(false);
                alert('Supplier added successfully');
            } else {
                alert('Error: ' + (data.error || 'Failed to add supplier'));
            }
        } catch (error) {
            console.error('Error adding supplier:', error);
            alert('Error adding supplier');
        }
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        if (!selectedSupplier) {
            alert('Please select a supplier first');
            return;
        }

        try {
            const response = await fetch('api/suppliers.php?action=add-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supplier_id: selectedSupplier.id,
                    amount: parseFloat(formData.amount),
                    date: formData.date,
                    description: formData.description
                })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                setFormData({
                    amount: '',
                    date: new Date().toISOString().split('T')[0],
                    description: ''
                });
                // Reload reports to reflect new payment
                loadReports(selectedSupplier.id);
                alert('Payment recorded successfully');
            } else {
                alert('Error: ' + (data.error || 'Failed to record payment'));
            }
        } catch (error) {
            console.error('Error recording payment:', error);
            alert('Error recording payment');
        }
    };

    // ===== EXPORT & PRINT FUNCTIONS =====
    const exportDailyReportToExcel = () => {
        if (!selectedSupplier || dailyReport.length === 0) {
            alert('No daily report data to export');
            return;
        }

        const data = dailyReport.map(item => ({
            'Date': item.date,
            'Transactions': item.transaction_count,
            'Daily Total (LKR)': parseFloat(item.daily_total).toFixed(2)
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Daily Report");
        XLSX.writeFile(wb, `Daily_Payment_Report_${selectedSupplier.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportMonthlyReportToExcel = () => {
        if (!selectedSupplier || monthlyReport.length === 0) {
            alert('No monthly report data to export');
            return;
        }

        const data = monthlyReport.map(item => ({
            'Month': item.month,
            'Transactions': item.transaction_count,
            'Monthly Total (LKR)': parseFloat(item.monthly_total).toFixed(2)
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Monthly Report");
        XLSX.writeFile(wb, `Monthly_Payment_Report_${selectedSupplier.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportSummaryToExcel = () => {
        if (!selectedSupplier) {
            alert('No supplier selected');
            return;
        }

        const data = [
            { 'Field': 'Supplier Name', 'Value': summary.supplier_name },
            { 'Field': 'Total Paid (All Time)', 'Value': parseFloat(summary.total_paid).toFixed(2) },
            { 'Field': 'Current Month Total', 'Value': parseFloat(summary.current_month_total).toFixed(2) }
        ];

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Summary");
        XLSX.writeFile(wb, `Supplier_Summary_${selectedSupplier.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const printReport = () => {
        if (!selectedSupplier) {
            alert('No supplier selected');
            return;
        }

        const printWindow = window.open('', '', 'width=900,height=1200');
        const today = new Date().toLocaleDateString('en-LK');
        const time = new Date().toLocaleTimeString('en-LK');

        let htmlContent = `
            <html>
            <head>
                <title>Supplier Payment Report - ${selectedSupplier.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; background: white; color: black; }
                    .main-header { text-align: center; margin-bottom: 15px; border-bottom: 3px solid #333; padding-bottom: 15px; }
                    .main-header .company-name { font-size: 18pt; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
                    .main-header .document-type { font-size: 14pt; font-weight: bold; margin-bottom: 10px; }
                    .main-header .ref-number { font-size: 10pt; color: #666; }
                    .report-details { text-align: center; margin-bottom: 15px; font-size: 10pt; }
                    .report-details p { margin: 3px 0; }
                    h1 { text-align: center; margin-bottom: 5px; }
                    .report-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                    .supplier-info { margin-bottom: 20px; padding: 10px; background: #f5f5f5; border-radius: 5px; }
                    .supplier-info p { margin: 5px 0; }
                    .summary-cards { display: flex; gap: 15px; margin-bottom: 20px; }
                    .summary-card { flex: 1; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; }
                    .summary-card label { font-weight: bold; display: block; margin-bottom: 5px; }
                    .summary-card .value { font-size: 18px; color: #333; }
                    h2 { margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #999; padding-bottom: 5px; font-size: 12pt; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    table, th, td { border: 1px solid #999; }
                    th { background-color: #f0f0f0; padding: 10px; text-align: left; font-weight: bold; font-size: 10pt; }
                    td { padding: 8px; font-size: 10pt; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    .total-row { font-weight: bold; background-color: #f0f0f0; }
                    .footer { text-align: center; margin-top: 30px; font-size: 10pt; color: #333; border-top: 2px solid #333; padding-top: 15px; }
                    .footer p { margin: 3px 0; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <div class="main-header">
                    <div class="company-name">PUB CINNAMON</div>
                    <div class="document-type">SUPPLIER PAYMENT REPORT</div>
                    <div class="ref-number">Report ID: ${Date.now()}</div>
                </div>

                <div class="report-details">
                    <p><strong>Generated on:</strong> ${today} at ${time}</p>
                    <p><strong>Report Type:</strong> Supplier Payment Summary with Daily & Monthly Breakdown</p>
                </div>

                <div class="supplier-info">
                    <p><strong>Supplier Name:</strong> ${selectedSupplier.name}</p>
                    ${selectedSupplier.contact_person ? `<p><strong>Contact Person:</strong> ${selectedSupplier.contact_person}</p>` : ''}
                    ${selectedSupplier.phone ? `<p><strong>Phone:</strong> ${selectedSupplier.phone}</p>` : ''}
                    ${selectedSupplier.email ? `<p><strong>Email:</strong> ${selectedSupplier.email}</p>` : ''}
                    ${selectedSupplier.address ? `<p><strong>Address:</strong> ${selectedSupplier.address}</p>` : ''}
                </div>

                <div class="summary-cards">
                    <div class="summary-card">
                        <label>Total Paid (All Time)</label>
                        <div class="value">LKR ${formatCurrency(summary.total_paid)}</div>
                    </div>
                    <div class="summary-card">
                        <label>Current Month Total</label>
                        <div class="value">LKR ${formatCurrency(summary.current_month_total)}</div>
                    </div>
                </div>

                <h2>Daily Payment Report</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th class="text-center">Transactions</th>
                            <th class="text-right">Daily Total (LKR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dailyReport.length > 0 ? dailyReport.map(item => `
                            <tr>
                                <td>${item.date}</td>
                                <td class="text-center">${item.transaction_count}</td>
                                <td class="text-right">${formatCurrency(item.daily_total)}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="3" class="text-center">No daily report data</td></tr>'}
                    </tbody>
                </table>

                <h2>Monthly Payment Report</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th class="text-center">Transactions</th>
                            <th class="text-right">Monthly Total (LKR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${monthlyReport.length > 0 ? monthlyReport.map(item => `
                            <tr>
                                <td>${item.month}</td>
                                <td class="text-center">${item.transaction_count}</td>
                                <td class="text-right">${formatCurrency(item.monthly_total)}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="3" class="text-center">No monthly report data</td></tr>'}
                    </tbody>
                </table>

                <h2>Payment History</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th class="text-right">Amount (LKR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.length > 0 ? payments.map(p => `
                            <tr>
                                <td>${p.date}</td>
                                <td>${p.description || '-'}</td>
                                <td class="text-right">${formatCurrency(p.amount)}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="3" class="text-center">No payment history</td></tr>'}
                    </tbody>
                </table>

                <hr style="border: none; border-top: 2px solid #333; margin: 20px 0;">
                <div class="footer">
                    <p>System Design and Developed by</p>
                    <p><strong>PANDAN LABS | +94 70 693 2532</strong></p>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]" data-name="suppliers">
            {/* Supplier Selection Section */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg text-[var(--text-color)]">Select Supplier</h3>
                    <Button
                        onClick={() => setShowNewSupplierForm(!showNewSupplierForm)}
                        className="text-sm"
                    >
                        <div className="icon-plus w-4 h-4"></div> New Supplier
                    </Button>
                </div>

                {showNewSupplierForm && (
                    <form onSubmit={handleAddNewSupplier} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Supplier Name *</label>
                                <input
                                    required
                                    type="text"
                                    value={newSupplierData.name}
                                    onChange={e => setNewSupplierData({ ...newSupplierData, name: e.target.value })}
                                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Contact Person</label>
                                <input
                                    type="text"
                                    value={newSupplierData.contact_person}
                                    onChange={e => setNewSupplierData({ ...newSupplierData, contact_person: e.target.value })}
                                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    value={newSupplierData.phone}
                                    onChange={e => setNewSupplierData({ ...newSupplierData, phone: e.target.value })}
                                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={newSupplierData.email}
                                    onChange={e => setNewSupplierData({ ...newSupplierData, email: e.target.value })}
                                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm text-gray-500 mb-1">Address</label>
                                <textarea
                                    value={newSupplierData.address}
                                    onChange={e => setNewSupplierData({ ...newSupplierData, address: e.target.value })}
                                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] focus:ring-2 focus:ring-blue-500 outline-none"
                                    rows="3"
                                ></textarea>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" className="flex-1">
                                <div className="icon-save w-4 h-4"></div> Add Supplier
                            </Button>
                            <Button
                                type="button"
                                onClick={() => setShowNewSupplierForm(false)}
                                className="flex-1 bg-gray-500"
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                )}

                {/* Search Bar */}
                {suppliers.length > 0 && (
                    <div className="mb-4">
                        <label className="block text-sm text-gray-500 mb-2">Search Suppliers</label>
                        <input
                            type="text"
                            placeholder="Search by supplier name, contact person, phone, or email..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        {searchQuery && (
                            <p className="text-xs text-gray-500 mt-1">
                                Found {getFilteredSuppliers().length} supplier(s)
                            </p>
                        )}
                    </div>
                )}

                {/* Suppliers Grid - Only show if search is active or show message */}
                {searchQuery ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {getFilteredSuppliers().length > 0 ? (
                            getFilteredSuppliers().map(supplier => (
                                <div
                                    key={supplier.id}
                                    onClick={() => {
                                        setSelectedSupplier(supplier);
                                        setSearchQuery(''); // Clear search when supplier is selected
                                    }}
                                    className={`p-4 rounded-lg border-2 cursor-pointer transition ${selectedSupplier?.id === supplier.id
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-[var(--border-color)] hover:border-blue-300'
                                        }`}
                                >
                                    <div className="font-bold text-[var(--text-color)]">{supplier.name}</div>
                                    {supplier.contact_person && (
                                        <div className="text-sm text-gray-500">Contact: {supplier.contact_person}</div>
                                    )}
                                    {supplier.phone && (
                                        <div className="text-sm text-gray-500">Phone: {supplier.phone}</div>
                                    )}
                                    {selectedSupplier?.id === supplier.id && (
                                        <div className="text-xs text-blue-500 font-semibold mt-2">✓ Selected</div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="col-span-2 p-8 text-center text-gray-400">
                                No suppliers found matching "{searchQuery}"
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="font-semibold mb-2">Search to view suppliers</p>
                        <p className="text-sm">Type in the search box above to find suppliers by name, contact person, phone, or email</p>
                    </div>
                )}
            </Card>

            {selectedSupplier && (
                <>
                    {/* Summary Card */}
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-[var(--text-color)]">Supplier Summary</h3>
                            <div className="flex gap-2">
                                <Button
                                    onClick={printReport}
                                    className="text-sm bg-blue-600 hover:bg-blue-700"
                                >
                                    <div className="icon-print w-4 h-4"></div> Print Report
                                </Button>
                                <Button
                                    onClick={exportSummaryToExcel}
                                    className="text-sm bg-green-600 hover:bg-green-700"
                                >
                                    <div className="icon-download w-4 h-4"></div> Excel
                                </Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="text-sm text-gray-500 mb-1">Supplier Name</div>
                                <div className="font-bold text-lg text-blue-600 dark:text-blue-400">{summary.supplier_name}</div>
                            </div>
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                <div className="text-sm text-gray-500 mb-1">Total Paid (All Time)</div>
                                <div className="font-bold text-lg text-green-600 dark:text-green-400">{formatCurrency(summary.total_paid)}</div>
                            </div>
                            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                <div className="text-sm text-gray-500 mb-1">Current Month Total</div>
                                <div className="font-bold text-lg text-orange-600 dark:text-orange-400">{formatCurrency(summary.current_month_total)}</div>
                            </div>
                        </div>
                    </Card>

                    {/* Record Payment Form */}
                    <Card>
                        <h3 className="font-bold text-lg mb-4 text-[var(--text-color)]">Record Supplier Payment</h3>
                        <form onSubmit={handlePaymentSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Supplier Name (Auto-filled)</label>
                                <input
                                    type="text"
                                    disabled
                                    value={selectedSupplier.name}
                                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-gray-100 dark:bg-gray-800 text-[var(--text-color)] opacity-60"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">Payment Date</label>
                                    <input
                                        required
                                        type="date"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">Amount (LKR)</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        value={formData.amount}
                                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                        className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Description / Invoice Ref</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <Button type="submit" className="w-full">
                                <div className="icon-save w-4 h-4"></div> Save Payment
                            </Button>
                        </form>
                    </Card>

                    {/* Daily Report */}
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-[var(--text-color)]">Daily Payment Report</h3>
                            <div className="flex gap-2">
                                <Button
                                    onClick={exportDailyReportToExcel}
                                    className="text-sm bg-green-600 hover:bg-green-700"
                                >
                                    <div className="icon-download w-4 h-4"></div> Excel
                                </Button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
                                    <tr>
                                        <th className="p-3 rounded-l-lg">Date</th>
                                        <th className="p-3 text-center">Transactions</th>
                                        <th className="p-3 text-right rounded-r-lg">Daily Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-color)]">
                                    {dailyReport.length > 0 ? (
                                        dailyReport.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-[var(--bg-color)]">
                                                <td className="p-3 text-[var(--text-color)]">{formatDate(item.date)}</td>
                                                <td className="p-3 text-center text-gray-500">{item.transaction_count}</td>
                                                <td className="p-3 text-right font-bold text-green-600 dark:text-green-400">{formatCurrency(item.daily_total)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="p-8 text-center text-gray-400">
                                                No payments recorded for this supplier.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Monthly Report */}
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-[var(--text-color)]">Monthly Payment Report</h3>
                            <div className="flex gap-2">
                                <Button
                                    onClick={exportMonthlyReportToExcel}
                                    className="text-sm bg-green-600 hover:bg-green-700"
                                >
                                    <div className="icon-download w-4 h-4"></div> Excel
                                </Button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
                                    <tr>
                                        <th className="p-3 rounded-l-lg">Month</th>
                                        <th className="p-3 text-center">Transactions</th>
                                        <th className="p-3 text-right rounded-r-lg">Monthly Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-color)]">
                                    {monthlyReport.length > 0 ? (
                                        monthlyReport.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-[var(--bg-color)]">
                                                <td className="p-3 text-[var(--text-color)]">{item.month}</td>
                                                <td className="p-3 text-center text-gray-500">{item.transaction_count}</td>
                                                <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(item.monthly_total)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="p-8 text-center text-gray-400">
                                                No payments recorded for this supplier.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Payment History */}
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-[var(--text-color)]">Payment History</h3>
                            <Button
                                onClick={() => {
                                    const data = payments.map(p => ({
                                        'Date': p.date,
                                        'Description': p.description || '-',
                                        'Amount (LKR)': parseFloat(p.amount).toFixed(2)
                                    }));
                                    const ws = XLSX.utils.json_to_sheet(data);
                                    const wb = XLSX.utils.book_new();
                                    XLSX.utils.book_append_sheet(wb, ws, "Payment History");
                                    XLSX.writeFile(wb, `Payment_History_${selectedSupplier.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
                                }}
                                className="text-sm bg-green-600 hover:bg-green-700"
                            >
                                <div className="icon-download w-4 h-4"></div> Excel
                            </Button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
                                    <tr>
                                        <th className="p-3 rounded-l-lg">Date</th>
                                        <th className="p-3">Description</th>
                                        <th className="p-3 text-right rounded-r-lg">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-color)]">
                                    {payments.length > 0 ? (
                                        payments.map(p => (
                                            <tr key={p.id} className="hover:bg-[var(--bg-color)]">
                                                <td className="p-3 text-[var(--text-color)]">{formatDate(p.date)}</td>
                                                <td className="p-3 text-gray-500">{p.description || '-'}</td>
                                                <td className="p-3 text-right font-bold text-red-500">-{formatCurrency(p.amount)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="p-8 text-center text-gray-400">
                                                No payment history for this supplier.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}