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
            } else if (type === 'RETURN_TO_SUPPLIER') {
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
            return await API.setPOSSettings(serviceChargeRate, taxRate);
        } catch (error) {
            console.error('Error saving POS settings:', error);
            throw error;
        }
    }
};

// Run init
Storage.init();