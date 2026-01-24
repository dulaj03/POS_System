function Promotions({ onPromotionsUpdated }) {
    const [promotions, setPromotions] = React.useState([]);
    const [products, setProducts] = React.useState([]);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editingPromo, setEditingPromo] = React.useState(null);
    const [searchQuery, setSearchQuery] = React.useState('');

    // Form State
    const [formData, setFormData] = React.useState({
        name: '',
        description: '',
        type: 'PERCENTAGE', // PERCENTAGE or FIXED
        value: '',
        startDate: '',
        endDate: '',
        isActive: true,
        selectedItems: [] // Array of product IDs
    });

    React.useEffect(() => {
        const loadData = async () => {
            try {
                const promos = await Storage.getPromotions();
                const prods = await Storage.getProducts();
                setPromotions(promos);
                setProducts(prods);
            } catch (error) {
                console.error('Error loading promotions data:', error);
            }
        };
        loadData();
    }, []);

    const handleAddPromo = () => {
        setEditingPromo(null);
        setFormData({
            name: '',
            description: '',
            type: 'PERCENTAGE',
            value: '',
            startDate: new Date().toISOString().split('T')[0],
            endDate: '',
            isActive: true,
            selectedItems: []
        });
        setIsModalOpen(true);
    };

    const handleEditPromo = (promo) => {
        setEditingPromo(promo);
        setFormData({
            name: promo.name,
            description: promo.description,
            type: promo.type,
            value: promo.value,
            startDate: promo.startDate,
            endDate: promo.endDate,
            isActive: promo.isActive,
            selectedItems: promo.selectedItems || []
        });
        setIsModalOpen(true);
    };

    const handleDeletePromo = async (id) => {
        if (window.confirm('Are you sure you want to delete this promotion?')) {
            try {
                await Storage.deletePromotion(id);
                // Reload promotions from API
                const updatedPromos = await Storage.getPromotions();
                setPromotions(updatedPromos);

                // Notify parent component to trigger POS refresh
                if (onPromotionsUpdated) {
                    onPromotionsUpdated();
                }
            } catch (error) {
                console.error('Error deleting promotion:', error);
            }
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        try {
            // Find the promotion to update
            const promoToUpdate = promotions.find(p => p.id === id);
            if (!promoToUpdate) return;

            // Create updated promotion with toggled status
            const updatedPromo = {
                ...promoToUpdate,
                isActive: currentStatus === false  // Toggle and ensure boolean
            };

            // Update via API
            await Storage.updatePromotion(updatedPromo);

            // Reload promotions from API
            const updatedPromos = await Storage.getPromotions();
            setPromotions(updatedPromos);

            // Notify parent component to trigger POS refresh
            if (onPromotionsUpdated) {
                onPromotionsUpdated();
            }
        } catch (error) {
            console.error('Error updating promotion status:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const newPromo = {
                id: editingPromo ? editingPromo.id : 'promo_' + Date.now(),
                ...formData,
                value: parseFloat(formData.value),
                isActive: formData.isActive === true  // Ensure it's a boolean
            };

            if (editingPromo) {
                // Update existing promotion
                await Storage.updatePromotion(newPromo);
            } else {
                // Add new promotion
                await Storage.addPromotion(newPromo);
            }

            // Reload promotions from API
            const updatedPromos = await Storage.getPromotions();
            setPromotions(updatedPromos);
            setIsModalOpen(false);

            // Notify parent component to trigger POS refresh
            if (onPromotionsUpdated) {
                onPromotionsUpdated();
            }
        } catch (error) {
            console.error('Error saving promotion:', error);
        }
    };

    const toggleProductSelection = (productId) => {
        setFormData(prev => {
            const current = prev.selectedItems;
            if (current.includes(productId)) {
                return { ...prev, selectedItems: current.filter(id => id !== productId) };
            } else {
                return { ...prev, selectedItems: [...current, productId] };
            }
        });
    };

    const filteredProductsForSelect = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6" data-name="promotions">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-[var(--text-color)]">Promotions Management</h2>
                <Button onClick={handleAddPromo}>
                    <div className="icon-tag w-4 h-4"></div> Create Promotion
                </Button>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--border-color)] text-gray-500 text-sm">
                                <th className="p-3">Offer Name</th>
                                <th className="p-3">Discount</th>
                                <th className="p-3">Applies To</th>
                                <th className="p-3">Period</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {promotions.map(promo => (
                                <tr key={promo.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-color)]">
                                    <td className="p-3">
                                        <div className="font-medium text-[var(--text-color)]">{promo.name}</div>
                                        <div className="text-xs text-gray-500">{promo.description}</div>
                                    </td>
                                    <td className="p-3 text-[var(--text-color)]">
                                        {promo.type === 'PERCENTAGE' ? `${promo.value}%` : `LKR ${promo.value}`}
                                    </td>
                                    <td className="p-3 text-[var(--text-color)]">
                                        {promo.selectedItems.length} items
                                    </td>
                                    <td className="p-3 text-sm text-gray-500">
                                        {promo.startDate} <span className="text-gray-300">to</span> {promo.endDate || 'Ongoing'}
                                    </td>
                                    <td className="p-3">
                                        <button
                                            onClick={() => handleToggleStatus(promo.id, promo.isActive)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${promo.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                                }`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${promo.isActive ? 'translate-x-6' : 'translate-x-1'
                                                }`} />
                                        </button>
                                    </td>
                                    <td className="p-3 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => handleEditPromo(promo)}
                                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                                        >
                                            <div className="icon-pencil w-4 h-4"></div>
                                        </button>
                                        <button
                                            onClick={() => handleDeletePromo(promo.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                        >
                                            <div className="icon-trash w-4 h-4"></div>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {promotions.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-400">
                                        No promotions found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingPromo ? "Edit Promotion" : "Create Promotion"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Offer Name</label>
                        <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Discount Type</label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)]"
                            >
                                <option value="PERCENTAGE">Percentage (%)</option>
                                <option value="FIXED">Fixed Amount (LKR)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Value</label>
                            <input
                                required
                                type="number"
                                min="0"
                                value={formData.value}
                                onChange={e => setFormData({ ...formData, value: e.target.value })}
                                className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Start Date</label>
                            <input
                                required
                                type="date"
                                value={formData.startDate}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">End Date (Optional)</label>
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)]"
                            />
                        </div>
                    </div>

                    <div className="border rounded-lg p-4 border-[var(--border-color)]">
                        <label className="block text-sm font-bold text-gray-500 mb-2">Applicable Items</label>
                        <div className="mb-2 relative">
                            <div className="icon-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"></div>
                            <input
                                type="text"
                                placeholder="Search items..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] text-sm"
                            />
                        </div>
                        <div className="h-40 overflow-y-auto border border-[var(--border-color)] rounded-lg p-2 bg-[var(--bg-color)]">
                            {filteredProductsForSelect.map(p => (
                                <div key={p.id} className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                                    <input
                                        type="checkbox"
                                        id={`item_${p.id}`}
                                        checked={formData.selectedItems.includes(p.id)}
                                        onChange={() => toggleProductSelection(p.id)}
                                        className="w-4 h-4 text-blue-600 rounded"
                                    />
                                    <label htmlFor={`item_${p.id}`} className="text-sm text-[var(--text-color)] cursor-pointer flex-1">
                                        {p.name} <span className="text-gray-400">({p.category})</span>
                                    </label>
                                </div>
                            ))}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            {formData.selectedItems.length} items selected
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={formData.isActive}
                            onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded"
                        />
                        <label htmlFor="isActive" className="text-sm font-medium text-[var(--text-color)]">Promotion Active</label>
                    </div>

                    <Button type="submit" className="w-full">Save Promotion</Button>
                </form>
            </Modal>
        </div>
    );
}