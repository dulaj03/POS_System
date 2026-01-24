const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 2
    }).format(amount);
};

const formatDate = (dateString) => {
    if (!dateString) return '';

    // For strings from PHP (already in Sri Lanka time), just format directly
    // Don't convert through Date object to avoid timezone interpretation issues
    // Format: "2026-01-24 12:18:00"
    if (typeof dateString === 'string') {
        const [datePart, timePart] = dateString.split(' ');
        if (datePart && timePart) {
            // Parse date components
            const [year, month, day] = datePart.split('-');
            // Create date in local timezone
            const date = new Date(year, parseInt(month) - 1, day);
            // Format the date with locale
            const formatted = date.toLocaleDateString('en-LK');
            // Return formatted date with original time
            return `${formatted}, ${timePart}`;
        }
    }

    // For timestamp numbers, convert directly
    if (typeof dateString === 'number') {
        return new Date(dateString).toLocaleString('en-LK');
    }

    return dateString;
};

const generateReceiptId = () => {
    // Generate invoice ID as INV-YYYYMMDD-HHmmss for sortable, unique IDs
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `INV-${year}${month}${day}-${hours}${minutes}${seconds}`;
};