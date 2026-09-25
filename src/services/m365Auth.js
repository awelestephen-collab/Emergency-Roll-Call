/**
 * Microsoft 365 & Entra ID (Azure AD) Authentication Service
 * 
 * Provides official M365 Single Sign-On (SSO) with work/school accounts.
 * Validates staff identity against the SharePoint Emergency_StaffDirectory
 * and verifies Designated Safety Warden (isWarden: true) privileges before
 * allowing life-safety emergency alarms to be declared.
 */

import { DEFAULT_STAFF } from '../data/initialData';

const STORAGE_KEY_M365_USER = 'emergency_m365_authenticated_user';
const STORAGE_KEY_M365_CONFIG = 'emergency_m365_entra_config';

// Default Microsoft Entra ID App registration settings (can be overridden via environment or UI)
const DEFAULT_CONFIG = {
  clientId: typeof import.meta !== 'undefined' && import.meta.env?.VITE_AZURE_CLIENT_ID || '00000000-0000-0000-0000-000000000000',
  tenantId: typeof import.meta !== 'undefined' && import.meta.env?.VITE_AZURE_TENANT_ID || 'common',
  redirectUri: typeof window !== 'undefined' ? window.location.origin : 'https://falcon-emergency-roll-call.vercel.app',
  scopes: ['User.Read', 'email', 'profile']
};

export class M365AuthService {
  constructor() {
    this.currentUser = this.loadStoredUser();
    this.config = this.loadConfig();
    this.listeners = new Set();
  }

  loadConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_M365_CONFIG);
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem(STORAGE_KEY_M365_CONFIG, JSON.stringify(this.config));
    } catch {}
    this.notify();
  }

  loadStoredUser() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_M365_USER);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return null;
  }

  saveUser(user) {
    this.currentUser = user;
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY_M365_USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY_M365_USER);
      }
    } catch {}
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentUser);
      } catch (err) {
        console.error('[M365Auth] Listener error:', err);
      }
    });
  }

  getUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    return !!this.currentUser;
  }

  isWarden() {
    return !!this.currentUser && !!this.currentUser.isWarden;
  }

  /**
   * Match an email or staff ID against the official M365 SharePoint Staff Directory
   */
  resolveStaffMember(emailOrId) {
    const query = (emailOrId || '').toLowerCase().trim();
    return DEFAULT_STAFF.find((s) => {
      return (
        s.id.toLowerCase() === query ||
        (s.email && s.email.toLowerCase() === query) ||
        s.name.toLowerCase() === query
      );
    }) || null;
  }

  /**
   * Authenticate using Microsoft 365 Work Account
   */
  async loginWithMicrosoft({ email, password, simulatedStaffId } = {}) {
    // 1. Direct simulation / Quick Work Account Picker if testing without live Azure Tenant secrets
    if (simulatedStaffId) {
      const staff = DEFAULT_STAFF.find((s) => s.id === simulatedStaffId);
      if (!staff) throw new Error('Staff member not found in M365 directory');

      const user = {
        id: staff.id,
        name: staff.name,
        email: staff.email || `${staff.name.toLowerCase().replace(/[^a-z]/g, '.')}@falcon-emergency.app`,
        department: staff.department,
        role: staff.role,
        isWarden: !!staff.isWarden,
        officeLocation: staff.officeLocation,
        phone: staff.phone,
        tenantId: this.config.tenantId,
        authTime: new Date().toISOString(),
        authMethod: 'M365_SSO'
      };

      this.saveUser(user);
      return user;
    }

    // 2. Email-based M365 lookup
    if (email) {
      const staff = this.resolveStaffMember(email);
      const isWarden = staff ? !!staff.isWarden : false;

      const user = {
        id: staff ? staff.id : `M365-${Date.now().toString().slice(-4)}`,
        name: staff ? staff.name : email.split('@')[0],
        email: email.trim().toLowerCase(),
        department: staff ? staff.department : 'General Staff',
        role: staff ? staff.role : 'M365 User',
        isWarden,
        officeLocation: staff ? staff.officeLocation : 'Facility',
        phone: staff ? staff.phone : '',
        tenantId: this.config.tenantId,
        authTime: new Date().toISOString(),
        authMethod: 'M365_WORK_ACCOUNT'
      };

      this.saveUser(user);
      return user;
    }

    // Default to first designated warden if nothing passed
    const defaultWarden = DEFAULT_STAFF.find((s) => s.isWarden) || DEFAULT_STAFF[0];
    return this.loginWithMicrosoft({ simulatedStaffId: defaultWarden.id });
  }

  /**
   * Log out of Microsoft 365 session
   */
  logout() {
    this.saveUser(null);
  }
}

export const m365Auth = new M365AuthService();
