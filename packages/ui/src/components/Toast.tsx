import toast, { Toaster } from "solid-toast";

export { toast };

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      gutter={8}
      toastOptions={{
        duration: 4000,
        style: {
          background: "#1f2937",
          color: "#f9fafb",
          "border-radius": "0.75rem",
          padding: "0.75rem 1rem",
          "font-size": "0.875rem",
        },
      }}
    />
  );
}

// Helper functions for consistent toast styling
export const showSuccess = (message: string) => {
  toast.success(message, {
    style: {
      background: "#065f46",
      color: "#d1fae5",
    },
  });
};

export const showError = (message: string) => {
  toast.error(message, {
    duration: 5000,
    style: {
      background: "#991b1b",
      color: "#fecaca",
    },
  });
};

export const showInfo = (message: string) => {
  toast(message, {
    style: {
      background: "#1e40af",
      color: "#dbeafe",
    },
  });
};
