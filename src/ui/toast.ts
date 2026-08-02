/**
 * Toast notification system
 * Non-intrusive feedback messages
 */

export interface ToastOptions {
  duration?: number;
  type?: 'info' | 'success' | 'error';
}

/**
 * Shows a toast notification
 */
export function showToast(message: string, options: ToastOptions = {}): void {
  const { duration = 3000, type = 'success' } = options;

  const toast = document.createElement('div');
  toast.textContent = message;

  const colors = {
    info: { bg: '#2196F3', text: 'white' },
    success: { bg: '#4CAF50', text: 'white' },
    error: { bg: '#f44336', text: 'white' },
  };

  const color = colors[type];

  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: color.bg,
    color: color.text,
    padding: '12px 20px',
    borderRadius: '8px',
    zIndex: '2147483647',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '14px',
    fontWeight: '500',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    transition: 'opacity 0.3s ease',
    opacity: '1',
  });

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration - 300);
}
