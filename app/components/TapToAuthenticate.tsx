import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Fingerprint, 
  Camera, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Smartphone,
  Hand,
  Eye
} from "lucide-react";
import { FaceRecognition } from './FaceRecognition';

interface TapToAuthenticateProps {
  onSuccess: (authData: { method: string; confidence?: number }) => void;
  onError: (error: string) => void;
  onCancel: () => void;
  amount?: number;
  className?: string;
}

interface AuthState {
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

export function TapToAuthenticate({ 
  onSuccess, 
  onError, 
  onCancel, 
  amount,
  className = ""
}: TapToAuthenticateProps) {
  const [biometricState, setBiometricState] = useState<AuthState>({
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
  const [isTapping, setIsTapping] = useState(false);
  const [showFaceRecognition, setShowFaceRecognition] = useState(false);
  const [isEnrollingFace, setIsEnrollingFace] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<'fingerprint' | 'face' | 'none'>('none');
  const dbRef = useRef<IDBDatabase | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  // Async check for biometric support
  useEffect(() => {
    const checkSupport = async () => {
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
      setBiometricState(prev => ({ ...prev, isSupported, isAvailable }));
    };
    checkSupport();
  }, []);

  // Check face recognition support
  useEffect(() => {
    const isSupported = 'navigator' in window && 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
    setFaceAuthState(prev => ({ ...prev, isSupported }));
    // Check if face is already enrolled
    const enrollmentData = localStorage.getItem('vaultx_face_enrollment');
    if (enrollmentData) {
      setFaceAuthState(prev => ({ ...prev, isEnrolled: true }));
    }
  }, []);

  // IndexedDB setup
  useEffect(() => {
    const initDB = () => {
      return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('VaultXDB', 2);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result as IDBDatabase);
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('biometricCredentials')) {
            db.createObjectStore('biometricCredentials', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('transactions')) {
            const store = db.createObjectStore('transactions', { keyPath: 'id' });
            store.createIndex('status', 'status', { unique: false });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
      });
    };
    initDB().then(db => {
      dbRef.current = db;
      checkBiometricEnrollment(db);
    }).catch(() => {
      setError('Failed to initialize secure storage.');
    });
    // eslint-disable-next-line
  }, [biometricState.isAvailable]);

  // Check biometric enrollment
  const checkBiometricEnrollment = (db: IDBDatabase) => {
    if (!db || !biometricState.isAvailable) return;
    try {
      const transaction = db.transaction(['biometricCredentials'], 'readonly');
      const store = transaction.objectStore('biometricCredentials');
      const userId = localStorage.getItem('userId') || 'default_user';
      const request = store.get(userId);
      request.onsuccess = () => {
        const credential = request.result;
        setBiometricState(prev => ({
          ...prev,
          isEnrolled: !!credential
        }));
      };
    } catch {
      setError('Error checking biometric enrollment.');
    }
  };

  // Generate challenge for WebAuthn
  const generateChallenge = (): ArrayBuffer => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return array.buffer;
  };

  // Enroll biometric credential
  const enrollBiometric = async () => {
    setError(null);
    setSuccess(null);
    if (!biometricState.isAvailable || !dbRef.current) {
      setError('Biometric authentication not available');
      return;
    }
    try {
      const challenge = generateChallenge();
      const userId = localStorage.getItem('userId') || 'default_user';
      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'VaultX',
          id: window.location.hostname
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: userId,
          displayName: userId
        },
        pubKeyCredParams: [
          {
            type: 'public-key',
            alg: -7 // ES256
          }
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        },
        timeout: 60000,
        attestation: 'direct'
      };
      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions
      }) as PublicKeyCredential;
      if (credential) {
        // Store credential in IndexedDB
        const transaction = dbRef.current.transaction(['biometricCredentials'], 'readwrite');
        const store = transaction.objectStore('biometricCredentials');
        const credentialData = {
          id: userId,
          credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
          transports: []
        };
        await new Promise((resolve, reject) => {
          const request = store.put(credentialData);
          request.onsuccess = () => {
            setBiometricState(prev => ({ ...prev, isEnrolled: true }));
            setSuccess('Biometric enrollment successful!');
            resolve(request.result);
          };
          request.onerror = () => {
            setError('Failed to store biometric credential.');
            reject(request.error);
          };
        });
      }
    } catch (error) {
      setError('Error enrolling biometric credential.');
    }
  };

  // Authenticate with biometric
  const authenticateBiometric = async () => {
    setError(null);
    setSuccess(null);
    if (!biometricState.isAvailable || !biometricState.isEnrolled || !dbRef.current) {
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
        setSuccess('Biometric authentication successful!');
        setAuthMethod('fingerprint');
        onSuccess({ method: 'fingerprint' });
      }
    } catch (error) {
      setError('Biometric authentication failed.');
      onError('Biometric authentication failed.');
    }
  };

  // Face recognition handlers
  const handleFaceRecognitionSuccess = async (faceData: { confidence: number; faceId: string }) => {
    setSuccess('Face recognition successful!');
    setAuthMethod('face');
    setShowFaceRecognition(false);
    setIsProcessing(true);
    try {
      // Simulate real payment API call
      await new Promise(resolve => setTimeout(resolve, 2000)); // Replace with real payment logic
      setIsProcessing(false);
      setPaymentDone(true);
      onSuccess({ method: 'face', confidence: faceData.confidence });
    } catch (error) {
      setIsProcessing(false);
      setError('Payment failed. Please try again.');
    }
  };
  const handleFaceRecognitionError = (errorMsg: string) => {
    setError(errorMsg);
    setShowFaceRecognition(false);
    onError(errorMsg);
  };
  const handleFaceRecognitionCancel = () => {
    setShowFaceRecognition(false);
    onCancel();
  };

  // Main tap handler
  const handleTapToAuthenticate = async () => {
    setError(null);
    setSuccess(null);
    setIsTapping(true);
    // Always require face authentication for payment
    setShowFaceRecognition(true);
    setIsTapping(false);
  };

  if (paymentDone) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-8">
        <div className="animate-bounce">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
        </div>
        <p className="text-xl font-medium text-gray-700">Payment Successful!</p>
        <p className="text-sm text-gray-500">Thank you for your payment.</p>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <Card className="mb-4">
        <CardContent className="flex flex-col items-center py-6">
          <Button
            className="flex items-center space-x-2 px-6 py-3 text-lg"
            onClick={handleTapToAuthenticate}
            disabled={isTapping}
          >
            {isTapping ? <Loader2 className="animate-spin mr-2" /> : <Hand className="mr-2" />}
            <span>Tap to Authenticate</span>
          </Button>
          <div className="flex space-x-4 mt-4">
            <Button
              variant="outline"
              onClick={enrollBiometric}
              // disabled={!biometricState.isAvailable || biometricState.isEnrolled}
            >
              <Fingerprint className="mr-2" />
              {biometricState.isEnrolled ? 'Enrolled' : 'Enroll Biometric'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFaceRecognition(true)}
              disabled={faceAuthState.isEnrolled}
            >
              <Camera className="mr-2" />
              {faceAuthState.isEnrolled ? 'Enrolled' : 'Enroll Face'}
            </Button>
          </div>
          {error && (
            <div className="mt-4 text-red-600 flex items-center"><XCircle className="mr-2" />{error}</div>
          )}
          {success && (
            <div className="mt-4 text-green-600 flex items-center"><CheckCircle2 className="mr-2" />{success}</div>
          )}
          {isProcessing && (
            <div className="flex items-center mt-4 text-blue-600">
              <Loader2 className="animate-spin mr-2" />
              Processing payment...
            </div>
          )}
        </CardContent>
      </Card>
      {showFaceRecognition && (
        <FaceRecognition
          onSuccess={handleFaceRecognitionSuccess}
          onError={handleFaceRecognitionError}
          onCancel={handleFaceRecognitionCancel}
          isEnrolling={!faceAuthState.isEnrolled}
        />
      )}
    </div>
  );
} 