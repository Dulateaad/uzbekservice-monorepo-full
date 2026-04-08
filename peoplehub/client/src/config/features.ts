// ==================== FEATURE FLAGS ====================
// Each feature can be toggled independently.
// In production, these could come from Firestore remote config.

export type ProductId = 'TAXI' | 'REALTY' | 'AUTO' | 'TOURISM';
export type RegionId = string; // e.g. 'KZ', 'LATAM', 'EU'

export interface BranchConfig {
  branchId: string;
  productId: ProductId;
  regionId: RegionId;
  apiUrl: string;
  wsUrl?: string;
  enabled: boolean;
  weight: number; // routing weight (0-100)
}

export interface FeatureFlags {
  // Global
  safeMode: boolean;              // Kill switch: disable new orders
  maintenanceMode: boolean;       // Show maintenance page

  // Products
  taxiEnabled: boolean;
  realtyEnabled: boolean;
  autoEnabled: boolean;
  tourismEnabled: boolean;

  // Features
  routingEnabled: boolean;
  geocodingEnabled: boolean;
  chatEnabled: boolean;
  ratingsEnabled: boolean;
  priceAdjustmentEnabled: boolean;

  // Anti-takedown
  pwaEnabled: boolean;
  webFallbackUrl: string;         // Fallback domain
}

// Default flags for MVP
const DEFAULT_FLAGS: FeatureFlags = {
  safeMode: false,
  maintenanceMode: false,

  taxiEnabled: true,
  realtyEnabled: false,
  autoEnabled: false,
  tourismEnabled: false,

  routingEnabled: true,
  geocodingEnabled: true,
  chatEnabled: true,
  ratingsEnabled: true,
  priceAdjustmentEnabled: true,

  pwaEnabled: true,
  webFallbackUrl: '',
};

// Branch config for MVP (single branch)
const DEFAULT_BRANCHES: BranchConfig[] = [
  {
    branchId: 'PH-TAXI-KZ-1',
    productId: 'TAXI',
    regionId: 'KZ',
    apiUrl: '', // same origin (Firebase)
    enabled: true,
    weight: 100,
  },
];

class FeatureFlagService {
  private flags: FeatureFlags = { ...DEFAULT_FLAGS };
  private branches: BranchConfig[] = [...DEFAULT_BRANCHES];
  private listeners: Set<() => void> = new Set();

  getFlags(): FeatureFlags {
    return { ...this.flags };
  }

  getFlag<K extends keyof FeatureFlags>(key: K): FeatureFlags[K] {
    return this.flags[key];
  }

  setFlag<K extends keyof FeatureFlags>(key: K, value: FeatureFlags[K]) {
    this.flags[key] = value;
    this.notify();
  }

  // Bulk update (e.g. from Firestore remote config)
  updateFlags(partial: Partial<FeatureFlags>) {
    this.flags = { ...this.flags, ...partial };
    this.notify();
  }

  getBranches(productId?: ProductId): BranchConfig[] {
    const list = productId
      ? this.branches.filter((b) => b.productId === productId)
      : this.branches;
    return list.filter((b) => b.enabled);
  }

  // Select branch by weight (for load distribution)
  selectBranch(productId: ProductId, regionId?: RegionId): BranchConfig | null {
    let candidates = this.getBranches(productId);
    if (regionId) {
      const regional = candidates.filter((b) => b.regionId === regionId);
      if (regional.length) candidates = regional;
    }
    if (!candidates.length) return null;

    // Weighted random selection
    const totalWeight = candidates.reduce((sum, b) => sum + b.weight, 0);
    let random = Math.random() * totalWeight;
    for (const branch of candidates) {
      random -= branch.weight;
      if (random <= 0) return branch;
    }
    return candidates[0];
  }

  isProductEnabled(productId: ProductId): boolean {
    switch (productId) {
      case 'TAXI': return this.flags.taxiEnabled;
      case 'REALTY': return this.flags.realtyEnabled;
      case 'AUTO': return this.flags.autoEnabled;
      case 'TOURISM': return this.flags.tourismEnabled;
      default: return false;
    }
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }
}

export const featureFlags = new FeatureFlagService();

// ==================== STICKY BRANCH ASSIGNMENT ====================

const STICKY_KEY = 'ph_branch_assignment';
const STICKY_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

interface StickyAssignment {
  branchId: string;
  productId: ProductId;
  assignedAt: number;
}

export function getStickyBranch(productId: ProductId): string | null {
  try {
    const raw = localStorage.getItem(STICKY_KEY);
    if (!raw) return null;
    const assignments: StickyAssignment[] = JSON.parse(raw);
    const entry = assignments.find((a) => a.productId === productId);
    if (!entry) return null;
    if (Date.now() - entry.assignedAt > STICKY_TTL) return null;
    return entry.branchId;
  } catch {
    return null;
  }
}

export function setStickyBranch(productId: ProductId, branchId: string) {
  try {
    const raw = localStorage.getItem(STICKY_KEY);
    const assignments: StickyAssignment[] = raw ? JSON.parse(raw) : [];
    const idx = assignments.findIndex((a) => a.productId === productId);
    const entry: StickyAssignment = { branchId, productId, assignedAt: Date.now() };
    if (idx >= 0) assignments[idx] = entry;
    else assignments.push(entry);
    localStorage.setItem(STICKY_KEY, JSON.stringify(assignments));
  } catch {}
}

// ==================== SELECTED PRODUCT ====================

const PRODUCT_KEY = 'ph_product';

export function getSelectedProduct(): ProductId | null {
  try {
    return localStorage.getItem(PRODUCT_KEY) as ProductId | null;
  } catch {
    return null;
  }
}

export function setSelectedProduct(productId: ProductId) {
  try {
    localStorage.setItem(PRODUCT_KEY, productId);
  } catch {}
}
