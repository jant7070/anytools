const pending = new Map<string, Promise<void>>();

/** Injects a third-party script once and resolves when it has loaded. */
export function loadScript(src: string, attributes: Record<string, string> = {}): Promise<void> {
  const existing = pending.get(src);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    for (const [name, value] of Object.entries(attributes)) script.setAttribute(name, value);
    script.onload = () => resolve();
    script.onerror = () => {
      pending.delete(src);
      script.remove();
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(script);
  });
  pending.set(src, promise);
  return promise;
}
