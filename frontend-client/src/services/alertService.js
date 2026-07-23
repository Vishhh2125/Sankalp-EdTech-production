/**
 * Global Alert Service
 * Allows triggering custom theme-aware alerts from both React components
 * and standalone utility modules without prop-drilling or component refs.
 */

const listeners = new Set();

export const alertService = {
  subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  show(payload) {
    listeners.forEach((listener) => listener(payload));
  },
};

/**
 * Global helper function matching React Native's Alert.alert API signature
 */
export function showAlert(title, message, buttons, options) {
  alertService.show({
    title,
    message,
    buttons,
    options,
  });
}
