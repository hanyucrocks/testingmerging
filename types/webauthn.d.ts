// WebAuthn API TypeScript declarations
declare global {
  interface Window {
    PublicKeyCredential: typeof PublicKeyCredential;
  }

  interface PublicKeyCredential extends Credential {
    readonly rawId: ArrayBuffer;
    readonly response: AuthenticatorResponse;
    readonly type: 'public-key';
    getClientExtensionResults(): AuthenticationExtensionsClientOutputs;
  }

  interface AuthenticatorResponse {
    readonly clientDataJSON: ArrayBuffer;
    readonly authenticatorData: ArrayBuffer;
  }

  interface AuthenticatorAttestationResponse extends AuthenticatorResponse {
    readonly attestationObject: ArrayBuffer;
    getTransports(): string[];
    getPublicKey(): ArrayBuffer | null;
  }

  interface AuthenticatorAssertionResponse extends AuthenticatorResponse {
    readonly signature: ArrayBuffer;
    readonly userHandle: ArrayBuffer | null;
  }

  interface PublicKeyCredentialCreationOptions {
    challenge: ArrayBuffer;
    rp: PublicKeyCredentialRpEntity;
    user: PublicKeyCredentialUserEntity;
    pubKeyCredParams: PublicKeyCredentialParameters[];
    timeout?: number;
    excludeCredentials?: PublicKeyCredentialDescriptor[];
    authenticatorSelection?: AuthenticatorSelectionCriteria;
    attestation?: AttestationConveyancePreference;
    extensions?: AuthenticationExtensionsClientInputs;
  }

  interface PublicKeyCredentialRequestOptions {
    challenge: ArrayBuffer;
    rpId?: string;
    allowCredentials?: PublicKeyCredentialDescriptor[];
    userVerification?: UserVerificationRequirement;
    timeout?: number;
    extensions?: AuthenticationExtensionsClientInputs;
  }

  interface PublicKeyCredentialRpEntity {
    name: string;
    id?: string;
  }

  interface PublicKeyCredentialUserEntity {
    id: ArrayBuffer;
    name: string;
    displayName: string;
  }

  interface PublicKeyCredentialParameters {
    type: 'public-key';
    alg: number;
  }

  interface PublicKeyCredentialDescriptor {
    type: 'public-key';
    id: ArrayBuffer;
    transports?: string[];
  }

  interface AuthenticatorSelectionCriteria {
    authenticatorAttachment?: AuthenticatorAttachment;
    requireResidentKey?: boolean;
    residentKey?: ResidentKeyRequirement;
    userVerification?: UserVerificationRequirement;
  }

  interface AuthenticationExtensionsClientInputs {
    [key: string]: any;
  }

  interface AuthenticationExtensionsClientOutputs {
    [key: string]: any;
  }

  type AttestationConveyancePreference = 'none' | 'indirect' | 'direct';
  type AuthenticatorAttachment = 'platform' | 'cross-platform';
  type ResidentKeyRequirement = 'required' | 'preferred' | 'discouraged';
  type UserVerificationRequirement = 'required' | 'preferred' | 'discouraged';

  interface CredentialsContainer {
    create(options?: CredentialCreationOptions): Promise<Credential | null>;
    get(options?: CredentialRequestOptions): Promise<Credential | null>;
    preventSilentAccess(): Promise<void>;
  }

  interface CredentialCreationOptions {
    publicKey?: PublicKeyCredentialCreationOptions;
    signal?: AbortSignal;
  }

  interface CredentialRequestOptions {
    publicKey?: PublicKeyCredentialRequestOptions;
    signal?: AbortSignal;
  }

  interface Credential {
    readonly id: string;
    readonly type: string;
  }

  interface PublicKeyCredentialConstructor {
    new(): PublicKeyCredential;
    isUserVerifyingPlatformAuthenticatorAvailable(): Promise<boolean>;
    isConditionalMediationAvailable(): Promise<boolean>;
  }

  var PublicKeyCredential: PublicKeyCredentialConstructor;
}

export {}; 