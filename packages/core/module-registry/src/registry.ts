/**
 * Module Registry
 * Responsible for loading, validating, and managing feature modules
 */

import type { ModuleManifest, RegisteredModule, NavigationItem, SubscriptionTier } from './types';

class ModuleRegistry {
  private modules: Map<string, RegisteredModule> = new Map();

  /**
   * Register a module with the registry
   */
  register(manifest: ModuleManifest): void {
    this.validateManifest(manifest);
    this.checkDependencies(manifest);

    this.modules.set(manifest.id, {
      manifest,
      enabled: true,
      loadedAt: new Date(),
    });
  }

  /**
   * Unregister a module
   */
  unregister(moduleId: string): void {
    this.modules.delete(moduleId);
  }

  /**
   * Get a registered module by ID
   */
  getModule(moduleId: string): RegisteredModule | undefined {
    return this.modules.get(moduleId);
  }

  /**
   * Get all registered modules
   */
  getAllModules(): RegisteredModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get enabled modules for a specific organization and tier
   */
  getEnabledModules(orgId: string, tier: SubscriptionTier): ModuleManifest[] {
    return Array.from(this.modules.values())
      .filter((m) => this.isModuleEnabled(m, orgId, tier))
      .map((m) => m.manifest)
      .sort((a, b) => a.navigation.order - b.navigation.order);
  }

  /**
   * Build navigation items from enabled modules
   */
  buildNavigation(orgId: string, tier: SubscriptionTier): NavigationItem[] {
    const enabledModules = this.getEnabledModules(orgId, tier);
    return enabledModules.map((m) => ({
      id: m.id,
      icon: m.navigation.icon,
      label: m.navigation.label,
      path: m.navigation.path,
      tier: m.tier,
      badge: m.navigation.badge,
      position: m.navigation.position,
      children: m.navigation.children,
    }));
  }

  /**
   * Check if a module is enabled for a given org and tier
   */
  private isModuleEnabled(
    module: RegisteredModule,
    _orgId: string,
    tier: SubscriptionTier
  ): boolean {
    if (!module.enabled) return false;

    // Check tier requirements
    const tierHierarchy: SubscriptionTier[] = ['core', 'pro', 'enterprise'];
    const requiredTierIndex = tierHierarchy.indexOf(module.manifest.tier);
    const currentTierIndex = tierHierarchy.indexOf(tier);

    return currentTierIndex >= requiredTierIndex;
  }

  /**
   * Validate a module manifest
   */
  private validateManifest(manifest: ModuleManifest): void {
    if (!manifest.id || typeof manifest.id !== 'string') {
      throw new Error('Module manifest must have a valid id');
    }
    if (!manifest.name || typeof manifest.name !== 'string') {
      throw new Error('Module manifest must have a valid name');
    }
    if (!manifest.version || typeof manifest.version !== 'string') {
      throw new Error('Module manifest must have a valid version');
    }
    if (!manifest.navigation || !manifest.navigation.path) {
      throw new Error('Module manifest must have valid navigation config');
    }
  }

  /**
   * Check if all dependencies are registered
   */
  private checkDependencies(manifest: ModuleManifest): void {
    for (const depId of manifest.dependencies) {
      if (!this.modules.has(depId)) {
        throw new Error(
          `Module "${manifest.id}" depends on "${depId}" which is not registered`
        );
      }
    }
  }
}

export const moduleRegistry = new ModuleRegistry();
export { ModuleRegistry };
