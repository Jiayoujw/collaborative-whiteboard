type PluginHook = 'onElementCreate' | 'onElementUpdate' | 'onElementDelete' | 'onRender' | 'onExport';

interface Plugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  hooks: Partial<Record<PluginHook, Function>>;
  activate?: () => void;
  deactivate?: () => void;
}

class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private hookListeners: Map<PluginHook, Set<Function>> = new Map();

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin "${plugin.id}" already registered`);
      return;
    }
    this.plugins.set(plugin.id, plugin);

    for (const [hook, fn] of Object.entries(plugin.hooks)) {
      if (!this.hookListeners.has(hook as PluginHook)) {
        this.hookListeners.set(hook as PluginHook, new Set());
      }
      this.hookListeners.get(hook as PluginHook)!.add(fn);
    }

    plugin.activate?.();
    console.log(`🔌 Plugin "${plugin.name}" activated`);
  }

  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    for (const [hook, fn] of Object.entries(plugin.hooks)) {
      this.hookListeners.get(hook as PluginHook)?.delete(fn);
    }

    plugin.deactivate?.();
    this.plugins.delete(pluginId);
    console.log(`🔌 Plugin "${plugin.name}" deactivated`);
  }

  emit(hook: PluginHook, ...args: any[]): void {
    const listeners = this.hookListeners.get(hook);
    if (!listeners) return;
    for (const fn of listeners) {
      try {
        fn(...args);
      } catch (err) {
        console.error(`Plugin hook "${hook}" error:`, err);
      }
    }
  }

  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }
}

export const pluginManager = new PluginManager();

// Built-in plugins
export const gridPlugin: Plugin = {
  id: 'builtin-grid',
  name: 'Grid System',
  version: '1.0.0',
  hooks: {
    onElementUpdate: (element: any) => {
      // Snap to grid
      const gridSize = 20;
      element.x = Math.round(element.x / gridSize) * gridSize;
      element.y = Math.round(element.y / gridSize) * gridSize;
    },
  },
};

export const metricsPlugin: Plugin = {
  id: 'builtin-metrics',
  name: 'Element Metrics',
  version: '1.0.0',
  hooks: {
    onElementCreate: (element: any) => {
      console.log(`Element created: ${element.type} (${element.id})`);
    },
    onElementDelete: (element: any) => {
      console.log(`Element deleted: ${element.type} (${element.id})`);
    },
  },
};

export const exportPlugin: Plugin = {
  id: 'builtin-export',
  name: 'Export Tools',
  version: '1.0.0',
  hooks: {
    onExport: (format: string, canvas: HTMLCanvasElement) => {
      if (format === 'png') {
        return canvas.toDataURL('image/png');
      }
      if (format === 'svg') {
        // SVG export would be implemented here
        return '';
      }
      return null;
    },
  },
};
