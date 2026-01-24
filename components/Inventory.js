function Inventory({ onInventoryUpdated }) {
    const [activeTab, setActiveTab] = React.useState('products');
    const [products, setProducts] = React.useState([]);
    const [emptyStock, setEmptyStock] = React.useState({ totalInHand: 0, history: [] });

    // Product Management State
    const [isProductModalOpen, setIsProductModalOpen] = React.useState(false);
    const [editingProduct, setEditingProduct] = React.useState(null);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [stockMode, setStockMode] = React.useState('SET'); // 'SET' or 'ADD'
    const [formData, setFormData] = React.useState({
        name: '',
        category: 'Liquor',
        price: '',
        costPrice: '',
        stock: '',
        isDepositEnabled: false,
        depositAmount: 0
    });

    React.useEffect(() => {
        refreshData();
    }, []);

    const refreshData = async () => {
        try {
            const prods = await Storage.getProducts();
            const bottles = await Storage.getEmptyBottles();
            setProducts(prods);
            setEmptyStock(bottles);
        } catch (error) {
            console.error('Error loading inventory data:', error);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const handlePurchaseEmpty = async (e) => {
        e.preventDefault();
        const qty = parseInt(e.target.qty.value);
        const cost = parseFloat(e.target.cost.value);
        if (qty > 0) {
            await Storage.updateEmptyBottles('PURCHASE', qty, cost);
            e.target.reset();
            await refreshData();
        }
    };

    // Product CRUD
    const handleAddProduct = () => {
        setEditingProduct(null);
        setStockMode('SET');
        setFormData({
            name: '',
            category: 'Liquor',
            price: '',
            costPrice: '',
            stock: '',
            isDepositEnabled: false,
            depositAmount: 0
        });
        setIsProductModalOpen(true);
    };

    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setStockMode('SET');
        setFormData({
            name: product.name,
            category: product.category,
            price: product.price,
            costPrice: product.costPrice || 0,
            stock: product.stock,
            isDepositEnabled: product.isDepositEnabled,
            depositAmount: product.depositAmount || 0
        });
        setIsProductModalOpen(true);
    };

    const handleDeleteProduct = async (id) => {
        if (window.confirm('Are you sure you want to archive this item? (It can be restored later)')) {
            try {
                await Storage.deleteProduct(id);
                await refreshData();
                if (onInventoryUpdated) {
                    onInventoryUpdated();
                }
            } catch (error) {
                console.error('Error archiving product:', error);
            }
        }
    };

    const handleStockModeChange = (mode) => {
        setStockMode(mode);
        if (mode === 'ADD') {
            setFormData(prev => ({ ...prev, stock: '' }));
        } else {
            // Reset to current stock if switching back to SET
            setFormData(prev => ({ ...prev, stock: editingProduct ? editingProduct.stock : '' }));
        }
    };

    const handleSaveProduct = async (e) => {
        e.preventDefault();

        let finalStock = parseInt(formData.stock);

        // If editing and in ADD mode, calculate the new total
        if (editingProduct && stockMode === 'ADD') {
            finalStock = parseInt(editingProduct.stock) + (parseInt(formData.stock) || 0);
        }

        const newProduct = {
            id: editingProduct ? editingProduct.id : null, // API will generate sequential ID
            name: formData.name,
            category: formData.category,
            price: parseFloat(formData.price),
            costPrice: parseFloat(formData.costPrice),
            stock: finalStock,
            isDepositEnabled: formData.isDepositEnabled,
            depositAmount: formData.isDepositEnabled ? parseFloat(formData.depositAmount) : 0
        };

        try {
            if (editingProduct) {
                // Update existing product
                await Storage.updateProduct(newProduct);
            } else {
                // Add new product
                await Storage.addProduct(newProduct);
            }
            await refreshData();
            setIsProductModalOpen(false);
            if (onInventoryUpdated) {
                onInventoryUpdated();
            }
        } catch (error) {
            console.error('Error saving product:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    return (
        <div className="space-y-6" data-name="inventory">
            <div className="flex gap-4 border-b border-[var(--border-color)]">
                <button
                    onClick={() => setActiveTab('products')}
                    className={`pb-3 px-1 font-medium border-b-2 transition-colors ${activeTab === 'products'
                        ? 'border-blue-500 text-blue-500'
                        : 'border-transparent text-gray-500 hover:text-[var(--text-color)]'
                        }`}
                >
                    Item Management
                </button>
                <button
                    onClick={() => setActiveTab('empties')}
                    className={`pb-3 px-1 font-medium border-b-2 transition-colors ${activeTab === 'empties'
                        ? 'border-blue-500 text-blue-500'
                        : 'border-transparent text-gray-500 hover:text-[var(--text-color)]'
                        }`}
                >
                    Empty Bottle Management
                </button>
            </div>

            {activeTab === 'products' ? (
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h3 className="text-lg font-bold text-[var(--text-color)]">Current Stock</h3>
                        <div className="flex gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <div className="icon-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"></div>
                                <input
                                    type="text"
                                    placeholder="Search by name or category..."
                                    className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--surface-color)] border border-[var(--border-color)] focus:ring-2 focus:ring-blue-500 outline-none text-[var(--text-color)]"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleAddProduct} className="shrink-0">
                                <div className="icon-plus w-4 h-4"></div> Add New Item
                            </Button>
                        </div>
                    </div>

                    <Card>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--border-color)] text-gray-500 text-sm">
                                        <th className="p-3">Item Name</th>
                                        <th className="p-3">Category</th>
                                        <th className="p-3 text-right">Cost</th>
                                        <th className="p-3 text-right">Price</th>
                                        <th className="p-3 text-center">Deposit Info</th>
                                        <th className="p-3 text-right">Stock</th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map(p => (
                                        <tr key={p.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-color)]">
                                            <td className="p-3 font-medium text-[var(--text-color)]">{p.name}</td>
                                            <td className="p-3 text-[var(--text-color)]">{p.category}</td>
                                            <td className="p-3 text-right text-gray-500">{formatCurrency(p.costPrice || 0)}</td>
                                            <td className="p-3 text-right text-[var(--text-color)]">{formatCurrency(p.price)}</td>
                                            <td className="p-3 text-center">
                                                {p.isDepositEnabled ? (
                                                    <div className="inline-flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs px-2 py-1 rounded-full">
                                                        <span>Yes</span>
                                                        <span className="font-bold">({formatCurrency(p.depositAmount)})</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-right">
                                                <span className={`font-bold ${p.stock < 10 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                    {p.stock}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEditProduct(p)}
                                                    className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                >
                                                    <div className="icon-pencil w-4 h-4"></div>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProduct(p.id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                >
                                                    <div className="icon-trash w-4 h-4"></div>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredProducts.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="p-8 text-center text-gray-500">
                                                No items found matching your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1 h-fit">
                        <h3 className="font-bold text-lg mb-4 text-[var(--text-color)]">Purchase Empties</h3>
                        <form onSubmit={handlePurchaseEmpty} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Quantity</label>
                                <input name="qty" type="number" required className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)]" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Total Cost (LKR)</label>
                                <input name="cost" type="number" required className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)]" />
                            </div>
                            <Button className="w-full">Record Purchase</Button>
                        </form>
                    </Card>

                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="bg-emerald-500/10 border-emerald-500/20">
                                <p className="text-emerald-600 dark:text-emerald-400 font-medium">Total Empty Bottles In Hand</p>
                                <h2 className="text-4xl font-bold text-emerald-700 dark:text-emerald-300 mt-2">{emptyStock.totalInHand}</h2>
                            </Card>
                            <Card className="bg-blue-500/10 border-blue-500/20">
                                <p className="text-blue-600 dark:text-blue-400 font-medium">Last Purchase Rate</p>
                                <h2 className="text-4xl font-bold text-blue-700 dark:text-blue-300 mt-2">
                                    {emptyStock.history.length > 0
                                        ? formatCurrency(emptyStock.history[emptyStock.history.length - 1].cost / emptyStock.history[emptyStock.history.length - 1].quantity)
                                        : 'N/A'
                                    } <span className="text-base font-normal opacity-70">/ bottle</span>
                                </h2>
                            </Card>
                        </div>

                        <Card>
                            <h3 className="font-bold mb-4 text-[var(--text-color)]">Empty Bottle History</h3>
                            <div className="overflow-x-auto max-h-60 overflow-y-auto">
                                <table className="w-full text-left">
                                    <thead className="text-gray-500 text-sm sticky top-0 bg-[var(--surface-color)]">
                                        <tr>
                                            <th className="p-2">Date</th>
                                            <th className="p-2">Type</th>
                                            <th className="p-2 text-right">Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {[...emptyStock.history].reverse().map(h => (
                                            <tr key={h.id} className="border-t border-[var(--border-color)]">
                                                <td className="p-2 text-[var(--text-color)]">{formatDate(h.date)}</td>
                                                <td className="p-2">
                                                    <span className={`text-xs px-2 py-1 rounded-full ${h.type === 'PURCHASE' ? 'bg-blue-100 text-blue-700' :
                                                        h.type === 'EXCHANGE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {h.type}
                                                    </span>
                                                </td>
                                                <td className="p-2 text-right font-medium text-[var(--text-color)]">{h.quantity}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* Product Edit/Add Modal */}
            <Modal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                title={editingProduct ? "Edit Product" : "Add New Product"}
            >
                <form onSubmit={handleSaveProduct} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Product Name</label>
                        <input
                            name="name"
                            type="text"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Category</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleInputChange}
                                className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="Liquor">Liquor</option>
                                <option value="Beer">Beer</option>
                                <option value="Chaser">Chaser</option>
                                <option value="Appetizers">Appetizers</option>
                                <option value="Main Course">Main Course</option>
                                <option value="Desserts">Desserts</option>
                                <option value="Beverages">Beverages</option>
                                <option value="Kitchen">Kitchen (General)</option>
                                <option value="Tobacco">Tobacco</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        {/* Stock Management with Set/Add Modes */}
                        <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg border border-[var(--border-color)]">
                            <label className="block text-sm font-medium text-gray-500 mb-2">Stock Management</label>

                            {editingProduct ? (
                                <div className="flex gap-1 mb-2 bg-[var(--bg-color)] p-1 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => handleStockModeChange('SET')}
                                        className={`flex-1 text-xs py-1.5 px-2 rounded-md transition-all ${stockMode === 'SET'
                                            ? 'bg-white dark:bg-gray-700 shadow-sm font-bold text-blue-600 dark:text-blue-400'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        Set Total
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleStockModeChange('ADD')}
                                        className={`flex-1 text-xs py-1.5 px-2 rounded-md transition-all ${stockMode === 'ADD'
                                            ? 'bg-white dark:bg-gray-700 shadow-sm font-bold text-emerald-600 dark:text-emerald-400'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        Add Stock
                                    </button>
                                </div>
                            ) : null}

                            <div className="relative">
                                <input
                                    name="stock"
                                    type="number"
                                    value={formData.stock}
                                    onChange={handleInputChange}
                                    required
                                    placeholder={stockMode === 'ADD' ? "Enter quantity to add" : "Enter total stock"}
                                    className={`w-full p-2 rounded-lg border bg-[var(--bg-color)] text-[var(--text-color)] focus:ring-2 outline-none ${stockMode === 'ADD'
                                        ? 'border-emerald-500/50 focus:ring-emerald-500'
                                        : 'border-[var(--border-color)] focus:ring-blue-500'
                                        }`}
                                />
                                {editingProduct && stockMode === 'ADD' && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-emerald-600 font-medium">
                                        + Adding
                                    </div>
                                )}
                            </div>
                            {editingProduct && (
                                <p className="text-xs text-gray-400 mt-1 ml-1">
                                    Current Stock: <span className="font-bold text-[var(--text-color)]">{editingProduct.stock}</span>
                                    {stockMode === 'ADD' && formData.stock && (
                                        <span className="text-emerald-500"> ➝ New Total: {parseInt(editingProduct.stock) + (parseInt(formData.stock) || 0)}</span>
                                    )}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Cost Price (LKR)</label>
                            <input
                                name="costPrice"
                                type="number"
                                step="0.01"
                                value={formData.costPrice}
                                onChange={handleInputChange}
                                required
                                className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Selling Price (LKR)</label>
                            <input
                                name="price"
                                type="number"
                                step="0.01"
                                value={formData.price}
                                onChange={handleInputChange}
                                required
                                className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-[var(--border-color)]">
                        <div className="flex items-center gap-2 mb-3">
                            <input
                                type="checkbox"
                                id="isDepositEnabled"
                                name="isDepositEnabled"
                                checked={formData.isDepositEnabled}
                                onChange={handleInputChange}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="isDepositEnabled" className="text-sm font-bold text-[var(--text-color)]">
                                Enable Bottle Deposit?
                            </label>
                        </div>

                        {formData.isDepositEnabled && (
                            <div className="animate-[fadeIn_0.2s_ease-out]">
                                <label className="block text-sm font-medium text-gray-500 mb-1">Deposit Amount (LKR)</label>
                                <input
                                    name="depositAmount"
                                    type="number"
                                    value={formData.depositAmount}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">This amount will be added to the bill if user chooses "Charge Deposit".</p>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="secondary" onClick={() => setIsProductModalOpen(false)} className="flex-1">Cancel</Button>
                        <Button type="submit" className="flex-1">Save Product</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}