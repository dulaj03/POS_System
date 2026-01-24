function Suppliers() {
    const [payments, setPayments] = React.useState([]);
    const [formData, setFormData] = React.useState({
        supplier: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
    });

    React.useEffect(() => {
        const loadData = async () => {
            try {
                const paymentsData = await Storage.getSupplierPayments();
                setPayments((paymentsData || []).reverse());
            } catch (error) {
                console.error('Error loading supplier payments:', error);
                setPayments([]);
            }
        };
        loadData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payment = {
            id: Date.now(),
            ...formData,
            amount: parseFloat(formData.amount)
        };
        await Storage.addSupplierPayment(payment);
        setPayments([payment, ...payments]);
        setFormData({
            supplier: '',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            description: ''
        });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-[fadeIn_0.5s_ease-out]" data-name="suppliers">
            <Card className="lg:col-span-1 h-fit">
                <h3 className="font-bold text-lg mb-4 text-[var(--text-color)]">Record Supplier Payment</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-500 mb-1">Supplier / Company Name</label>
                        <input
                            required
                            type="text"
                            value={formData.supplier}
                            onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                            className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
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

            <Card className="lg:col-span-2">
                <h3 className="font-bold text-lg mb-4 text-[var(--text-color)]">Payment History</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
                            <tr>
                                <th className="p-3 rounded-l-lg">Date</th>
                                <th className="p-3">Supplier</th>
                                <th className="p-3">Description</th>
                                <th className="p-3 text-right rounded-r-lg">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {payments.map(p => (
                                <tr key={p.id} className="hover:bg-[var(--bg-color)]">
                                    <td className="p-3 text-[var(--text-color)]">{formatDate(p.date)}</td>
                                    <td className="p-3 font-medium text-[var(--text-color)]">{p.supplier}</td>
                                    <td className="p-3 text-gray-500">{p.description}</td>
                                    <td className="p-3 text-right font-bold text-red-500">-{formatCurrency(p.amount)}</td>
                                </tr>
                            ))}
                            {payments.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-gray-400">
                                        No supplier payments recorded yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}