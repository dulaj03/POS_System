function Card({ children, className = '', ...props }) {
    return (
        <div 
            className={`bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl shadow-sm p-6 ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}