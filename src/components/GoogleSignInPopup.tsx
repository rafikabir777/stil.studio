import { useEffect, useRef, useState } from "react";
import { Creator } from "../types";
import { AlertCircle, Shield } from "lucide-react";

interface GoogleSignInPopupProps {
  onSignIn: (user: Creator, authToken: string) => void;
  onClose: () => void;
}

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          theme?: "outline" | "filled_blue" | "filled_black";
          size?: "large" | "medium" | "small";
          type?: "standard" | "icon";
          text?: "signin_with" | "signup_with" | "continue_with" | "signin";
          shape?: "rectangular" | "pill" | "circle" | "square";
          logo_alignment?: "left" | "center";
          width?: number;
        }
      ) => void;
      cancel: () => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

const googleClientId = (
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_GOOGLE_CLIENT_ID || ""
).trim();

function loadGoogleIdentityScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existingScript = document.getElementById("google-identity-services");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Google sign-in failed to load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "google-identity-services";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google sign-in failed to load."));
    document.head.appendChild(script);
  });
}

export default function GoogleSignInPopup({ onSignIn, onClose }: GoogleSignInPopupProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "verifying" | "error">(
    googleClientId ? "loading" : "error"
  );
  const [error, setError] = useState(
    googleClientId ? "" : "Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID to your environment."
  );

  useEffect(() => {
    let isMounted = true;

    async function verifyCredential(credential: string) {
      setStatus("verifying");
      setError("");

      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.creator || !data.token) {
        throw new Error(data.error || "Google sign-in could not be verified.");
      }

      onSignIn(data.creator, data.token);
    }

    async function initializeGoogleSignIn() {
      if (!googleClientId) return;

      try {
        await loadGoogleIdentityScript();

        if (!isMounted || !buttonRef.current || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            if (!response.credential) {
              setStatus("error");
              setError("Google did not return a sign-in credential.");
              return;
            }

            verifyCredential(response.credential).catch((err) => {
              setStatus("error");
              setError(err.message || "Google sign-in failed.");
            });
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        buttonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "filled_black",
          size: "large",
          type: "standard",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "left",
          width: 320,
        });

        setStatus("ready");
      } catch (err: any) {
        if (!isMounted) return;
        setStatus("error");
        setError(err.message || "Google sign-in failed to load.");
      }
    }

    initializeGoogleSignIn();

    return () => {
      isMounted = false;
      window.google?.accounts?.id.cancel();
    };
  }, [onSignIn]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        id="google-signin-modal"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-[#121212] border border-zinc-800 text-zinc-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="p-8 pb-5 text-center">
          <div className="flex justify-center mb-4">
            <svg className="h-10 w-10" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          </div>
          <h2 className="text-xl font-medium tracking-tight">Sign in with Google</h2>
          <p className="text-sm text-zinc-400 mt-1">Continue to STIL . studio with your Google account.</p>
        </div>

        <div className="px-8 pb-7 space-y-4">
          <div className="min-h-11 flex items-center justify-center">
            {googleClientId && <div id="google-real-signin-button" ref={buttonRef} />}
            {status === "loading" && <p className="text-xs text-zinc-500">Loading Google sign-in...</p>}
            {status === "verifying" && <p className="text-xs text-blue-400">Verifying your Google account...</p>}
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{error}</p>
            </div>
          )}
        </div>

        <div className="bg-zinc-900/30 px-8 py-5 border-t border-zinc-800 flex items-start gap-2.5 text-xs text-zinc-500">
          <Shield className="h-4.5 w-4.5 text-zinc-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Authentication is handled by Google. The server verifies your Google credential before creating your creator profile.
          </p>
        </div>

        <div className="p-3 bg-[#161616] flex justify-end">
          <button
            id="google-signin-close"
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
