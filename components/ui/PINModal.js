// PIN Verification Modal Component
// Used to verify admin PIN before granting cashiers access to restricted features

function PINModal({ isOpen, onClose, onVerify, title = "Verify Admin PIN", message = "Enter admin PIN to continue" }) {
    const [pin, setPin] = React.useState('');
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const inputRef = React.useRef(null);

    // Handle keyboard input
    React.useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            // Number keys (0-9)
            if (/^\d$/.test(e.key)) {
                e.preventDefault();
                if (pin.length < 4) {
                    setPin(prev => prev + e.key);
                    setError('');
                }
            }
            // Backspace or C to clear
            else if (e.key === 'Backspace' || e.key.toLowerCase() === 'c') {
                e.preventDefault();
                setPin('');
                setError('');
            }
            // Enter to verify
            else if (e.key === 'Enter') {
                e.preventDefault();
                if (pin.length === 4) {
                    handleVerify();
                }
            }
            // Escape to cancel
            else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, pin]);

    const handleVerify = async () => {
        if (!pin || pin.length < 4) {
            setError('PIN must be 4 digits');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Validate the PIN against admin users
            const result = await API.validateAdminPin(pin);
            if (result && result.success) {
                onVerify(result);
                resetModal();
            } else {
                setError('Invalid admin PIN');
                setPin('');
            }
        } catch (err) {
            setError(err.message || 'Invalid admin PIN');
            setPin('');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        resetModal();
        onClose();
    };

    const resetModal = () => {
        setPin('');
        setError('');
    };

    const handleNumpadClick = (num) => {
        if (num === 'C') {
            setPin('');
            setError('');
        } else if (num === 'Go') {
            handleVerify();
        } else if (pin.length < 4) {
            setPin(prev => prev + num);
            setError('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md p-8">
                <h2 className="text-2xl font-bold mb-2 text-[var(--text-color)]">{title}</h2>
                <p className="text-gray-500 mb-6">{message}</p>

                <div className="mb-6">
                    <div className="text-center text-4xl tracking-widest p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] font-bold">
                        {'●'.repeat(pin.length)}{pin.length < 4 ? '○'.repeat(4 - pin.length) : ''}
                    </div>
                    <p className="text-center text-xs text-gray-400 mt-2">Use keyboard or touch buttons</p>
                    {error && <p className="text-red-500 text-center mt-3">{error}</p>}
                </div>

                <div className="grid grid-cols-3 gap-2 mb-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'Go'].map(btn => (
                        <button
                            type="button"
                            key={btn}
                            onClick={() => handleNumpadClick(btn)}
                            disabled={loading}
                            className={`p-4 rounded-xl font-bold text-xl transition-colors disabled:opacity-50 ${btn === 'Go' ? 'bg-blue-600 text-white hover:bg-blue-700 col-span-1' :
                                btn === 'C' ? 'bg-red-100 text-red-600 hover:bg-red-200' :
                                    'bg-[var(--surface-color)] border border-[var(--border-color)] text-[var(--text-color)] hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                        >
                            {btn}
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleCancel}
                    className="w-full p-3 rounded-xl border border-[var(--border-color)] text-[var(--text-color)] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    Cancel
                </button>
            </Card>
        </div>
    );
}
