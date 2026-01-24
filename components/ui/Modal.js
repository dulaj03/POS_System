function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-[var(--surface-color)] rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
                    <h3 className="text-xl font-bold text-[var(--text-color)]">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                        <div className="icon-x w-6 h-6"></div>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[80vh]">
                    {children}
                </div>
            </div>
        </div>
    );
}