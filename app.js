// Diagnostic logging - helps troubleshoot issues
console.log('=== PUB CINNAMON POS System ===');
console.log('Loading application...');
console.log('API Object available:', typeof API !== 'undefined');
console.log('Storage Object available:', typeof Storage !== 'undefined');

// Important: DO NOT remove this `ErrorBoundary` component.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
    console.log('--- DEBUGGING INFO ---');
    console.log('Storage object type:', typeof Storage);
    console.log('API object type:', typeof API);
    if (error.message.includes('filter')) {
      console.error('ERROR: .filter() called on non-array!');
      console.log('This usually means:');
      console.log('1. A Promise wasn\'t awaited');
      console.log('2. An API call failed');
      console.log('3. Database isn\'t set up');
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Please refresh the page to continue.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function LoginScreen({ onLogin }) {
  const [pin, setPin] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await Storage.validateUser(pin);
      if (user) {
        onLogin(user);
        setPin('');
      } else {
        setError('Invalid PIN');
        setPin('');
      }
    } catch (err) {
      setError(err.message || 'Invalid PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-color)]">
      <Card className="w-full max-w-md p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-600 rounded-xl mx-auto flex items-center justify-center mb-4">
            <span className="text-white font-bold text-3xl">P</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-color)]">PUB CINNAMON</h1>
          <p className="text-gray-500">POS System Login</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <input
              type="password"
              placeholder="Enter PIN Code"
              className="w-full text-center text-3xl tracking-widest p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)] focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
              value={pin}
              onChange={e => { setPin(e.target.value); setError('') }}
              maxLength={4}
              autoFocus
              disabled={loading}
            />
            {error && <p className="text-red-500 text-center mt-2">{error}</p>}
            {loading && <p className="text-blue-500 text-center mt-2">Validating...</p>}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'Go'].map(btn => (
              <button
                type="button"
                key={btn}
                onClick={() => {
                  if (btn === 'Go') handleLogin({ preventDefault: () => { } });
                  else if (btn === 'C') setPin('');
                  else if (btn === 'C') setPin('');
                  else setPin(prev => (prev + btn).slice(0, 4));
                }}
                disabled={loading}
                className={`p-4 rounded-xl font-bold text-xl transition-colors disabled:opacity-50 ${btn === 'Go' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                  btn === 'C' ? 'bg-red-100 text-red-600 hover:bg-red-200' :
                    'bg-[var(--surface-color)] border border-[var(--border-color)] text-[var(--text-color)] hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
              >
                {btn}
              </button>
            ))}
          </div>
        </form>
      </Card>
    </div>
  );
}

function App() {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [currentView, setCurrentView] = React.useState('dashboard');
  const [lastSaleTime, setLastSaleTime] = React.useState(null); // Track when last sale was recorded
  const [inventoryRefreshTime, setInventoryRefreshTime] = React.useState(null); // Track inventory changes
  const [promotionRefreshTime, setPromotionRefreshTime] = React.useState(null); // Track promotion changes
  const [settingsRefreshTime, setSettingsRefreshTime] = React.useState(null); // Track settings changes
  const [sessionWarning, setSessionWarning] = React.useState(false); // Show session expiration warning
  const timeoutRef = React.useRef(null); // Ref to store timeout ID

  const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

  // Restore session from sessionStorage on app load
  React.useEffect(() => {
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        console.log('[Session] Restored user session:', user.name);
      } catch (err) {
        console.error('[Session] Failed to parse saved user:', err);
        sessionStorage.removeItem('currentUser');
      }
    }
  }, []);

  // Reset inactivity timeout on user activity
  const resetTimeout = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (currentUser) {
      timeoutRef.current = setTimeout(() => {
        console.log('[Session] Session timeout - logging out');
        // Clear all POS carts on session timeout for security
        Storage.clearAllPOSCarts();
        setSessionWarning(true);
        setCurrentUser(null);
        sessionStorage.removeItem('currentUser');
      }, SESSION_TIMEOUT);
    }
  }, [currentUser]);

  // Set up activity listeners and initial timeout
  React.useEffect(() => {
    if (!currentUser) return;

    // Reset timeout on various user activities
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetTimeout();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Initial timeout
    resetTimeout();

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentUser, resetTimeout]);

  const handleLogin = (user) => {
    setCurrentUser(user);
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    setSessionWarning(false);
    console.log('[Session] User logged in:', user.name);
  };

  const handleLogout = () => {
    // Clear all POS carts on logout for security
    Storage.clearAllPOSCarts();
    setCurrentUser(null);
    sessionStorage.removeItem('currentUser');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    console.log('[Session] User logged out');
  };

  const handleSaleCompleted = () => {
    // Update timestamp to trigger Dashboard refresh
    setLastSaleTime(Date.now());
  };

  const handleInventoryUpdated = () => {
    // Update timestamp to trigger POS and other inventory-dependent views to refresh
    setInventoryRefreshTime(Date.now());
  };

  const handlePromotionsUpdated = () => {
    // Update timestamp to trigger POS to reload promotions
    setPromotionRefreshTime(Date.now());
  };

  const handleSettingsUpdated = () => {
    // Update timestamp to trigger POS to reload settings
    setSettingsRefreshTime(Date.now());
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard onViewChange={setCurrentView} lastSaleTime={lastSaleTime} currentUser={currentUser} />;
      case 'pos': return <POS onSaleCompleted={handleSaleCompleted} currentUser={currentUser} refreshTime={inventoryRefreshTime} promotionRefreshTime={promotionRefreshTime} settingsRefreshTime={settingsRefreshTime} />;
      case 'inventory': return <Inventory onInventoryUpdated={handleInventoryUpdated} lastSaleTime={lastSaleTime} />;
      case 'suppliers': return <Suppliers />;
      case 'reports': return <Reports />;
      case 'promotions': return <Promotions onPromotionsUpdated={handlePromotionsUpdated} />;
      case 'users': return <Users />;
      default: return <Dashboard onViewChange={setCurrentView} lastSaleTime={lastSaleTime} currentUser={currentUser} />;
    }
  };

  if (!currentUser) {
    return (
      <ErrorBoundary>
        {sessionWarning && (
          <div className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl max-w-md">
              <h2 className="text-xl font-bold text-amber-600 mb-2">Session Expired</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">Your session has expired due to inactivity (10 minutes). Please log in again.</p>
              <button
                onClick={() => setSessionWarning(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
        <LoginScreen onLogin={handleLogin} />
      </ErrorBoundary>
    );
  }

  return (
    <Layout
      currentView={currentView}
      onViewChange={setCurrentView}
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      {renderView()}
    </Layout>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);