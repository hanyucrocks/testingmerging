import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Lock, AlertCircle, Eye, EyeOff, Key, CheckCircle2, Settings, WifiOff, Wifi, RefreshCw, Signal, X, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BiometricAuthProps {
  onSuccess: (transaction: { id: string }) => void;
  onError: (error: string) => void;
  onTabChange?: (tab: string) => void;
  amount?: number;
}

// Default PIN for new users
const DEFAULT_PIN = '123456';

interface Transaction {
  id: string;
  amount: number;
  timestamp: number;
  status: 'pending' | 'synced' | 'completed';
  syncedAt?: number;
  completedAt?: number;
  trace?: string;
}

// IndexedDB setup
const initDB = () => {
  return new Promise((resolve, reject) => {
    console.log('Initializing IndexedDB...');
    const request = indexedDB.open('VaultXDB', 1);

    request.onerror = (event) => {
      console.error('IndexedDB error:', event);
      reject(request.error);
    };

    request.onsuccess = (event) => {
      console.log('IndexedDB opened successfully');
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      console.log('IndexedDB upgrade needed');
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('transactions')) {
        console.log('Creating transactions store');
        const store = db.createObjectStore('transactions', { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

// Simplified network check function
const checkNetworkStatus = async () => {
  // First check if browser reports online
  if (!navigator.onLine) {
    return 'offline';
  }

  try {
    // Try to fetch a small resource
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const startTime = performance.now();
    const response = await fetch('https://www.cloudflare.com/cdn-cgi/trace', {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-cache',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    const endTime = performance.now();
    const latency = endTime - startTime;

    if (latency > 1000) {
      return 'low';
    }
    return 'online';
  } catch (error) {
    console.log('Network check failed:', error);
    // If fetch fails but browser is online, consider it low connectivity
    return navigator.onLine ? 'low' : 'offline';
  }
};

export function BiometricAuth({ onSuccess, onError, onTabChange, amount }: BiometricAuthProps) {
  const router = useRouter();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pin, setPin] = useState('');
  const pinRef = useRef(pin);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showPin, setShowPin] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(20);
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [confirmPin, setConfirmPin] = useState('');
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'processing' | 'success' | 'offline'>('idle');
  const [userId, setUserId] = useState<string>('');
  const [showChangePin, setShowChangePin] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'low'>('online');
  const [showHistory, setShowHistory] = useState(false);
  const [completedTransactions, setCompletedTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const dbRef = useRef<IDBDatabase | null>(null);

  const MAX_RETRIES = 5;

  // Initialize IndexedDB
  useEffect(() => {
    console.log('Component mounted, initializing DB...');
    initDB().then((db) => {
      console.log('DB initialized successfully');
      dbRef.current = db as IDBDatabase;
      loadTransactions();
    }).catch((error) => {
      console.error('Failed to initialize DB:', error);
    });
  }, []);

  // Load transactions and separate completed ones
  const loadTransactions = () => {
    console.log('Loading transactions...');
    if (!dbRef.current) {
      console.log('DB not initialized yet');
      return;
    }

    const transaction = dbRef.current.transaction(['transactions'], 'readonly');
    const store = transaction.objectStore('transactions');
    const request = store.getAll();

    request.onsuccess = () => {
      const allTransactions = request.result || [];
      console.log('Loaded all transactions:', allTransactions);
      
      // Separate pending and completed transactions
      const pending = allTransactions.filter(tx => tx.status === 'pending');
      const completed = allTransactions.filter(tx => tx.status === 'completed');
      
      setPendingTransactions(pending);
      setCompletedTransactions(completed);
    };

    request.onerror = (event) => {
      console.error('Error loading transactions:', event);
    };
  };

  // Save transaction with trace
  const saveTransaction = async (transaction: Transaction) => {
    console.log('Saving transaction with trace:', transaction);
    if (!dbRef.current) {
      console.log('DB not initialized yet');
      return;
    }

    try {
      // Add trace to transaction
      const transactionWithTrace = {
        ...transaction,
        trace: `Transaction saved at ${new Date().toISOString()}`
      };

      const tx = dbRef.current.transaction(['transactions'], 'readwrite');
      const store = tx.objectStore('transactions');

      // Check if transaction exists
      const getRequest = store.get(transaction.id);
      
      await new Promise((resolve, reject) => {
        getRequest.onsuccess = () => {
          const existingTransaction = getRequest.result;
          if (existingTransaction) {
            // Update existing transaction
            const updatedTransaction = {
              ...existingTransaction,
              ...transactionWithTrace,
              trace: `${existingTransaction.trace || ''}\nUpdated at ${new Date().toISOString()}`
            };
            const updateRequest = store.put(updatedTransaction);
            updateRequest.onsuccess = () => {
              console.log('Transaction updated in IndexedDB with trace');
              updateLocalStorage(updatedTransaction);
              loadTransactions();
              resolve(updateRequest.result);
            };
            updateRequest.onerror = () => reject(updateRequest.error);
          } else {
            // Add new transaction
            const addRequest = store.add(transactionWithTrace);
            addRequest.onsuccess = () => {
              console.log('Transaction added to IndexedDB with trace');
              updateLocalStorage(transactionWithTrace);
              loadTransactions();
              resolve(addRequest.result);
            };
            addRequest.onerror = () => reject(addRequest.error);
          }
        };
        getRequest.onerror = () => reject(getRequest.error);
      });
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  // Update localStorage
  const updateLocalStorage = (transaction: Transaction) => {
    const localTransactions = JSON.parse(localStorage.getItem('pendingTransactions') || '[]');
    const existingIndex = localTransactions.findIndex((tx: Transaction) => tx.id === transaction.id);
    
    if (existingIndex >= 0) {
      localTransactions[existingIndex] = transaction;
    } else {
      localTransactions.push(transaction);
    }
    
    localStorage.setItem('pendingTransactions', JSON.stringify(localTransactions));
    console.log('Transaction updated in localStorage');
  };

  // Sync pending transactions when online
  const syncPendingTransactions = async () => {
    if (networkStatus !== 'online') return;

    console.log('Syncing pending transactions...');
    const transactions = pendingTransactions.filter(tx => tx.status === 'pending');
    
    if (transactions.length === 0) {
      console.log('No pending transactions to sync');
      return;
    }

    try {
      // Simulate API call to sync transactions
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update transaction status with trace
      const updatedTransactions = transactions.map(tx => ({
        ...tx,
        status: 'completed' as const,
        syncedAt: Date.now(),
        completedAt: Date.now(),
        trace: `${tx.trace || ''}\nSynced at ${new Date().toISOString()}`
      }));

      // Update IndexedDB
      if (dbRef.current) {
        const tx = dbRef.current.transaction(['transactions'], 'readwrite');
        const store = tx.objectStore('transactions');
        
        for (const transaction of updatedTransactions) {
          await new Promise((resolve, reject) => {
            const request = store.put(transaction);
            request.onsuccess = () => {
              console.log('Transaction synced and completed:', transaction);
              resolve(request.result);
            };
            request.onerror = () => reject(request.error);
          });
        }
      }

      // Update localStorage
      const localTransactions = JSON.parse(localStorage.getItem('pendingTransactions') || '[]');
      const updatedLocalTransactions = localTransactions.map((tx: Transaction) => {
        const updatedTx = updatedTransactions.find(utx => utx.id === tx.id);
        return updatedTx || tx;
      });
      localStorage.setItem('pendingTransactions', JSON.stringify(updatedLocalTransactions));

      // Update state
      setPendingTransactions([]); // Clear pending transactions
      setCompletedTransactions(prev => [...prev, ...updatedTransactions]); // Add to completed

      console.log('Transactions completed successfully with trace');
    } catch (error) {
      console.error('Error completing transactions:', error);
    }
  };

  // Monitor network status and sync when online
  useEffect(() => {
    let isMounted = true;

    const updateNetworkStatus = async () => {
      if (!isMounted) return;
      
      setIsCheckingConnection(true);
      try {
        const status = await checkNetworkStatus();
        console.log('Network status updated:', status);
        if (isMounted) {
          setNetworkStatus(status);
          // If we just came online, sync pending transactions
          if (status === 'online') {
            await syncPendingTransactions();
          }
        }
      } catch (error) {
        console.error('Error checking network:', error);
      } finally {
        if (isMounted) {
          setIsCheckingConnection(false);
        }
      }
    };

    // Initial check
    updateNetworkStatus();

    // Check every 3 seconds
    const interval = setInterval(updateNetworkStatus, 3000);

    // Handle browser online/offline events
    const handleOnline = () => {
      console.log('Browser reports online');
      updateNetworkStatus();
    };

    const handleOffline = () => {
      console.log('Browser reports offline');
      setNetworkStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check for pending transactions when coming online
  useEffect(() => {
    const checkPendingTransactions = async () => {
      if (networkStatus === 'online' && dbRef.current) {
        console.log('Checking for pending transactions...');
        const transaction = dbRef.current.transaction(['transactions'], 'readonly');
        const store = transaction.objectStore('transactions');
        const request = store.getAll();

        request.onsuccess = () => {
          const allTransactions = request.result || [];
          const pendingTransactions = allTransactions.filter(tx => tx.status === 'pending');
          
          if (pendingTransactions.length > 0) {
            console.log('Found pending transactions:', pendingTransactions);
            syncPendingTransactions();
          } else {
            console.log('No pending transactions found');
          }
        };

        request.onerror = (event) => {
          console.error('Error checking pending transactions:', event);
        };
      }
    };

    checkPendingTransactions();
  }, [networkStatus]);

  // Update ref when pin changes
  useEffect(() => {
    pinRef.current = pin;
  }, [pin]);

  useEffect(() => {
    // Generate or retrieve user ID
    let existingUserId = localStorage.getItem('userId');
    if (!existingUserId) {
      existingUserId = 'USER_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('userId', existingUserId);
    }
    setUserId(existingUserId);

    // Load stored PIN or set default
    const savedPin = localStorage.getItem(`userPin_${existingUserId}`);
    if (!savedPin) {
      localStorage.setItem(`userPin_${existingUserId}`, DEFAULT_PIN);
      setStoredPin(DEFAULT_PIN);
      console.log('Setting default PIN:', DEFAULT_PIN);
    } else {
      setStoredPin(savedPin);
      console.log('Loaded stored PIN:', savedPin);
    }
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLocked && lockoutTime > 0) {
      timer = setInterval(() => {
        setLockoutTime(prev => prev - 1);
      }, 1000);
    } else if (lockoutTime === 0) {
      setIsLocked(false);
      setLockoutTime(20);
      setRetryCount(0);
    }
    return () => clearInterval(timer);
  }, [isLocked, lockoutTime]);

  const handlePayNow = () => {
    if (isLocked) return;
    setShowPinInput(true);
    setError(null);
    console.log('Pay Now clicked, showing PIN input');
  };

  const handleChangePin = () => {
    setShowChangePin(true);
    setShowPinInput(true);
    setError(null);
    console.log('Change PIN clicked');
  };

  const handleSetPin = () => {
    if (pin.length !== 6) {
      setError('PIN must be 6 digits');
      return;
    }

    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    if (showChangePin && currentPin !== storedPin) {
      setError('Current PIN is incorrect');
      return;
    }

    // Store the PIN
    localStorage.setItem(`userPin_${userId}`, pin);
    setStoredPin(pin);
    setIsSettingPin(false);
    setShowChangePin(false);
    setPin('');
    setConfirmPin('');
    setCurrentPin('');
    setError(null);
    setShowPinInput(false);
    console.log('PIN changed successfully:', pin);
  };

  const handleTransactionSuccess = async () => {
    console.log('Transaction success, network status:', networkStatus);
    
    // Create transaction object
      const newTransaction: Transaction = {
        id: 'TXN_' + Math.random().toString(36).substr(2, 9),
        amount: amount || 100, // Use provided amount or default
        timestamp: Date.now(),
      status: networkStatus === 'online' ? 'completed' : 'pending',
      completedAt: networkStatus === 'online' ? Date.now() : undefined,
      syncedAt: networkStatus === 'online' ? Date.now() : undefined,
      trace: `Transaction created at ${new Date().toISOString()}`
      };

      try {
      console.log('Saving transaction...');
        await saveTransaction(newTransaction);
      console.log('Transaction saved successfully');
      
      if (networkStatus === 'online') {
        setTransactionStatus('success');
        // Update completed transactions list
        setCompletedTransactions(prev => [...prev, newTransaction]);
        setTimeout(() => {
          // Switch to SmartCoins tab using the parent's onTabChange
          onTabChange?.('smartcoins');
          setShowPinInput(false);
          setPin('');
          setError(null);
        }, 2000);
      } else {
        setTransactionStatus('offline');
        // Update pending transactions list
        setPendingTransactions(prev => [...prev, newTransaction]);
        setTimeout(() => {
          setShowPinInput(false);
          setPin('');
          setError(null);
        }, 2000);
      }
      } catch (error) {
        console.error('Failed to save transaction:', error);
        setError('Failed to save transaction. Please try again.');
    }
  };

  const handlePinSubmit = () => {
    const currentPinValue = pinRef.current;
    console.log('handlePinSubmit triggered');
    console.log('Current PIN value:', currentPinValue);
    console.log('Stored PIN:', storedPin);
    
    if (currentPinValue.length !== 6) {
      setError('PIN must be 6 digits');
      return;
    }

    setIsAuthenticating(true);
    setError(null);

    // Convert both PINs to integers for comparison
    const enteredPinInt = parseInt(currentPinValue, 10);
    const storedPinInt = parseInt(storedPin || '0', 10);

    console.log('Entered PIN (int):', enteredPinInt);
    console.log('Stored PIN (int):', storedPinInt);

    // Simulate a small delay for better UX
    setTimeout(() => {
      if (enteredPinInt === storedPinInt) {
        console.log('PIN match successful');
        setRetryCount(0);
        setTransactionStatus('processing');
        
        // Simulate transaction processing
        setTimeout(() => {
          handleTransactionSuccess();
        }, 2000);
      } else {
        console.log('PIN match failed');
        const newRetryCount = retryCount + 1;
        setRetryCount(newRetryCount);
        
        if (newRetryCount >= MAX_RETRIES) {
          setIsLocked(true);
          setError(`Too many failed attempts. Please wait ${lockoutTime} seconds before trying again.`);
        } else {
          setError(`Invalid PIN. ${MAX_RETRIES - newRetryCount} attempts remaining.`);
        }
      }
      setIsAuthenticating(false);
    }, 500);
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and limit to 6 digits
    if (/^\d*$/.test(value) && value.length <= 6) {
      setPin(value);
      console.log('PIN input changed:', value);
      if (value.length === 6) {
        console.log('PIN length reached 6, submitting...');
        // Use setTimeout to ensure state is updated
        setTimeout(() => {
          handlePinSubmit();
        }, 0);
      }
    }
  };

  const handleConfirmPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value) && value.length <= 6) {
      setConfirmPin(value);
    }
  };

  const handleCurrentPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value) && value.length <= 6) {
      setCurrentPin(value);
    }
  };

  const resetAuth = () => {
    setShowPinInput(false);
    setPin('');
    setConfirmPin('');
    setCurrentPin('');
    setError(null);
    setIsSettingPin(false);
    setShowChangePin(false);
    if (!isLocked) {
      setRetryCount(0);
    }
    console.log('Auth reset');
  };

  // Prevent refresh when offline/low connectivity
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (networkStatus !== 'online') {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [networkStatus]);

  if (transactionStatus === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-8">
        <div className="animate-spin">
          <Loader2 className="h-12 w-12 text-orange-500" />
        </div>
        <p className="text-lg font-medium text-gray-700">Processing your payment...</p>
      </div>
    );
  }

  if (transactionStatus === 'success') {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-8">
        <div className="animate-bounce">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
        </div>
        <p className="text-xl font-medium text-gray-700">Payment Successful!</p>
        <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
      </div>
    );
  }

  if (transactionStatus === 'offline') {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-8">
        <div className="animate-bounce">
          <WifiOff className="h-16 w-16 text-orange-500" />
        </div>
        <p className="text-xl font-medium text-gray-700">Payment Saved Offline</p>
        <p className="text-sm text-gray-500">Will sync when connection is restored</p>
        <div className="mt-4 w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Pending Transactions:</h3>
            {isCheckingConnection && (
              <div className="flex items-center text-orange-500">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm">Checking connection...</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {pendingTransactions.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                <div>
                  <p className="font-medium">Amount: ${txn.amount}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(txn.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center">
                  {txn.status === 'completed' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm text-green-500">Completed</span>
                    </>
                  ) : txn.status === 'synced' ? (
                    <>
                      <Wifi className="h-4 w-4 text-blue-500 mr-2" />
                      <span className="text-sm text-blue-500">Synced</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 text-orange-500 mr-2" />
                      <span className="text-sm text-orange-500">Pending</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Network Status Warning */}
      {networkStatus !== 'online' && (
        <Alert className="mb-4 bg-orange-50 border-orange-200">
          <div className="flex items-center">
            {networkStatus === 'offline' ? (
              <WifiOff className="h-4 w-4 mr-2 text-orange-500" />
            ) : (
              <Signal className="h-4 w-4 mr-2 text-orange-500" />
            )}
            <div>
              <p className="font-medium text-orange-800">
                {networkStatus === 'offline' ? 'You are offline' : 'Low connectivity detected'}
              </p>
              <p className="text-sm text-orange-600">
                Please don't refresh the page. Your transactions will be saved and processed automatically when connectivity is restored.
              </p>
            </div>
          </div>
        </Alert>
      )}
      
      {!showPinInput ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {networkStatus === 'offline' ? (
                  <span className="flex items-center text-red-500">
                    <WifiOff className="h-4 w-4 mr-1" />
                    Offline Mode
                  </span>
                ) : networkStatus === 'low' ? (
                  <span className="flex items-center text-orange-500">
                    <Signal className="h-4 w-4 mr-1" />
                    Low Connectivity
                  </span>
                ) : (
                  <span className="flex items-center text-green-500">
                    <Wifi className="h-4 w-4 mr-1" />
                    Online
                  </span>
                )}
              </span>
              {isCheckingConnection && (
                <span className="text-sm text-gray-500">
                  <RefreshCw className="h-4 w-4 animate-spin inline mr-1" />
                  Checking...
                </span>
              )}
            </div>
          </div>
          <Button
            onClick={handlePayNow}
            disabled={isAuthenticating || isLocked}
            className="w-full h-16 bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold rounded-xl"
          >
            <CreditCard className="h-6 w-6 mr-3" />
            {isLocked ? `Locked (${lockoutTime}s)` : 'Pay Now'}
          </Button>
          <Button
            onClick={handleChangePin}
            variant="outline"
            className="w-full"
          >
            <Settings className="h-4 w-4 mr-2" />
            Change PIN
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {showChangePin ? 'Change PIN' : 'Enter 6-digit PIN'}
            </label>
            {showChangePin && (
              <div className="relative mb-4">
                <Input
                  type={showPin ? "text" : "password"}
                  value={currentPin}
                  onChange={handleCurrentPinChange}
                  placeholder="Enter current PIN"
                  maxLength={6}
                  className="text-center text-2xl tracking-widest pr-12"
                  disabled={isAuthenticating || isLocked}
                />
              </div>
            )}
            <div className="relative">
              <Input
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={handlePinChange}
                placeholder={showChangePin ? "Enter new PIN" : "Enter PIN"}
                maxLength={6}
                className="text-center text-2xl tracking-widest pr-12"
                disabled={isAuthenticating || isLocked}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowPin(!showPin)}
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>

            {showChangePin && (
              <div className="relative">
                <Input
                  type={showPin ? "text" : "password"}
                  value={confirmPin}
                  onChange={handleConfirmPinChange}
                  placeholder="Confirm new PIN"
                  maxLength={6}
                  className="text-center text-2xl tracking-widest pr-12"
                  disabled={isAuthenticating || isLocked}
                />
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button
              onClick={resetAuth}
              variant="outline"
              className="flex-1"
              disabled={isLocked}
            >
              Cancel
            </Button>
            {showChangePin ? (
              <Button
                onClick={handleSetPin}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                disabled={pin.length !== 6 || confirmPin.length !== 6 || currentPin.length !== 6 || isLocked}
              >
                <Key className="h-4 w-4 mr-2" />
                Change PIN
              </Button>
            ) : (
              retryCount > 0 && !isLocked && (
                <Button
                  onClick={() => {
                    setError(null);
                    setRetryCount(0);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Clear Error
                </Button>
              )
            )}
          </div>
        </div>
      )}

      {/* Payment Status Tabs */}
      <div className="mt-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pending' | 'completed')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Pending
              {pendingTransactions.length > 0 && (
                <span className="ml-2 bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-xs">
                  {pendingTransactions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Completed
              {completedTransactions.length > 0 && (
                <span className="ml-2 bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-xs">
                  {completedTransactions.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-4">
          {activeTab === 'pending' ? (
            <div className="space-y-2">
              {pendingTransactions.length > 0 ? (
                pendingTransactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                    <div>
                      <p className="font-medium">Amount: ${txn.amount}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(txn.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <WifiOff className="h-4 w-4 text-orange-500 mr-2" />
                      <span className="text-sm text-orange-500">Pending</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">No pending payments</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {completedTransactions.length > 0 ? (
                completedTransactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Amount: ${txn.amount}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(txn.timestamp).toLocaleString()}
                      </p>
                      <p className="text-xs text-green-500">
                        Completed: {new Date(txn.completedAt!).toLocaleString()}
                      </p>
                      {txn.trace && (
                        <p className="text-xs text-gray-400 mt-1 whitespace-pre-wrap">
                          {txn.trace}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm text-green-500">Completed</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">No completed payments</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer with History Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="flex justify-around items-center">
          <Button
            onClick={() => setShowHistory(!showHistory)}
            variant="ghost"
            className="flex flex-col items-center"
          >
            <CreditCard className="h-5 w-5 mb-1" />
            <span className="text-xs">History</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center"
          >
            <span className="text-xs">SnapPay</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center"
          >
            <span className="text-xs">Smartcoin</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center"
          >
            <span className="text-xs">Mission</span>
          </Button>
        </div>
      </div>
    </div>
  );
} 