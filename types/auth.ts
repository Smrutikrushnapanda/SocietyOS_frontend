export type UserRole = 'admin' | 'resident' | 'guard';

export interface AuthUser {
  id: string;
  role: UserRole;
  phone: string;
  name: string;
  designation?: string;
  flat?: string;
  tower?: string;
  gate?: string;
  avatarInitials: string;
  societyId: string;
  societyName: string;
}

export interface OTPRequestPayload {
  phone: string;
  role: UserRole;
}

export interface OTPRequestResult {
  success: boolean;
  requestId: string;
  mockOtp?: string; // Exposed strictly for DEV mode zero-cost verification
  expiresInSeconds: number;
  message: string;
  devHint?: string;
}

export interface OTPVerifyPayload {
  phone: string;
  role: UserRole;
  otp: string;
  requestId: string;
}

export interface OTPVerifyResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

export interface IOTPProvider {
  sendOTP(payload: OTPRequestPayload): Promise<OTPRequestResult>;
  verifyOTP(payload: OTPVerifyPayload): Promise<OTPVerifyResult>;
  resendOTP(payload: OTPRequestPayload, previousRequestId: string): Promise<OTPRequestResult>;
}

export interface TestPersona {
  role: UserRole;
  name: string;
  phone: string;
  badge: string;
  description: string;
}
