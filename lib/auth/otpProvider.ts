import {
  AuthUser,
  IOTPProvider,
  OTPRequestPayload,
  OTPRequestResult,
  OTPVerifyPayload,
  OTPVerifyResult,
  TestPersona,
  UserRole
} from '../../types';

// In-memory ephemeral storage for active OTP requests with TTL
interface StoredOTPRequest {
  phone: string;
  role: UserRole;
  otp: string;
  expiresAt: number;
  attempts: number;
}

const otpCache = new Map<string, StoredOTPRequest>();

// Predefined test personas for quick 1-click test fill (strictly approved numbers)
export const TEST_PERSONAS: Record<UserRole, TestPersona[]> = {
  admin: [
    {
      role: 'admin',
      name: 'Babuna Panda',
      phone: '6370412990',
      badge: 'Society Admin • Greenwood Heights',
      description: 'Society administrative rights, billing controls, and member management'
    },
    {
      role: 'admin',
      name: 'Sunita Rao',
      phone: '7008845326',
      badge: 'Super Admin • Platform Scoped',
      description: 'Platform super admin with cross-society oversight'
    }
  ],
  resident: [
    {
      role: 'resident',
      name: 'Aarav Sharma',
      phone: '7381142451',
      badge: 'Tower A • Flat 101 (Resident)',
      description: 'Verified resident profile with active dues and permissions'
    }
  ],
  guard: [
    {
      role: 'guard',
      name: 'Pramita (Security Guard)',
      phone: '9348381944',
      badge: 'North Gate 01 Post',
      description: 'Primary security gate terminal and visitor verification'
    }
  ]
};

// Normalize 10-digit / international phone number
export function cleanPhoneNumber(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    return digitsOnly;
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return digitsOnly.slice(2);
  }
  return digitsOnly;
}

export function formatIndianPhoneDisplay(cleanPhone: string): string {
  if (cleanPhone.length === 10) {
    return `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`;
  }
  return `+91 ${cleanPhone}`;
}

export class MockWhatsAppOTPProvider implements IOTPProvider {
  private generateMockOTP(): string {
    // Generate a deterministic 6-digit OTP for local development.
    // Value "123456" is used strictly for development purposes only;
    // never use this in production OTP providers.
    return '123456';
  }

  async sendOTP(payload: OTPRequestPayload): Promise<OTPRequestResult> {
    const cleanPhone = cleanPhoneNumber(payload.phone);
    if (cleanPhone.length < 10) {
      return {
        success: false,
        requestId: '',
        expiresInSeconds: 0,
        message: 'Please enter a valid 10-digit mobile number'
      };
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const otp = this.generateMockOTP();
    const expiresInSeconds = 300; // 5 minutes

    otpCache.set(requestId, {
      phone: cleanPhone,
      role: payload.role,
      otp,
      expiresAt: Date.now() + expiresInSeconds * 1000,
      attempts: 0
    });

    // Development Console Visual Log
    if (typeof window !== 'undefined') {
      console.log(
        `%c[SocietyOS WhatsApp OTP (DEV)]%c 📲 OTP for ${formatIndianPhoneDisplay(cleanPhone)} (${payload.role.toUpperCase()}): %c${otp}%c\nValid for 5 mins. RequestID: ${requestId}`,
        'background: #25D366; color: #000; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
        'color: #1f5d4e; font-weight: bold;',
        'background: #16241f; color: #e08a2c; font-size: 14px; font-weight: 900; padding: 2px 8px; border-radius: 4px; border: 1px solid #e08a2c;',
        'color: #607268;'
      );
    }

    return {
      success: true,
      requestId,
      mockOtp: otp,
      expiresInSeconds,
      message: `WhatsApp OTP sent to ${formatIndianPhoneDisplay(cleanPhone)}`,
      devHint: `[DEV MODE] Generated OTP: ${otp}`
    };
  }

  async resendOTP(payload: OTPRequestPayload, previousRequestId: string): Promise<OTPRequestResult> {
    if (previousRequestId && otpCache.has(previousRequestId)) {
      otpCache.delete(previousRequestId);
    }
    return this.sendOTP(payload);
  }

  async verifyOTP(payload: OTPVerifyPayload): Promise<OTPVerifyResult> {
    const cleanPhone = cleanPhoneNumber(payload.phone);
    const cached = otpCache.get(payload.requestId);

    // Fallback universal development bypass for rapid test automation
    const isUniversalDevBypass = payload.otp === '123456' || payload.otp === '000000';

    if (!cached && !isUniversalDevBypass) {
      return {
        success: false,
        error: 'OTP session expired or invalid. Please request a new OTP.'
      };
    }

    if (cached) {
      if (Date.now() > cached.expiresAt) {
        otpCache.delete(payload.requestId);
        return {
          success: false,
          error: 'OTP has expired. Please request a new one.'
        };
      }

      if (cached.attempts >= 4) {
        otpCache.delete(payload.requestId);
        return {
          success: false,
          error: 'Too many incorrect attempts. Please request a fresh OTP.'
        };
      }

      const isValid = cached.otp === payload.otp.trim() || isUniversalDevBypass;
      if (!isValid) {
        cached.attempts += 1;
        return {
          success: false,
          error: `Incorrect OTP code entered (${4 - cached.attempts} attempts left).`
        };
      }

      // Cleanup used OTP from ephemeral memory
      otpCache.delete(payload.requestId);
    }

    // Build authenticated user based on role and phone persona
    const user = this.resolveUserProfile(cleanPhone, payload.role);

    return {
      success: true,
      user
    };
  }

  private resolveUserProfile(cleanPhone: string, role: UserRole): AuthUser {
    // Check if phone matches predefined personas
    const persona = TEST_PERSONAS[role]?.find((p) => cleanPhoneNumber(p.phone) === cleanPhone);

    if (persona) {
      return {
        id: `usr_${role}_${cleanPhone}`,
        role,
        phone: `+91 ${cleanPhone}`,
        name: persona.name,
        designation: persona.badge,
        flat: role === 'resident' ? (persona.phone.endsWith('01') ? 'A-101' : 'A-102') : undefined,
        tower: role === 'resident' ? 'Tower A (Gulmohar)' : undefined,
        gate: role === 'guard' ? 'Gate 01 • North Booth' : undefined,
        avatarInitials: persona.name
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase(),
        societyId: '',
        societyName: 'Greenwood Heights'
      };
    }

    // Default dynamic user if custom phone was typed
    const defaultNames: Record<UserRole, string> = {
      admin: 'Society Administrator',
      resident: 'Resident Member',
      guard: 'Gate Security Guard'
    };

    return {
      id: `usr_${role}_${cleanPhone}`,
      role,
      phone: `+91 ${cleanPhone}`,
      name: defaultNames[role],
      designation: role === 'admin' ? 'Executive Committee' : role === 'guard' ? 'Main Security' : 'Flat Resident',
      flat: role === 'resident' ? 'A-101' : undefined,
      tower: role === 'resident' ? 'Tower A' : undefined,
      gate: role === 'guard' ? 'Gate 01' : undefined,
      avatarInitials: role === 'admin' ? 'AD' : role === 'guard' ? 'GD' : 'RS',
      societyId: '',
      societyName: 'Greenwood Heights'
    };
  }
}

// Replaceable provider instance (easily swappable with Meta WhatsApp Cloud API provider)
let currentOTPProvider: IOTPProvider = new MockWhatsAppOTPProvider();

export function getOTPProvider(): IOTPProvider {
  return currentOTPProvider;
}

export function setOTPProvider(provider: IOTPProvider): void {
  currentOTPProvider = provider;
}
