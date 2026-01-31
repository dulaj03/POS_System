// API Service Layer for React
// File: utils/api.js

// Use relative path based on current directory
// This works on localhost AND cPanel (no hardcoded domains)
const API_BASE_URL = './api';

// Helper function for API calls
const apiCall = async (endpoint, method = 'GET', data = null) => {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
        options.body = JSON.stringify(data);
    }

    try {
        console.log(`[API] Calling ${method} ${endpoint}`, data ? 'with data' : '');
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);

        console.log(`[API] Response status for ${endpoint}:`, response.status, response.statusText);

        if (!response.ok) {
            try {
                const errorData = await response.json();
                console.log(`[API] Error response data:`, errorData);
                throw new Error(errorData.error || `API Error: ${response.status}`);
            } catch (e) {
                // If response isn't JSON, throw generic error
                console.log(`[API] Error is not JSON, raw response:`, e);
                throw new Error(`API Error ${response.status}: ${response.statusText}`);
            }
        }

        const jsonData = await response.json();
        console.log(`[API] Response data for ${endpoint}:`, jsonData);
        return jsonData;
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error.message);
        console.error('Full error:', error);
        throw error;
    }
};

const API = {
    // ===== USERS =====
    getUsers: () => apiCall('users.php?action=all'),
    validatePin: (pin) => apiCall(`users.php?action=validate&pin=${encodeURIComponent(pin)}`),
    validateAdminPin: (pin) => apiCall(`users.php?action=validate_admin&pin=${encodeURIComponent(pin)}`),
    addUser: (user) => apiCall('users.php?action=add', 'POST', user),
    updateUser: (user) => apiCall('users.php?action=update', 'PUT', user),
    deleteUser: (userId) => apiCall('users.php?action=delete', 'DELETE', { id: userId }),

    // ===== PRODUCTS =====
    getProducts: () => apiCall('products.php?action=all'),
    addProduct: (product) => apiCall('products.php?action=add', 'POST', product),
    updateProduct: (product) => apiCall('products.php?action=update', 'PUT', product),
    deleteProduct: (productId) => apiCall('products.php?action=delete', 'DELETE', { id: productId }),
    updateProductStock: (productId, stock) =>
        apiCall('products.php?action=update_stock', 'PUT', { id: productId, stock }),
    getLowStockProducts: (threshold = 20) => {
        console.log('[API] Fetching low stock products (threshold:', threshold, ')...');
        return apiCall(`products.php?action=low_stock&threshold=${threshold}`);
    },

    // ===== PROMOTIONS =====
    getPromotions: () => apiCall('promotions.php?action=all'),
    addPromotion: (promotion) => apiCall('promotions.php?action=add', 'POST', promotion),
    updatePromotion: (promotion) => apiCall('promotions.php?action=update', 'PUT', promotion),
    deletePromotion: (promotionId) => apiCall('promotions.php?action=delete', 'DELETE', { id: promotionId }),

    // ===== SALES =====
    getSales: () => {
        console.log('[API] Fetching all sales...');
        return apiCall('sales.php?action=all');
    },
    getSalesByUser: (userId) => {
        console.log('[API] Fetching sales for user:', userId);
        return apiCall(`sales.php?action=by_user&user_id=${encodeURIComponent(userId)}`);
    },
    getSalesByCategory: (category, startDate, endDate) => {
        console.log('[API] Fetching sales for category:', category);
        let endpoint = `sales.php?action=by_category&category=${encodeURIComponent(category)}`;
        if (startDate && endDate) {
            endpoint += `&start_date=${startDate}&end_date=${endDate}`;
        }
        return apiCall(endpoint);
    },
    getSalesCategories: () => {
        console.log('[API] Fetching sales categories...');
        return apiCall('sales.php?action=categories');
    },
    addSale: (sale) => {
        console.log('[API] Adding sale with date:', sale.date);
        return apiCall('sales.php?action=add', 'POST', sale);
    },

    // ===== EMPTY BOTTLES =====
    getEmptyBottles: () => apiCall('bottles.php?action=all'),
    purchaseBottles: (quantity, cost) =>
        apiCall('bottles.php?action=purchase', 'POST', { quantity, cost }),
    returnBottles: (quantity) =>
        apiCall('bottles.php?action=return', 'POST', { quantity }),

    // ===== SUPPLIER PAYMENTS =====
    getSupplierPayments: async () => {
        const response = await apiCall('suppliers.php?action=all-payments');
        // Handle new response format: {success: true, data: [...]}
        if (response.success && Array.isArray(response.data)) {
            return response.data;
        }
        // Handle old response format for backwards compatibility
        return Array.isArray(response) ? response : [];
    },
    addSupplierPayment: async (payment) => {
        const response = await apiCall('suppliers.php?action=add-payment', 'POST', payment);
        if (response.success && response.data) {
            return response.data;
        }
        return response;
    },

    // ===== COMMISSIONS =====
    getAllCommissions: () => {
        console.log('[API] Fetching all commissions...');
        return apiCall('commissions.php?action=all');
    },
    getUserCommission: (userId, month) => {
        console.log('[API] Fetching commission for user:', userId);
        let endpoint = `commissions.php?action=by_user&user_id=${encodeURIComponent(userId)}`;
        if (month) {
            endpoint += `&month=${month}`;
        }
        return apiCall(endpoint);
    },
    saveCommission: (userId, commissionPercentage, month) => {
        console.log('[API] Saving commission for user:', userId);
        return apiCall('commissions.php?action=save', 'POST', {
            user_id: userId,
            commission_percentage: commissionPercentage,
            month: month || new Date().toISOString().split('T')[0].substring(0, 7) + '-01'
        });
    },
    deleteCommission: (userId, month) => {
        console.log('[API] Deleting commission for user:', userId);
        return apiCall('commissions.php?action=delete', 'DELETE', {
            user_id: userId,
            month: month || new Date().toISOString().split('T')[0].substring(0, 7) + '-01'
        });
    },

    // ===== SETTINGS =====
    getTheme: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/settings.php?action=get_theme`);
            if (response.ok) {
                const data = await response.json();
                return data.theme || 'dark';
            }
        } catch (error) {
            console.log('Using default theme');
        }
        return 'dark';
    },
    setTheme: (theme) => apiCall('settings.php?action=set_theme', 'POST', { theme }),

    // Get POS settings (service charge and tax rates)
    getPOSSettings: () => apiCall('settings.php?action=get_pos_settings'),

    // Set POS settings (service charge and tax rates)
    setPOSSettings: (serviceChargeRate, taxRate) =>
        apiCall('settings.php?action=set_pos_settings', 'POST', {
            service_charge_rate: serviceChargeRate,
            tax_rate: taxRate
        })
};

// Fallback Storage for offline support (optional)
const StorageFallback = {
    init: () => {
        // Initialize with data from API if available
        console.log('API Service initialized');
    }
};

// Export both API and fallback
window.API = API;
