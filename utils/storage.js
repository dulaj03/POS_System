// Storage Layer - Now using API with MySQL backend
// Maintains same interface for React components
// API is called asynchronously, components handle async/await

const Storage = {
    // Initialize - no longer needed but kept for compatibility
    init: () => {
        console.log('Storage initialized - using MySQL backend via API');
    },

    // ===== PRODUCTS =====
    getProducts: async () => {
        try {
            const result = await API.getProducts();
            // Ensure result is always an array
            if (!Array.isArray(result)) {
                console.warn('API.getProducts() returned non-array:', typeof result);
                return [];
            }
            return result;
        } catch (error) {
            console.error('Error fetching products:', error.message);
            return [];
        }
    },

    saveProducts: async (products) => {
        try {
            // First get current products from database to check which are new
            const existingProducts = await API.getProducts();
            const existingIds = new Set(existingProducts.map(p => p.id));

            // Handle each product - add new ones, update existing ones
            for (let product of products) {
                if (existingIds.has(product.id)) {
                    // Existing product - update it
                    await API.updateProduct(product);
                } else {
                    // New product - add it
                    await API.addProduct(product);
                }
            }
        } catch (error) {
            console.error('Error saving products:', error.message);
        }
    },

    deleteProduct: async (id) => {
        try {
            const result = await API.deleteProduct(id);
            return result;
        } catch (error) {
            console.error('Error archiving product:', error);
            throw error;
        }
    },

    addProduct: async (product) => {
        try {
            return await API.addProduct(product);
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    },

    updateProduct: async (product) => {
        try {
            return await API.updateProduct(product);
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    },

    getLowStockProducts: async (threshold = 20) => {
        try {
            console.log('[Storage] Fetching low stock products with threshold:', threshold);
            const result = await API.getLowStockProducts(threshold);
            // Ensure result is always an array
            if (!Array.isArray(result)) {
                console.warn('API.getLowStockProducts() returned non-array:', typeof result);
                return [];
            }
            console.log('[Storage] Returning', result.length, 'low stock products');
            return result;
        } catch (error) {
            console.error('Error fetching low stock products:', error.message);
            return [];
        }
    },

    // ===== SALES =====
    getSales: async () => {
        try {
            console.log('[Storage] Calling API.getSales()');
            const result = await API.getSales();
            console.log('[Storage] API.getSales() returned:', result);
            // Ensure result is always an array
            if (!Array.isArray(result)) {
                console.warn('[Storage] API.getSales() returned non-array:', typeof result, result);
                return [];
            }
            console.log('[Storage] Returning', result.length, 'sales');
            return result;
        } catch (error) {
            console.error('[Storage] Error fetching sales:', error.message);
            return [];
        }
    },

    getSalesByUser: async (userId) => {
        try {
            console.log('[Storage] Calling API.getSalesByUser() for user:', userId);
            const result = await API.getSalesByUser(userId);
            console.log('[Storage] API.getSalesByUser() returned:', result);
            // Ensure result is always an array
            if (!Array.isArray(result)) {
                console.warn('[Storage] API.getSalesByUser() returned non-array:', typeof result, result);
                return [];
            }
            console.log('[Storage] Returning', result.length, 'sales for user', userId);
            return result;
        } catch (error) {
            console.error('[Storage] Error fetching sales by user:', error.message);
            return [];
        }
    },

    addSale: async (sale) => {
        try {
            return await API.addSale(sale);
        } catch (error) {
            console.error('Error adding sale:', error);
            throw error;
        }
    },

    // ===== EMPTY BOTTLES =====
    getEmptyBottles: async () => {
        try {
            const result = await API.getEmptyBottles();
            // Ensure result has the expected structure
            if (!result || typeof result !== 'object') {
                console.warn('API.getEmptyBottles() returned invalid data:', typeof result);
                return { totalInHand: 0, history: [] };
            }
            // Ensure it has required properties
            return {
                totalInHand: result.totalInHand || 0,
                history: Array.isArray(result.history) ? result.history : []
            };
        } catch (error) {
            console.error('Error fetching empty bottles:', error.message);
            return { totalInHand: 0, history: [] };
        }
    },

    updateEmptyBottles: async (type, quantity, cost = 0) => {
        try {
            if (type === 'PURCHASE') {
                return await API.purchaseBottles(quantity, cost);
            } else if (type === 'RETURN_TO_SUPPLIER' || type === 'OUT') {
                return await API.returnBottles(quantity);
            }
        } catch (error) {
            console.error('Error updating empty bottles:', error);
        }
    },

    // ===== SUPPLIER PAYMENTS =====
    getSupplierPayments: async () => {
        try {
            const result = await API.getSupplierPayments();
            // Ensure result is always an array
            if (!Array.isArray(result)) {
                console.warn('API.getSupplierPayments() returned non-array:', typeof result);
                return [];
            }
            return result;
        } catch (error) {
            console.error('Error fetching supplier payments:', error.message);
            return [];
        }
    },

    addSupplierPayment: async (payment) => {
        try {
            return await API.addSupplierPayment(payment);
        } catch (error) {
            console.error('Error adding supplier payment:', error);
            throw error;
        }
    },

    // ===== THEME =====
    getTheme: async () => {
        try {
            return await API.getTheme();
        } catch (error) {
            console.error('Error fetching theme:', error);
            return 'dark';
        }
    },

    setTheme: async (theme) => {
        try {
            return await API.setTheme(theme);
        } catch (error) {
            console.error('Error setting theme:', error);
        }
    },

    // ===== USERS =====
    getUsers: async () => {
        try {
            const result = await API.getUsers();
            if (!Array.isArray(result)) {
                console.warn('API.getUsers() returned non-array:', typeof result);
                return [];
            }
            return result;
        } catch (error) {
            console.error('Error fetching users:', error.message);
            return [];
        }
    },

    saveUsers: async (users) => {
        try {
            // Get existing users from database
            const existingUsers = await API.getUsers();
            const existingIds = new Set(existingUsers.map(u => u.id));

            for (let user of users) {
                if (existingIds.has(user.id)) {
                    // User exists - update it
                    await API.updateUser(user);
                } else {
                    // New user - add it
                    await API.addUser(user);
                }
            }
        } catch (error) {
            throw error;
        }
    },

    addUser: async (user) => {
        try {
            return await API.addUser(user);
        } catch (error) {
            console.error('Error adding user:', error);
            throw error;
        }
    },

    updateUser: async (user) => {
        try {
            return await API.updateUser(user);
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    },

    deleteUser: async (id) => {
        try {
            await API.deleteUser(id);
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    },

    validateUser: async (pin) => {
        try {
            return await API.validatePin(pin);
        } catch (error) {
            console.error('Error validating user:', error);
            return null;
        }
    },

    // ===== PROMOTIONS =====
    getPromotions: async () => {
        try {
            const result = await API.getPromotions();
            if (!Array.isArray(result)) {
                console.warn('API.getPromotions() returned non-array:', typeof result);
                return [];
            }
            return result;
        } catch (error) {
            console.error('Error fetching promotions:', error.message);
            return [];
        }
    },

    addPromotion: async (promo) => {
        try {
            return await API.addPromotion(promo);
        } catch (error) {
            console.error('Error adding promotion:', error);
            throw error;
        }
    },

    updatePromotion: async (promo) => {
        try {
            return await API.updatePromotion(promo);
        } catch (error) {
            console.error('Error updating promotion:', error);
            throw error;
        }
    },

    savePromotions: async (promotions) => {
        try {
            for (let promo of promotions) {
                if (promo.id && promo.id.startsWith('promo')) {
                    await API.updatePromotion(promo);
                } else {
                    await API.addPromotion(promo);
                }
            }
        } catch (error) {
            console.error('Error saving promotions:', error);
        }
    },

    deletePromotion: async (id) => {
        try {
            await API.deletePromotion(id);
        } catch (error) {
            console.error('Error deleting promotion:', error);
        }
    },

    // ===== POS SETTINGS =====
    getPOSSettings: async () => {
        try {
            return await API.getPOSSettings();
        } catch (error) {
            console.error('Error fetching POS settings:', error);
            return { service_charge_rate: 10, tax_rate: 8 };
        }
    },

    setPOSSettings: async (serviceChargeRate, taxRate) => {
        try {
            console.log('[Storage] Saving POS settings:', { serviceChargeRate, taxRate });
            const result = await API.setPOSSettings(serviceChargeRate, taxRate);
            console.log('[Storage] API response after save:', result);
            return result;
        } catch (error) {
            console.error('Error saving POS settings:', error);
            throw error;
        }
    },

    // ===== CART PERSISTENCE =====
    // Save ongoing bill to sessionStorage so it survives navigation
    // IMPORTANT: Carts are stored per user to ensure isolation between cashiers
    savePOSCart: (cart, removedPromos, payments, serviceChargeRate, taxRate, userId) => {
        try {
            const cartData = {
                cart,
                removedPromos,
                payments,
                serviceChargeRate,
                taxRate,
                userId,
                timestamp: Date.now()
            };
            const key = `pos_cart_data_${userId}`;
            sessionStorage.setItem(key, JSON.stringify(cartData));
            console.log('[Storage] POS cart saved for user', userId);
        } catch (error) {
            console.error('Error saving POS cart:', error);
        }
    },

    // Restore ongoing bill from sessionStorage
    // Only restores cart if it belongs to the current user
    loadPOSCart: (userId) => {
        try {
            const key = `pos_cart_data_${userId}`;
            const cartData = sessionStorage.getItem(key);
            if (cartData) {
                const parsed = JSON.parse(cartData);
                // Verify the cart belongs to this user (security check)
                if (parsed.userId === userId) {
                    console.log('[Storage] POS cart restored for user', userId, 'with', parsed.cart.length, 'items');
                    return parsed;
                } else {
                    console.warn('[Storage] Cart user mismatch - clearing invalid cart');
                    sessionStorage.removeItem(key);
                    return null;
                }
            }
            return null;
        } catch (error) {
            console.error('Error loading POS cart:', error);
            return null;
        }
    },

    // Clear saved cart data (after payment completed or logout)
    clearPOSCart: (userId) => {
        try {
            const key = `pos_cart_data_${userId}`;
            sessionStorage.removeItem(key);
            console.log('[Storage] POS cart cleared for user', userId);
        } catch (error) {
            console.error('Error clearing POS cart:', error);
        }
    },

    // Clear all carts on logout (security)
    clearAllPOSCarts: () => {
        try {
            const keys = Object.keys(sessionStorage);
            keys.forEach(key => {
                if (key.startsWith('pos_cart_data_')) {
                    sessionStorage.removeItem(key);
                }
            });
            console.log('[Storage] All POS carts cleared on logout');
        } catch (error) {
            console.error('Error clearing all POS carts:', error);
        }
    }
};

// Run init
Storage.init();