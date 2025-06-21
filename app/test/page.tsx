'use client';

import { useState } from 'react';
import { TapToAuthenticate } from '../components/TapToAuthenticate';
import { BiometricAuth } from '../components/BiometricAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Touch, 
  Fingerprint, 
  Camera, 
  CheckCircle, 
  XCircle,
  ArrowRight
} from 'lucide-react';

export default function TestPage() {
  const [testResults, setTestResults] = useState<Array<{
    component: string;
    status: 'success' | 'error' | 'pending';
    message: string;
    timestamp: Date;
  }>>([]);

  const handleTapToAuthenticateSuccess = (authData: { method: string; confidence?: number }) => {
    setTestResults(prev => [...prev, {
      component: 'TapToAuthenticate',
      status: 'success',
      message: `Authentication successful with ${authData.method}${authData.confidence ? ` (${Math.round(authData.confidence * 100)}% confidence)` : ''}`,
      timestamp: new Date()
    }]);
  };

  const handleTapToAuthenticateError = (error: string) => {
    setTestResults(prev => [...prev, {
      component: 'TapToAuthenticate',
      status: 'error',
      message: error,
      timestamp: new Date()
    }]);
  };

  const handleBiometricAuthSuccess = (transaction: { id: string }) => {
    setTestResults(prev => [...prev, {
      component: 'BiometricAuth',
      status: 'success',
      message: `Transaction successful: ${transaction.id}`,
      timestamp: new Date()
    }]);
  };

  const handleBiometricAuthError = (error: string) => {
    setTestResults(prev => [...prev, {
      component: 'BiometricAuth',
      status: 'error',
      message: error,
      timestamp: new Date()
    }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">Component Test Page</h1>
          <p className="text-lg text-gray-600">
            Test the biometric authentication components
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* TapToAuthenticate Test */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Touch className="h-6 w-6 text-blue-600" />
                <span>TapToAuthenticate Component</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Test the streamlined "tap and authenticate" experience with automatic method selection.
              </p>
              
              <TapToAuthenticate
                onSuccess={handleTapToAuthenticateSuccess}
                onError={handleTapToAuthenticateError}
                onCancel={() => console.log('Cancelled')}
                amount={15.99}
              />
            </CardContent>
          </Card>

          {/* BiometricAuth Test */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Fingerprint className="h-6 w-6 text-green-600" />
                <span>BiometricAuth Component</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Test the advanced biometric authentication with multiple options and manual selection.
              </p>
              
              <BiometricAuth
                onSuccess={handleBiometricAuthSuccess}
                onError={handleBiometricAuthError}
                amount={25.99}
              />
            </CardContent>
          </Card>
        </div>

        {/* Test Results */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-6 w-6 text-purple-600" />
                <span>Test Results</span>
              </CardTitle>
              <Button onClick={clearResults} variant="outline" size="sm">
                Clear Results
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {testResults.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No test results yet. Try using the components above.
              </p>
            ) : (
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    {result.status === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : result.status === 'error' ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <div className="h-5 w-5 bg-yellow-500 rounded-full animate-pulse" />
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {result.component}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {result.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-1">{result.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle>Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <Button asChild variant="outline" className="w-full max-w-xs">
                <a href="/vaultx">
                  <Fingerprint className="h-4 w-4 mr-2" />
                  VaultX App
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 