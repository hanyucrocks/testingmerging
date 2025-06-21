import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Camera, 
  User, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Eye, 
  EyeOff,
  RotateCcw,
  Shield,
  Smartphone,
  AlertCircle
} from "lucide-react";

interface FaceRecognitionProps {
  onSuccess: (faceData: { confidence: number; faceId: string; imageData?: string }) => void;
  onError: (error: string) => void;
  onCancel: () => void;
  isEnrolling?: boolean;
}

interface FaceData {
  faceId: string;
  confidence: number;
  timestamp: number;
  imageData?: string;
}

interface FaceRecognitionState {
  isSupported: boolean;
  isCameraAvailable: boolean;
  isStreaming: boolean;
  isProcessing: boolean;
  isEnrolled: boolean;
  error: string | null;
  confidence: number;
  faceDetected: boolean;
}

export function FaceRecognition({ 
  onSuccess, 
  onError, 
  onCancel, 
  isEnrolling = false 
}: FaceRecognitionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [state, setState] = useState<FaceRecognitionState>({
    isSupported: false,
    isCameraAvailable: false,
    isStreaming: false,
    isProcessing: false,
    isEnrolled: false,
    error: null,
    confidence: 0,
    faceDetected: false
  });
  const [showCamera, setShowCamera] = useState(false);
  const [enrolledFaces, setEnrolledFaces] = useState<FaceData[]>([]);
  const [currentFaceData, setCurrentFaceData] = useState<FaceData | null>(null);

  // Check if face recognition is supported
  const checkFaceRecognitionSupport = useCallback(() => {
    const isSupported = 'mediaDevices' in navigator && 
                       'getUserMedia' in navigator.mediaDevices;
    
    setState(prev => ({ ...prev, isSupported }));
    return isSupported;
  }, []);

  // Initialize camera stream
  const initializeCamera = useCallback(async () => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Face recognition not supported on this device' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = resolve;
          }
        });

        setState(prev => ({ 
          ...prev, 
          isCameraAvailable: true, 
          isStreaming: true, 
          isProcessing: false 
        }));
        setShowCamera(true);
      }
    } catch (error) {
      console.error('Camera initialization error:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Unable to access camera. Please check permissions.',
        isProcessing: false 
      }));
    }
  }, [state.isSupported]);

  // Simple face detection using canvas analysis
  const simpleFaceDetection = async (imageData: Uint8ClampedArray, width: number, height: number): Promise<boolean> => {
    let skinPixels = 0;
    let centerSkinPixels = 0;
    const totalPixels = width * height;
    // Define a central region (e.g., center 40% of width and height)
    const centerX1 = Math.floor(width * 0.3);
    const centerX2 = Math.floor(width * 0.7);
    const centerY1 = Math.floor(height * 0.3);
    const centerY2 = Math.floor(height * 0.7);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = imageData[i];
        const g = imageData[i + 1];
        const b = imageData[i + 2];
        // Stricter skin tone detection
        if (
          r > 95 && g > 40 && b > 20 &&
          Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
          Math.abs(r - g) > 15 && r > g && r > b &&
          r < 230 && g < 210 && b < 200 // avoid very bright/yellow
        ) {
          skinPixels++;
          if (x >= centerX1 && x <= centerX2 && y >= centerY1 && y <= centerY2) {
            centerSkinPixels++;
          }
        }
      }
    }
    const skinRatio = skinPixels / totalPixels;
    const centerSkinRatio = centerSkinPixels / ((centerX2 - centerX1) * (centerY2 - centerY1));
    // Require a reasonable amount of skin in the center, and not too much overall (to avoid detecting walls)
    return (
      skinRatio > 0.12 && // stricter minimum
      skinRatio < 0.45 && // not too much skin (avoid yellow walls)
      centerSkinRatio > 0.15 // require skin in the center
    );
  };

  // Face detection using browser APIs
  const detectFace = useCallback(async (imageData: ImageData): Promise<FaceData | null> => {
    try {
      // Use Face Detection API if available
      if ('FaceDetector' in window) {
        const faceDetector = new (window as any).FaceDetector({
          fastMode: true,
          maxDetectedFaces: 2 // allow up to 2 to check for multiple
        });

        const canvas = canvasRef.current;
        if (!canvas) return null;

        const faces = await faceDetector.detect(canvas);
        if (faces.length === 0) {
          setState(prev => prev.error === 'No face detected. Please position your face in the camera.' ? prev : { ...prev, error: 'No face detected. Please position your face in the camera.' });
          return null;
        }
        if (faces.length > 1) {
          setState(prev => prev.error === 'Multiple faces detected. Please ensure only one face is visible.' ? prev : { ...prev, error: 'Multiple faces detected. Please ensure only one face is visible.' });
          return null;
        }
        const face = faces[0];
        const confidence = face.confidence || 0.8;
        if (state.error) setState(prev => ({ ...prev, error: null }));
        return {
          faceId: `face_${Date.now()}`,
          confidence,
          timestamp: Date.now(),
          imageData: canvas.toDataURL('image/jpeg', 0.8)
        };
      } else {
        // Fallback: Simple face detection using canvas analysis
        const { width, height, data } = imageData;
        const faceDetected = await simpleFaceDetection(data, width, height);
        if (!faceDetected) {
          setState(prev => prev.error === 'No face detected. Please ensure your face is clearly visible in the camera and avoid backgrounds with skin-like colors.' ? prev : { ...prev, error: 'No face detected. Please ensure your face is clearly visible in the camera and avoid backgrounds with skin-like colors.' });
          return null;
        }
        if (state.error) setState(prev => ({ ...prev, error: null }));
        return {
          faceId: `face_${Date.now()}`,
          confidence: 0.7, // Default confidence for fallback
          timestamp: Date.now(),
          imageData: canvasRef.current?.toDataURL('image/jpeg', 0.8)
        };
      }
      return null;
    } catch (error) {
      console.error('Face detection error:', error);
      setState(prev => ({ ...prev, error: 'Face detection error. Please try again.' }));
      return null;
    }
  }, [state.error]);

  // Process video frames for face detection (restore original logic, no auto-capture)
  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !state.isStreaming) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data for face detection
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Detect face (for UI feedback, not auto-capture)
    const faceData = await detectFace(imageData);
    
    if (faceData) {
      setState(prev => ({ 
        ...prev, 
        faceDetected: true, 
        confidence: faceData.confidence 
      }));
      setCurrentFaceData(faceData);
    } else {
      setState(prev => ({ 
        ...prev, 
        faceDetected: false, 
        confidence: 0 
      }));
      setCurrentFaceData(null);
    }

    // Continue processing frames
    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [state.isStreaming, detectFace]);

  // Start face detection
  const startFaceDetection = useCallback(() => {
    if (state.isStreaming && !state.isProcessing) {
      processFrame();
    }
  }, [state.isStreaming, state.isProcessing, processFrame]);

  // Stop face detection
  const stopFaceDetection = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Handle face authentication
  const handleFaceAuthentication = useCallback(() => {
    if (!currentFaceData) {
      setState(prev => ({ ...prev, error: 'No face detected. Please position your face in the camera.' }));
      return;
    }

    if (currentFaceData.confidence < 0.6) {
      setState(prev => ({ ...prev, error: 'Face detection confidence too low. Please try again.' }));
      return;
    }

    // For enrollment, we need multiple face samples
    if (isEnrolling) {
      if (enrolledFaces.length < 3) {
        setState(prev => ({ 
          ...prev, 
          error: `Please provide ${3 - enrolledFaces.length} more face samples for enrollment.` 
        }));
        return;
      }
      
      // Calculate average confidence
      const avgConfidence = enrolledFaces.reduce((sum, face) => sum + face.confidence, 0) / enrolledFaces.length;
      
      if (avgConfidence < 0.6) {
        setState(prev => ({ ...prev, error: 'Face enrollment quality too low. Please try again.' }));
        return;
      }

      // Store enrolled faces in localStorage (in production, this would be encrypted and stored securely)
      const enrollmentData = {
        faces: enrolledFaces,
        enrolledAt: Date.now(),
        userId: localStorage.getItem('userId') || 'default_user'
      };
      
      localStorage.setItem('vaultx_face_enrollment', JSON.stringify(enrollmentData));
      
      onSuccess({
        confidence: avgConfidence,
        faceId: `enrolled_${Date.now()}`
      });
    } else {
      // For authentication, compare with enrolled faces
      const enrollmentData = localStorage.getItem('vaultx_face_enrollment');
      
      if (!enrollmentData) {
        setState(prev => ({ ...prev, error: 'No face enrollment found. Please enroll first.' }));
        return;
      }

      const enrolled = JSON.parse(enrollmentData);
      
      // Simple comparison (in production, use proper face recognition algorithms)
      const isMatch = enrolled.faces.some((enrolledFace: FaceData) => 
        Math.abs(enrolledFace.confidence - currentFaceData.confidence) < 0.2
      );

      if (isMatch) {
        onSuccess({
          confidence: currentFaceData.confidence,
          faceId: currentFaceData.faceId
        });
      } else {
        setState(prev => ({ ...prev, error: 'Face not recognized. Please try again.' }));
      }
    }
  }, [currentFaceData, isEnrolling, enrolledFaces, onSuccess]);

  // Handle capture
  const handleCapture = () => {
    if (!currentFaceData) {
      onError('No face detected. Please position your face in the camera.');
      return;
    }

    // Always trigger success with the current face data
    onSuccess({
      confidence: currentFaceData.confidence,
      faceId: currentFaceData.faceId,
      imageData: currentFaceData.imageData
    });

    // Clean up
    stopFaceDetection();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  // Initialize component
  useEffect(() => {
    checkFaceRecognitionSupport();
    initializeCamera();
    // Check if user is already enrolled
    const enrollmentData = localStorage.getItem('vaultx_face_enrollment');
    if (enrollmentData) {
      setState(prev => ({ ...prev, isEnrolled: true }));
    }
    
    return () => {
      stopFaceDetection();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [checkFaceRecognitionSupport, initializeCamera, stopFaceDetection]);

  // Start face detection when camera is ready
  useEffect(() => {
    if (state.isStreaming && showCamera) {
      startFaceDetection();
    }
  }, [state.isStreaming, showCamera, startFaceDetection]);

  if (!state.isSupported) {
    return (
      <div className="text-center p-6">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Face Recognition Not Supported
        </h3>
        <p className="text-gray-600">
          Your device doesn't support face recognition. Please use an alternative authentication method.
        </p>
      </div>
    );
  }

  // Show the video element and Capture button
  return (
    <div className="space-y-6">
      {state.error && (
        <Alert variant="destructive" className="animate-shake">
          <AlertDescription className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            {state.error}
          </AlertDescription>
        </Alert>
      )}

      <div className="relative overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full aspect-video object-cover transform transition-transform duration-300 ${
            state.faceDetected ? 'scale-100' : 'scale-105'
          }`}
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Face Detection Overlay */}
        <div className={`absolute inset-0 border-4 transition-colors duration-300 rounded-lg ${
          state.faceDetected ? 'border-green-500' : 'border-transparent'
        }`}>
          {state.faceDetected && (
            <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/50 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-white">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Face Detected</span>
                </div>
                <div className="text-sm text-white/80">
                  Confidence: {Math.round(state.confidence * 100)}%
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {state.isProcessing ? (
          <Button disabled className="w-full h-12 bg-gray-100">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Initializing Camera...
          </Button>
        ) : (
          <>
            <Button
              onClick={handleCapture}
              disabled={!state.faceDetected}
              className={`w-full h-12 rounded-xl transition-all transform hover:scale-[1.02] ${
                state.faceDetected 
                  ? 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-green-200' 
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {state.faceDetected ? (
                <>
                  <Camera className="mr-2 h-5 w-5" />
                  Verify & Complete Payment
                </>
              ) : (
                <>
                  <User className="mr-2 h-5 w-5" />
                  Position Your Face
                </>
              )}
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              className="w-full h-12 rounded-xl border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Button>
          </>
        )}
      </div>

      {/* Camera Instructions */}
      {!state.faceDetected && !state.isProcessing && (
        <div className="text-center space-y-2 p-4 bg-blue-50 rounded-xl">
          <p className="text-sm font-medium text-blue-800">
            Please position your face in the camera
          </p>
          <p className="text-xs text-blue-600">
            Ensure good lighting and look directly at the camera
          </p>
        </div>
      )}
    </div>
  );
} 