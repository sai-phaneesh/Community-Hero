import React, { StrictMode, Component, ErrorInfo, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "./frontend/trpc";
import { AuthProvider } from "./context/AuthContext";
import { Toaster, toast } from "sonner";

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      "Uncaught rendering error in Community Hero:",
      error,
      errorInfo,
    );
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md shadow-xl text-left">
            <h2 className="text-lg font-bold text-red-400 mb-2">
              Something went wrong
            </h2>
            <p className="text-xs text-slate-300 mb-4 font-mono leading-relaxed bg-slate-950 p-3 rounded overflow-x-auto">
              {this.state.error?.message ||
                "An unexpected rendering error occurred."}
            </p>
            <button
              onClick={() => {
                localStorage.removeItem("community_hero_token"); // Safe logout in case state is corrupted
                window.location.reload();
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded text-xs transition-all cursor-pointer shadow-md text-center"
            >
              Reset & Reload Platform
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

const Main = () => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/trpc",
          headers() {
            const token = localStorage.getItem("community_hero_token");
            return token ? { Authorization: `Bearer ${token}` } : {};
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
            <Toaster position="bottom-right" richColors closeButton />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </trpc.Provider>
  );
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <Main />
    </ErrorBoundary>
  </StrictMode>,
);

// Register service worker for offline support & update prompts.
// Only in production — Vite HMR in dev would trigger 'controllerchange'
// on every hot update, causing an infinite reload loop.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  const showUpdateToast = (worker: ServiceWorker) => {
    toast.info("A new version of WardWatch is available!", {
      description: "Tap update to get the latest features and fixes instantly.",
      duration: Infinity,
      action: {
        label: "Update Now",
        onClick: () => {
          // Tell the waiting SW to activate immediately, then reload so the
          // user gets the new version. Reload is ONLY triggered by this click.
          worker.postMessage({ type: "SKIP_WAITING" });
          window.location.reload();
        },
      },
    });
  };

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log("ServiceWorker registered with scope:", registration.scope);

        // If a new SW is already waiting (page was open across an update), prompt now.
        if (registration.waiting) {
          showUpdateToast(registration.waiting);
        }

        // Listen for future SW installs.
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                showUpdateToast(newWorker);
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error("ServiceWorker registration failed:", error);
      });
  });
}
