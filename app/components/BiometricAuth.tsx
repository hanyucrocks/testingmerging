import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Lock, AlertCircle, Eye, EyeOff, Key, CheckCircle2, Settings, WifiOff, Wifi, RefreshCw, Signal, X, Clock, Fingerprint, Smartphone, Camera, User, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FaceRecognition } from './FaceRecognition';

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

// Biometric authentication types
interface BiometricCredential {
  id: string;
  type: 'public-key';
  transports?: string[];
}

interface BiometricAuthState {
  isSupported: boolean;
  isAvailable: boolean;
  isEnrolled: boolean;
  isAuthenticating: boolean;
}

interface FaceAuthState {
  isSupported: boolean;
  isEnrolled: boolean;
  isAuthenticating: boolean;
}

// IndexedDB setup
const initDB = () => {
  return new Promise((resolve, reject) => {
    console.log('Initializing IndexedDB...');
    const request = indexedDB.open('VaultXDB', 3); // Bump version to force upgrade and fix missing object store

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
      
      // Create transactions store
      if (!db.objectStoreNames.contains('transactions')) {
        console.log('Creating transactions store');
        const store = db.createObjectStore('transactions', { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // Create biometric credentials store
      if (!db.objectStoreNames.contains('biometricCredentials')) {
        console.log('Creating biometric credentials store');
        const store = db.createObjectStore('biometricCredentials', { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
      }
    };
  });
};

// Biometric authentication utilities
const checkBiometricSupportAsync = async (): Promise<BiometricAuthState> => {
  const isSupported = typeof window !== 'undefined' && window.PublicKeyCredential !== undefined;
  let isAvailable = false;
  if (isSupported) {
    try {
      if (window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        isAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      }
    } catch {
      isAvailable = false;
    }
  }
  return {
    isSupported,
    isAvailable,
    isEnrolled: false,
    isAuthenticating: false
  };
};

const generateChallenge = (): ArrayBuffer => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return array.buffer;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
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
  const [showPinInput, setShowPinInput] = useState(true);
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
  const [biometricState, setBiometricState] = useState<BiometricAuthState>({
    isSupported: false,
    isAvailable: false,
    isEnrolled: false,
    isAuthenticating: false
  });
  const [faceAuthState, setFaceAuthState] = useState<FaceAuthState>({
    isSupported: false,
    isEnrolled: false,
    isAuthenticating: false
  });
  const [authMethod, setAuthMethod] = useState<'fingerprint' | 'face' | 'pin'>('fingerprint');
  const [showFaceRecognition, setShowFaceRecognition] = useState(false);
  const [isEnrollingFace, setIsEnrollingFace] = useState(false);
  
  // New state variables for two-step authentication
  const [authStep, setAuthStep] = useState<'pin' | 'face' | 'complete'>('pin');
  const [pinVerified, setPinVerified] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const dbRef = useRef<IDBDatabase | null>(null);

  const MAX_RETRIES = 5;

  // Initialize IndexedDB and check biometric support
  useEffect(() => {
    let isMounted = true;
    initDB().then((db) => {
      if (!isMounted) return;
      dbRef.current = db as IDBDatabase;
      loadTransactions();
      checkBiometricEnrollment();
    }).catch((error) => {
      if (isMounted) setError('Failed to initialize secure storage.');
    });

    checkBiometricSupportAsync().then((biometricSupport) => {
      if (isMounted) setBiometricState(biometricSupport);
    });

    const faceSupport = checkFaceRecognitionSupport();
    // Optionally update faceAuthState here if needed

    return () => { isMounted = false; };
  }, []);

  // Check if user has enrolled biometric credentials
  const checkBiometricEnrollment = async () => {
    if (!dbRef.current || !biometricState.isAvailable) return;

    try {
      const transaction = dbRef.current.transaction(['biometricCredentials'], 'readonly');
      const store = transaction.objectStore('biometricCredentials');
      const request = store.get(userId);

      request.onsuccess = () => {
        const credential = request.result;
        setBiometricState(prev => ({
          ...prev,
          isEnrolled: !!credential
        }));
        console.log('Biometric enrollment status:', !!credential);
      };
    } catch (error) {
      console.error('Error checking biometric enrollment:', error);
    }
  };

  // Enroll biometric credential
  const enrollBiometric = async () => {
    // Removed - not used in PIN + Face Recognition only flow
    console.log('Biometric enrollment not available in this flow');
  };

  // Authenticate with biometric
  const authenticateBiometric = async () => {
    setError(null);
    if (!biometricState.isAvailable || !dbRef.current) {
      setError('Biometric authentication not available or not enrolled');
      return;
    }
    try {
      const challenge = generateChallenge();
      const userId = localStorage.getItem('userId') || 'default_user';
      // Get stored credential
      const transaction = dbRef.current.transaction(['biometricCredentials'], 'readonly');
      const store = transaction.objectStore('biometricCredentials');
      const request = store.get(userId);
      const credentialData = await new Promise<any>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      if (!credentialData) {
        setError('No biometric credential found');
        return;
      }
      const publicKeyOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            type: 'public-key',
            id: Uint8Array.from(atob(credentialData.credentialId), c => c.charCodeAt(0)),
            transports: credentialData.transports
          }
        ],
        userVerification: 'required',
        timeout: 60000
      };
      const assertion = await navigator.credentials.get({
        publicKey: publicKeyOptions
      }) as PublicKeyCredential;
      if (assertion) {
        setBiometricState(prev => ({ ...prev, isAuthenticating: false }));
        setAuthMethod('fingerprint');
        onSuccess({ id: 'biometric-transaction' });
      }
    } catch (error) {
      setBiometricState(prev => ({ ...prev, isAuthenticating: false }));
      setError('Biometric authentication failed.');
      onError('Biometric authentication failed.');
    }
  };

  // Load transactions from IndexedDB
  const loadTransactions = useCallback(async () => {
    if (!dbRef.current) return;

    try {
      const transaction = dbRef.current.transaction(['transactions'], 'readonly');
      const store = transaction.objectStore('transactions');
      const request = store.getAll();

      request.onsuccess = () => {
        const transactions = request.result;
        setCompletedTransactions(transactions.filter(t => t.status === 'completed'));
        setPendingTransactions(transactions.filter(t => t.status === 'pending'));
      };
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  }, []);

  // Save transaction to IndexedDB
  const saveTransaction = async (transaction: Transaction) => {
    if (!dbRef.current) return;

    try {
      const tx = dbRef.current.transaction(['transactions'], 'readwrite');
      const store = tx.objectStore('transactions');
      await store.add(transaction);
      await loadTransactions(); // Reload transactions after saving
    } catch (error) {
      console.error('Failed to save transaction:', error);
      throw error;
    }
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

  // Check face recognition support
  const checkFaceRecognitionSupport = () => {
    const isSupported = 'mediaDevices' in navigator && 
                       'getUserMedia' in navigator.mediaDevices;
    
    setFaceAuthState(prev => ({ ...prev, isSupported }));
    
    // Check if face is already enrolled
    const enrollmentData = localStorage.getItem('vaultx_face_enrollment');
    if (enrollmentData) {
      setFaceAuthState(prev => ({ ...prev, isEnrolled: true }));
    }
    
    return isSupported;
  };

  // Reset authentication state
  const resetAuth = () => {
    console.log('Resetting authentication state');
    setPin('');
    setPinVerified(false);
    setFaceVerified(false);
    setAuthStep('pin');
    setShowFaceRecognition(false);
    setError(null);
    setTransactionStatus('idle');
  };

  // Handle PIN verification
  const handlePinSubmit = () => {
    if (pin.length < 6) {
      setError('PIN must be 6 digits');
      return;
    }

    // For demo purposes, accept any 6-digit PIN
    setPinVerified(true);
    setAuthStep('face');
    setShowFaceRecognition(true);
    setError(null);
  };

  // Handle face recognition success and save transaction
  const handleFaceRecognitionSuccess = async (faceData: { confidence: number; faceId: string }) => {
    console.log('Face recognition successful:', faceData);
    
    if (!pinVerified) {
      setError('SECURITY VIOLATION: PIN must be verified first');
      resetAuth();
      return;
    }

    setFaceVerified(true);
    
    // Create transaction object
    const transactionId = `txn_${Date.now()}`;
    const newTransaction: Transaction = {
      id: transactionId,
      amount: amount || 0,
      timestamp: Date.now(),
      status: 'completed',
      completedAt: Date.now(),
      trace: `Face verification confidence: ${Math.round(faceData.confidence * 100)}%`
    };

    try {
      // Save transaction to IndexedDB
      await saveTransaction(newTransaction);
      
      // Call onSuccess with transaction details
      if (onSuccess) {
        onSuccess({
          id: transactionId
        });
      }

      // Update UI to show success
      setTransactionStatus('success');
      setAuthStep('complete');
      setError(null);

      // Auto-reset after success
      setTimeout(() => {
        resetAuth();
      }, 2000);
    } catch (error) {
      setError('Failed to save transaction. Please try again.');
      resetAuth();
    }
  };

  // Handle face recognition error
  const handleFaceRecognitionError = (error: string) => {
    console.log('Face recognition error:', error);
    setError(error);
    setFaceVerified(false);
  };

  // Handle face recognition cancel
  const handleFaceRecognitionCancel = () => {
    console.log('Face recognition cancelled');
    setShowFaceRecognition(false);
    setFaceVerified(false);
    setAuthStep('pin');
  };

  const handlePayNow = async () => {
    if (isLocked) return;
    setError(null);
    console.log('Pay Now clicked - Starting PIN + Face Recognition authentication');

    // Check if face recognition is available before starting
    if (!faceAuthState.isSupported) {
      setError('Face recognition is not supported on this device. Payment cannot proceed.');
      return;
    }

    if (!faceAuthState.isEnrolled) {
      setError('Face recognition must be enrolled before making payments. Please enroll first.');
      return;
    }

    // Always start with PIN authentication first
    setAuthStep('pin');
    setPinVerified(false);
    setFaceVerified(false);
    setShowPinInput(true);
    setAuthMethod('pin');
  };

  const handleEnrollBiometric = async () => {
    // Removed - not used in PIN + Face Recognition only flow
    console.log('Biometric enrollment not available in this flow');
  };

  const handleSwitchToBiometric = () => {
    // Removed - not used in PIN + Face Recognition only flow
    console.log('Biometric authentication not available in this flow');
  };

  const handleSwitchToPin = () => {
    // Removed - not used in PIN + Face Recognition only flow
    console.log('PIN switching not available in this flow');
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
    <div className="min-h-[400px] p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Secure Payment
          </h2>
          {amount && (
            <div className="flex flex-col items-center space-y-1">
              <p className="text-sm text-gray-500 uppercase tracking-wide">Amount to Pay</p>
              <p className="text-4xl font-bold text-green-600">${amount}</p>
            </div>
          )}
          <div className="flex items-center justify-center space-x-2 mt-4">
            {['pin', 'face', 'complete'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div 
                  className={`w-3 h-3 rounded-full ${
                    authStep === step 
                      ? 'bg-blue-600' 
                      : index < ['pin', 'face', 'complete'].indexOf(authStep)
                      ? 'bg-green-500'
                      : 'bg-gray-200'
                  }`}
                />
                {index < 2 && (
                  <div className={`w-12 h-0.5 ${
                    index < ['pin', 'face', 'complete'].indexOf(authStep)
                      ? 'bg-green-500'
                      : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-sm font-medium text-gray-600 mt-2">
            {authStep === 'pin' && 'Step 1: Enter your 6-digit PIN'}
            {authStep === 'face' && 'Step 2: Face Recognition'}
            {authStep === 'complete' && 'Payment Successful!'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="animate-shake">
            <AlertDescription className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* PIN Entry */}
        {authStep === 'pin' && (
          <div className="space-y-6">
            <div className="relative">
              <Input
                type={showPin ? "text" : "password"}
                placeholder="• • • • • •"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-3xl tracking-[1em] h-16 rounded-xl bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all"
                maxLength={6}
              />
              <button
                onClick={() => setShowPin(!showPin)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <Button 
              onClick={handlePinSubmit} 
              className={`w-full h-14 text-lg rounded-xl transition-all transform hover:scale-[1.02] ${
                pin.length === 6 
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-blue-200' 
                  : 'bg-gray-100 text-gray-400'
              }`}
              disabled={pin.length !== 6}
            >
              <Lock className={`mr-2 h-5 w-5 ${pin.length === 6 ? 'text-white' : 'text-gray-400'}`} />
              Continue to Face Recognition
            </Button>
          </div>
        )}

        {/* Face Recognition */}
        {authStep === 'face' && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-xl">
              <FaceRecognition
                onSuccess={handleFaceRecognitionSuccess}
                onError={handleFaceRecognitionError}
                onCancel={handleFaceRecognitionCancel}
              />
            </div>
          </div>
        )}

        {/* Success State */}
        {authStep === 'complete' && (
          <div className="text-center space-y-4 py-6">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-25"></div>
              <CheckCircle2 className="relative h-16 w-16 text-green-500 animate-bounce" />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-green-600">Payment Successful!</p>
              <p className="text-gray-500">Your transaction has been processed securely.</p>
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Transactions</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={loadTransactions}
              className="text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
          
          <div className="space-y-3">
            {completedTransactions.length > 0 ? (
              completedTransactions
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 5)
                .map((txn) => (
                  <div
                    key={txn.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-green-600">
                          ${txn.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(txn.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center text-green-600">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        <span className="text-xs">Completed</span>
                      </div>
                    </div>
                    {txn.trace && (
                      <p className="text-xs text-gray-400 mt-2">{txn.trace}</p>
                    )}
                  </div>
                ))
            ) : (
              <p className="text-center text-gray-500 py-4">
                No transactions yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}