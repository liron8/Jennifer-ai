/**
 * Module Loader
 * Dynamically loads and initializes modules
 */

import type { ModuleManifest } from './types';
import { moduleRegistry } from './registry';

export interface ModuleLoader {
  loadModule(manifest: ModuleManifest): Promise<void>;
  loadModules(manifests: ModuleManifest[]): Promise<void>;
}

/**
 * Load a single module into the registry
 */
export async function loadModule(manifest: ModuleManifest): Promise<void> {
  try {
    moduleRegistry.register(manifest);
    console.log(`[ModuleLoader] Loaded module: ${manifest.id}`);
  } catch (error) {
    console.error(`[ModuleLoader] Failed to load module: ${manifest.id}`, error);
    throw error;
  }
}

/**
 * Load multiple modules into the registry
 * Handles dependency ordering automatically
 */
export async function loadModules(manifests: ModuleManifest[]): Promise<void> {
  // Sort manifests by dependencies (topological sort)
  const sorted = topologicalSort(manifests);

  for (const manifest of sorted) {
    await loadModule(manifest);
  }
}

/**
 * Topological sort for dependency ordering
 */
function topologicalSort(manifests: ModuleManifest[]): ModuleManifest[] {
  const manifestMap = new Map(manifests.map((m) => [m.id, m]));
  const visited = new Set<string>();
  const result: ModuleManifest[] = [];

  function visit(id: string): void {
    if (visited.has(id)) return;
    visited.add(id);

    const manifest = manifestMap.get(id);
    if (!manifest) return;

    for (const depId of manifest.dependencies) {
      visit(depId);
    }

    result.push(manifest);
  }

  for (const manifest of manifests) {
    visit(manifest.id);
  }

  return result;
}
