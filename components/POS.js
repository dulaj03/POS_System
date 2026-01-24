function POS({ onSaleCompleted, currentUser, refreshTime, promotionRefreshTime }) {
    const [products, setProducts] = React.useState([]);
    const [promotions, setPromotions] = React.useState([]);
    const [cart, setCart] = React.useState([]);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedCategory, setSelectedCategory] = React.useState('All');
    const [showPaymentModal, setShowPaymentModal] = React.useState(false);
    const [payments, setPayments] = React.useState([{ id: 1, method: 'Cash', amount: '' }]);
    const [receiptData, setReceiptData] = React.useState(null);
    const [notification, setNotification] = React.useState(null);
    const [showPaymentSuccess, setShowPaymentSuccess] = React.useState(false);

    // State to track manually removed promotions from cart items: { cartId: boolean }
    const [removedPromos, setRemovedPromos] = React.useState({});

    // State for service charge and tax rates (in percentage)
    const [serviceChargeRate, setServiceChargeRate] = React.useState(10);
    const [taxRate, setTaxRate] = React.useState(8);

    React.useEffect(() => {
        const loadData = async () => {
            try {
                const prods = await Storage.getProducts();
                const promos = await Storage.getPromotions();
                const settings = await Storage.getPOSSettings();

                setProducts(prods);
                setPromotions(promos);
                setServiceChargeRate(settings.service_charge_rate || 10);
                setTaxRate(settings.tax_rate || 8);
            } catch (error) {
                console.error('Error loading POS data:', error);
            }
        };
        loadData();
    }, [refreshTime, promotionRefreshTime]); // Re-load when inventory or promotions are updated

    // Print Effect: Triggers when receiptData is updated
    React.useEffect(() => {
        if (receiptData) {
            // Wait for React to render the receipt data into the DOM
            const timer = setTimeout(() => {
                document.body.classList.add('printing-receipt');
                window.print();

                // Cleanup after print dialog closes and show success modal
                setTimeout(() => {
                    document.body.classList.remove('printing-receipt');
                    setReceiptData(null);
                    setShowPaymentSuccess(true);
                    // Auto-close success modal after 3 seconds
                    setTimeout(() => {
                        setShowPaymentSuccess(false);
                    }, 3000);
                }, 100);

            }, 500);

            return () => clearTimeout(timer);
        }
    }, [receiptData]);

    // Auto-hide notification after 3 seconds
    React.useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });
    };

    const categories = ['All', ...new Set([
        ...(products && Array.isArray(products) ? products.map(p => p.category) : []),
        'Appetizers', 'Main Course', 'Desserts', 'Beverages', 'Liquor'
    ])].filter((v, i, a) => a.indexOf(v) === i).sort();

    const filteredProducts = (products && Array.isArray(products)) ? products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    }) : [];

    const getActivePromotion = (productId) => {
        if (!promotions || !Array.isArray(promotions)) return null;
        const today = new Date().toISOString().split('T')[0];
        return promotions.find(promo =>
            promo.isActive &&
            promo.startDate <= today &&
            (!promo.endDate || promo.endDate >= today) &&
            (promo.selectedItems && promo.selectedItems.includes(productId))
        );
    };

    const addToCart = (product) => {
        const promo = getActivePromotion(product.id);
        const cartId = Date.now();

        const existingItem = cart.find(item => item.id === product.id && item.depositMode === 'CHARGE');

        if (product.isDepositEnabled) {
            if (existingItem) {
                updateCartItem(existingItem.cartId, { qty: existingItem.qty + 1 });
            } else {
                setCart([...cart, {
                    ...product,
                    cartId,
                    qty: 1,
                    depositMode: 'CHARGE',
                    costPrice: product.costPrice || 0,
                    appliedPromo: promo
                }]);
            }
        } else {
            const existingItem = cart.find(item => item.id === product.id);
            if (existingItem) {
                updateCartItem(existingItem.cartId, { qty: existingItem.qty + 1 });
            } else {
                setCart([...cart, {
                    ...product,
                    cartId,
                    qty: 1,
                    costPrice: product.costPrice || 0,
                    appliedPromo: promo
                }]);
            }
        }
    };

    const updateCartItem = (cartId, updates) => {
        setCart(cart.map(item => item.cartId === cartId ? { ...item, ...updates } : item));
    };

    const removeFromCart = (cartId) => {
        setCart(cart.filter(item => item.cartId !== cartId));
        const newRemoved = { ...removedPromos };
        delete newRemoved[cartId];
        setRemovedPromos(newRemoved);
    };

    const toggleDepositMode = (cartId) => {
        setCart(cart.map(item => {
            if (item.cartId === cartId && item.isDepositEnabled) {
                return {
                    ...item,
                    depositMode: item.depositMode === 'CHARGE' ? 'EXCHANGE' : 'CHARGE'
                };
            }
            return item;
        }));
    };

    const togglePromoForLine = (cartId) => {
        setRemovedPromos(prev => ({
            ...prev,
            [cartId]: !prev[cartId]
        }));
    };

    // Handler to save POS settings (admin only)
    const updatePOSSettings = async (newServiceCharge, newTax) => {
        try {
            await Storage.setPOSSettings(newServiceCharge, newTax);
            setServiceChargeRate(newServiceCharge);
            setTaxRate(newTax);
            showNotification('POS settings updated successfully', 'success');
        } catch (error) {
            console.error('Error saving POS settings:', error);
            showNotification('Failed to save POS settings', 'error');
        }
    };

    // --- Calculations ---
    // Formula breakdown:
    // Subtotal = Sum of (price × qty) for all items
    // Total Discount = Sum of promotion/manual discounts
    // Net Total = Subtotal - Discount
    // Tax = Net Total × 10%
    // Deposits = Sum of (depositAmount × qty) for items with deposits
    // Cart Total = Net Total + Tax + Deposits
    let subtotalBeforeDiscount = 0;
    let totalDiscount = 0;
    let depositTotal = 0;

    const cartWithCalculations = cart.map(item => {
        const lineTotalRaw = item.price * item.qty;
        subtotalBeforeDiscount += lineTotalRaw;

        let discountAmount = 0;
        const promo = item.appliedPromo;
        const isPromoRemoved = removedPromos[item.cartId];

        if (promo && !isPromoRemoved) {
            if (promo.type === 'PERCENTAGE') {
                discountAmount = (item.price * (promo.value / 100)) * item.qty;
            } else {
                discountAmount = promo.value * item.qty;
            }
        }

        discountAmount = Math.min(discountAmount, lineTotalRaw);
        totalDiscount += discountAmount;

        const lineTotalAfterDiscount = lineTotalRaw - discountAmount;

        let lineDeposit = 0;
        if (item.isDepositEnabled && item.depositMode === 'CHARGE') {
            lineDeposit = item.depositAmount * item.qty;
            depositTotal += lineDeposit;
        }

        return {
            ...item,
            lineTotalRaw,
            discountAmount,
            lineTotalAfterDiscount,
            lineDeposit
        };
    });

    const netTotalAfterDiscount = subtotalBeforeDiscount - totalDiscount;
    const serviceChargeAmount = netTotalAfterDiscount * (serviceChargeRate / 100);
    const taxAmount = netTotalAfterDiscount * (taxRate / 100);
    const cartTotal = netTotalAfterDiscount + serviceChargeAmount + taxAmount + depositTotal;

    const bottlesExchanged = cart.reduce((sum, item) => {
        return sum + (item.isDepositEnabled && item.depositMode === 'EXCHANGE' ? item.qty : 0);
    }, 0);

    // Payment Logic
    const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const balanceDue = Math.max(0, cartTotal - totalPaid);
    const changeDue = Math.max(0, totalPaid - cartTotal);

    const addPaymentRow = () => {
        setPayments([...payments, { id: Date.now(), method: 'Cash', amount: '' }]);
    };

    const removePaymentRow = (id) => {
        if (payments.length > 1) {
            setPayments(payments.filter(p => p.id !== id));
        }
    };

    const updatePayment = (id, field, value) => {
        setPayments(payments.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const processSale = async () => {
        if (balanceDue > 1) {
            showNotification("Insufficient payment!", 'error');
            return;
        }

        // Clean items - include all fields for both API and receipt
        const cleanedItems = cartWithCalculations.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            costPrice: item.costPrice || 0,
            qty: item.qty,
            discount: item.discountAmount || 0,
            lineTotalRaw: item.lineTotalRaw,
            lineDeposit: item.lineDeposit || 0,
            discountAmount: item.discountAmount || 0,
            isDepositEnabled: item.isDepositEnabled || false,
            depositMode: item.depositMode || null
        }));

        const totalPaidAmount = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const change = Math.max(0, totalPaidAmount - cartTotal);

        // Create date in client's local timezone, not UTC
        const now = new Date();
        const localDate = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0') + ' ' +
            String(now.getHours()).padStart(2, '0') + ':' +
            String(now.getMinutes()).padStart(2, '0') + ':' +
            String(now.getSeconds()).padStart(2, '0');

        console.log('[POS] Creating sale with local date:', localDate, 'current time:', now);

        const sale = {
            id: generateReceiptId(),
            userId: currentUser?.id || 'u1',
            user: currentUser?.name || 'Admin',
            date: localDate,
            items: cleanedItems,
            subtotal: subtotalBeforeDiscount,
            discount: totalDiscount,
            discountTotal: totalDiscount,
            serviceCharge: serviceChargeAmount,
            serviceChargeRate: serviceChargeRate,
            tax: taxAmount,
            taxRate: taxRate,
            depositTotal: depositTotal,
            total: cartTotal,
            payments: payments.filter(p => p.amount && parseFloat(p.amount) > 0),
            paymentMethods: payments.filter(p => p.amount && parseFloat(p.amount) > 0),
            bottlesExchanged: bottlesExchanged,
            change: change
        };

        try {
            await Storage.addSale(sale);
            setShowPaymentModal(false);
            setCart([]);
            setPayments([{ id: 1, method: 'Cash', amount: '' }]);
            setRemovedPromos({});
            // Trigger Print via Effect
            setReceiptData(sale);

            // Notify parent that sale was completed so Dashboard can refresh
            if (onSaleCompleted) {
                onSaleCompleted();
            }
        } catch (error) {
            console.error('Error processing sale:', error);
            showNotification('Error saving sale. Please try again.', 'error');
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-full gap-6" data-name="pos">
            {/* Product Section */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="mb-4 space-y-3">
                    <div className="relative">
                        <div className="icon-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></div>
                        <input
                            type="text"
                            placeholder="Search products..."
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--surface-color)] border border-[var(--border-color)] focus:ring-2 focus:ring-blue-500 outline-none text-[var(--text-color)]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-[var(--surface-color)] text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 border border-[var(--border-color)]'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                    {filteredProducts.map(product => {
                        const activePromo = getActivePromotion(product.id);
                        return (
                            <button
                                key={product.id}
                                onClick={() => addToCart(product)}
                                className="bg-[var(--surface-color)] p-4 rounded-xl border border-[var(--border-color)] hover:border-blue-500 hover:shadow-lg transition-all text-left flex flex-col justify-between group h-36 relative overflow-hidden"
                            >
                                {activePromo && (
                                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold">
                                        {activePromo.type === 'PERCENTAGE' ? `-${activePromo.value}%` : `-${activePromo.value} OFF`}
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-semibold text-[var(--text-color)] line-clamp-2">{product.name}</h4>
                                    <p className="text-sm text-gray-500 mt-1">{product.category}</p>
                                </div>
                                <div className="flex justify-between items-end mt-2">
                                    <div className="flex flex-col">
                                        {activePromo ? (
                                            <>
                                                <span className="text-xs text-gray-400 line-through">{formatCurrency(product.price)}</span>
                                                <span className="font-bold text-red-500">
                                                    {formatCurrency(activePromo.type === 'PERCENTAGE'
                                                        ? product.price * (1 - activePromo.value / 100)
                                                        : product.price - activePromo.value
                                                    )}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="font-bold text-blue-500">{formatCurrency(product.price)}</span>
                                        )}
                                    </div>
                                    {product.isDepositEnabled && (
                                        <span className="text-[10px] px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-full">
                                            +Deposit
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Cart Section */}
            <Card className="w-full lg:w-[450px] flex flex-col h-[calc(100vh-8rem)] lg:h-auto border-0 lg:border shadow-none lg:shadow-xl p-0 lg:p-0 overflow-hidden bg-[var(--surface-color)]">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-[var(--border-color)]">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-[var(--text-color)]">
                        <div className="icon-shopping-cart w-5 h-5"></div>
                        Current Order
                    </h3>
                </div>

                {/* Cart Header Grid */}
                <div className="grid grid-cols-12 gap-1 px-4 py-2 bg-[var(--bg-color)] text-xs text-gray-500 font-medium border-b border-[var(--border-color)]">
                    <div className="col-span-5">Item</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-2 text-right">Disc</div>
                    <div className="col-span-3 text-right">Total</div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {cartWithCalculations.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <div className="icon-shopping-bag w-12 h-12 mb-2 opacity-20"></div>
                            <p>Cart is empty</p>
                        </div>
                    ) : (
                        cartWithCalculations.map((item) => (
                            <div key={item.cartId} className="bg-[var(--bg-color)] p-2 rounded-lg border border-[var(--border-color)] relative">
                                <div className="grid grid-cols-12 gap-1 items-center mb-2">
                                    <div className="col-span-5 leading-tight">
                                        <div className="font-medium text-[var(--text-color)] text-sm">{item.name}</div>
                                        <div className="text-[10px] text-gray-500">@{formatCurrency(item.price)}</div>
                                    </div>
                                    <div className="col-span-2 flex items-center justify-center gap-1">
                                        <button
                                            onClick={() => updateCartItem(item.cartId, { qty: Math.max(1, item.qty - 1) })}
                                            className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 text-xs"
                                        >
                                            -
                                        </button>
                                        <span className="font-bold w-4 text-center text-[var(--text-color)] text-sm">{item.qty}</span>
                                        <button
                                            onClick={() => updateCartItem(item.cartId, { qty: item.qty + 1 })}
                                            className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 text-xs"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <div className="col-span-2 text-right text-xs text-red-500">
                                        {item.discountAmount > 0 ? `-${formatCurrency(item.discountAmount).replace('LKR', '')}` : '-'}
                                    </div>
                                    <div className="col-span-3 text-right font-bold text-[var(--text-color)] text-sm">
                                        {formatCurrency(item.lineTotalAfterDiscount + item.lineDeposit).replace('LKR', '')}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mt-1 border-t border-[var(--border-color)] pt-1">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => removeFromCart(item.cartId)}
                                            className="text-red-500 hover:bg-red-50 p-1 rounded"
                                            title="Remove Item"
                                        >
                                            <div className="icon-trash w-3 h-3"></div>
                                        </button>

                                        {item.appliedPromo && (
                                            <button
                                                onClick={() => togglePromoForLine(item.cartId)}
                                                className={`text-[10px] px-2 py-0.5 rounded border ${removedPromos[item.cartId]
                                                    ? 'border-gray-300 text-gray-400 line-through'
                                                    : 'border-red-200 bg-red-50 text-red-600'
                                                    }`}
                                                title="Toggle Promotion"
                                            >
                                                {item.appliedPromo.name} {removedPromos[item.cartId] ? '(OFF)' : '(ON)'}
                                            </button>
                                        )}
                                    </div>

                                    {item.isDepositEnabled && (
                                        <button
                                            onClick={() => toggleDepositMode(item.cartId)}
                                            className={`text-[10px] px-2 py-0.5 rounded transition-colors ${item.depositMode === 'CHARGE'
                                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                }`}
                                        >
                                            {item.depositMode === 'CHARGE' ? '+Dep' : 'Exch'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 bg-[var(--surface-color)] border-t border-[var(--border-color)] space-y-1">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subtotal</span>
                        <span>{formatCurrency(subtotalBeforeDiscount)}</span>
                    </div>
                    {totalDiscount > 0 && (
                        <div className="flex justify-between text-sm text-red-500 font-medium">
                            <span>Total Discount</span>
                            <span>- {formatCurrency(totalDiscount)}</span>
                        </div>
                    )}

                    {/* Service Charge Section */}
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-[var(--border-color)]">
                        <label className="text-gray-600 dark:text-gray-300">Service Charge</label>
                        <div className="flex items-center gap-2">
                            {currentUser?.role === 'admin' ? (
                                <>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        value={String(serviceChargeRate)}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '' || val === '-') {
                                                setServiceChargeRate(0);
                                            } else {
                                                setServiceChargeRate(parseFloat(val) || 0);
                                            }
                                        }}
                                        onBlur={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            updatePOSSettings(val, taxRate);
                                        }}
                                        onFocus={(e) => e.target.select()}
                                        className="w-16 px-2 py-1 text-sm rounded bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-color)] text-center outline-none focus:ring-2 focus:ring-blue-500"
                                        title="Admin Only: Edit service charge"
                                    />
                                    <span className="text-xs text-gray-500">%</span>
                                </>
                            ) : (
                                <>
                                    <span className="w-16 text-center font-medium text-[var(--text-color)]">{serviceChargeRate}</span>
                                    <span className="text-xs text-gray-500">%</span>
                                </>
                            )}
                            <span className="text-sm font-medium">+ {formatCurrency(serviceChargeAmount)}</span>
                        </div>
                    </div>

                    {/* Tax Section */}
                    <div className="flex justify-between items-center text-sm">
                        <label className="text-gray-600 dark:text-gray-300">Tax</label>
                        <div className="flex items-center gap-2">
                            {currentUser?.role === 'admin' ? (
                                <>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        value={String(taxRate)}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '' || val === '-') {
                                                setTaxRate(0);
                                            } else {
                                                setTaxRate(parseFloat(val) || 0);
                                            }
                                        }}
                                        onBlur={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            updatePOSSettings(serviceChargeRate, val);
                                        }}
                                        onFocus={(e) => e.target.select()}
                                        className="w-16 px-2 py-1 text-sm rounded bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-color)] text-center outline-none focus:ring-2 focus:ring-blue-500"
                                        title="Admin Only: Edit tax"
                                    />
                                    <span className="text-xs text-gray-500">%</span>
                                </>
                            ) : (
                                <>
                                    <span className="w-16 text-center font-medium text-[var(--text-color)]">{taxRate}</span>
                                    <span className="text-xs text-gray-500">%</span>
                                </>
                            )}
                            <span className="text-sm font-medium">+ {formatCurrency(taxAmount)}</span>
                        </div>
                    </div>

                    {depositTotal > 0 && (
                        <div className="flex justify-between text-sm text-yellow-600 dark:text-yellow-400">
                            <span>Deposits</span>
                            <span>+ {formatCurrency(depositTotal)}</span>
                        </div>
                    )}

                    <div className="flex justify-between items-end pt-2 border-t border-[var(--border-color)] mt-2">
                        <span className="text-gray-500 font-medium">Total Payable</span>
                        <span className="text-2xl font-bold text-[var(--text-color)]">{formatCurrency(cartTotal)}</span>
                    </div>

                    <Button
                        onClick={() => setShowPaymentModal(true)}
                        className="w-full py-3 text-lg mt-2"
                        disabled={cart.length === 0}
                    >
                        Checkout
                    </Button>
                </div>
            </Card>

            {/* Payment Modal */}
            <Modal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                title="Payment & Checkout"
            >
                <div className="space-y-6">
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <p className="text-sm text-gray-500 mb-1">Total Amount Due</p>
                        <h2 className="text-3xl font-bold text-[var(--text-color)]">{formatCurrency(cartTotal)}</h2>
                    </div>

                    <div className="space-y-3">
                        {payments.map((payment) => (
                            <div key={payment.id} className="flex gap-2">
                                <select
                                    value={payment.method}
                                    onChange={(e) => updatePayment(payment.id, 'method', e.target.value)}
                                    className="px-3 py-2 rounded-lg bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-color)] outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="Card">Card</option>
                                    <option value="Online Transfer">Online</option>
                                </select>
                                <input
                                    type="number"
                                    placeholder="Amount"
                                    value={payment.amount}
                                    onChange={(e) => updatePayment(payment.id, 'amount', e.target.value)}
                                    className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-color)] outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {payments.length > 1 && (
                                    <button
                                        onClick={() => removePaymentRow(payment.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                    >
                                        <div className="icon-trash w-5 h-5"></div>
                                    </button>
                                )}
                            </div>
                        ))}

                        <button
                            onClick={addPaymentRow}
                            className="text-sm text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1"
                        >
                            <div className="icon-plus w-4 h-4"></div> Add Split Payment
                        </button>
                    </div>

                    <div className="border-t border-[var(--border-color)] pt-4">
                        <div className="flex justify-between mb-4">
                            <span className="text-gray-500">Balance</span>
                            <span className={`font-bold ${balanceDue > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                {formatCurrency(balanceDue)}
                            </span>
                        </div>
                        {changeDue > 0 && (
                            <div className="flex justify-between mb-4 bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                                <span className="text-green-800 dark:text-green-200 font-bold">CHANGE DUE</span>
                                <span className="font-bold text-green-800 dark:text-green-200 text-xl">{formatCurrency(changeDue)}</span>
                            </div>
                        )}

                        <Button
                            onClick={processSale}
                            className="w-full"
                            disabled={balanceDue > 1}
                        >
                            <div className="icon-printer w-5 h-5"></div>
                            Complete & Print Receipt
                        </Button>
                    </div>
                </div>
            </Modal>
            {/* Receipt Template - Hidden by default, shown only during printing */}
            <div id="receipt-template">
                {receiptData && (
                    <div style={{
                        width: '80mm',
                        padding: '4mm',
                        fontFamily: "'Courier New', monospace",
                        fontSize: '10pt',
                        color: '#000',
                        background: '#fff'
                    }}>
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                            <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '10pt' }}>[ LOGO ]</div>
                            <h1 style={{ fontSize: '11pt', fontWeight: 'bold', margin: '0', textTransform: 'uppercase' }}>Pub Cinnamon</h1>
                        </div>

                        {/* Info Section */}
                        <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed #000' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt', marginBottom: '4px' }}>
                                <span>Date: {new Date(receiptData.date).toLocaleDateString()}</span>
                                <span>Time: {new Date(receiptData.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt' }}>
                                <span>Invoice: {receiptData.id}</span>
                                <span>Cashier: {receiptData.user || 'Admin'}</span>
                            </div>
                        </div>

                        {/* Item Table */}
                        <table style={{ width: '100%', fontSize: '9pt', marginBottom: '8px', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px dashed #000' }}>
                                    <th style={{ textAlign: 'left', paddingBottom: '4px', fontWeight: 'normal' }}>Item</th>
                                    <th style={{ textAlign: 'center', paddingBottom: '4px', fontWeight: 'normal' }}>Qty</th>
                                    <th style={{ textAlign: 'right', paddingBottom: '4px', fontWeight: 'normal' }}>Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {receiptData.items.map((item, idx) => (
                                    <React.Fragment key={idx}>
                                        <tr>
                                            <td style={{ textAlign: 'left', paddingTop: '4px' }}>{item.name.substring(0, 25)}</td>
                                            <td style={{ textAlign: 'center', paddingTop: '4px' }}>{item.qty}</td>
                                            <td style={{ textAlign: 'right', paddingTop: '4px' }}>{formatCurrency(item.lineTotalRaw).replace('LKR', '').trim()}</td>
                                        </tr>
                                        {item.discountAmount > 0 && (
                                            <tr>
                                                <td colSpan="3" style={{ textAlign: 'right', fontSize: '8pt', fontStyle: 'italic' }}>
                                                    (Disc: -{formatCurrency(item.discountAmount).replace('LKR', '').trim()})
                                                </td>
                                            </tr>
                                        )}
                                        {item.isDepositEnabled && item.depositMode === 'CHARGE' && (
                                            <tr>
                                                <td colSpan="3" style={{ textAlign: 'right', fontSize: '8pt' }}>
                                                    + Deposit: {formatCurrency(item.lineDeposit).replace('LKR', '').trim()}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>

                        {/* Summary Section */}
                        <div style={{ borderBottom: '1px dashed #000', paddingTop: '4px', marginBottom: '8px' }}></div>
                        <div style={{ fontSize: '9pt', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span>Subtotal</span>
                                <span>{formatCurrency(receiptData.subtotal).replace('LKR', '').trim()}</span>
                            </div>
                            {receiptData.discountTotal > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span>Discount</span>
                                    <span>-{formatCurrency(receiptData.discountTotal).replace('LKR', '').trim()}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span>Service Charge ({receiptData.serviceChargeRate}%)</span>
                                <span>{formatCurrency(receiptData.serviceCharge).replace('LKR', '').trim()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span>Tax ({receiptData.taxRate}%)</span>
                                <span>{formatCurrency(receiptData.tax).replace('LKR', '').trim()}</span>
                            </div>
                            {receiptData.depositTotal > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Deposits</span>
                                    <span>{formatCurrency(receiptData.depositTotal).replace('LKR', '').trim()}</span>
                                </div>
                            )}
                        </div>

                        {/* Total Row */}
                        <div style={{ borderBottom: '1px dashed #000', paddingTop: '8px', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '11pt' }}>
                                <span>TOTAL</span>
                                <span>{formatCurrency(receiptData.total)}</span>
                            </div>
                        </div>

                        {/* Payments Section */}
                        <div style={{ borderBottom: '1px dashed #000', paddingTop: '4px', marginBottom: '8px' }}>
                            {receiptData.payments.map((p, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt', marginBottom: '4px' }}>
                                    <span>{p.method}</span>
                                    <span>{formatCurrency(p.amount)}</span>
                                </div>
                            ))}
                            {receiptData.change > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt', fontWeight: 'bold' }}>
                                    <span>CHANGE</span>
                                    <span>{formatCurrency(receiptData.change)}</span>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{ textAlign: 'center', fontSize: '9pt', marginTop: '8px', paddingTop: '8px' }}>
                            <p style={{ margin: '2px 0' }}>Thank You For Dining With Us!</p>
                            <p style={{ margin: '2px 0' }}>Please Come Again</p>
                        </div>

                        {/* PANDAN LABS Footer */}
                        <div style={{ borderTop: '1px solid #000', paddingTop: '8px', marginTop: '8px', textAlign: 'center', fontSize: '8pt' }}>
                            <p style={{ margin: '4px 0' }}>System Design and Developed by <br /> PANDAN LABS | +94 70 693 2532</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white animate-[slideIn_0.3s_ease-out] z-40 ${notification.type === 'error' ? 'bg-red-500' : notification.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                    }`}>
                    {notification.message}
                </div>
            )}

            {/* Payment Success Modal */}
            {showPaymentSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center max-w-sm w-full animate-[fadeIn_0.3s_ease-out]">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <div className="icon-check w-8 h-8 text-green-600 dark:text-green-400"></div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payment Successful!</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">Your receipt has been printed successfully.</p>
                        <button
                            onClick={() => setShowPaymentSuccess(false)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}