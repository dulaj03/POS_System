function Button({ children, onClick, variant = 'primary', className = '', disabled = false, ...props }) {
    const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variants = {
        primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30",
        success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30",
        danger: "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30",
        secondary: "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600",
        outline: "border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
    };

    return (
        <button 
            onClick={onClick} 
            className={`${baseStyle} ${variants[variant]} ${className}`}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
}