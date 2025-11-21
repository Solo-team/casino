import React, { useEffect } from "react";

interface Props {
  onCredential: (payload: { email: string; name: string }) => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (credentialResponse: { credential: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, any>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

let hasWarnedAboutGoogleClientId = false;

const decodeCredential = (credential: string) => {
  const payload = credential.split(".")[1];
  if (!payload) return null;
  try {
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return {
      email: decoded.email as string,
      name: (decoded.name as string) || (decoded.given_name as string) || decoded.email
    };
  } catch {
    return null;
  }
};

const GoogleAuthButton: React.FC<Props> = ({ onCredential, disabled }) => {
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      if (!hasWarnedAboutGoogleClientId) {
        hasWarnedAboutGoogleClientId = true;
        console.warn("Google Client ID is not configured. Google authentication will not work.");
      }
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client?hl=en";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: response => {
            const profile = decodeCredential(response.credential);
            if (profile) {
              onCredential(profile);
            }
          }
        });

        const buttonContainer = document.getElementById("google-btn");
        if (buttonContainer) {
          window.google.accounts.id.renderButton(buttonContainer, {
            theme: "outline",
            size: "large",
            width: "100%",
            text: "signin_with",
            locale: "en"
          });
        }
      }
    };
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [onCredential]);

  return (
    <div className="google-auth">
      <div id="google-btn" />
    </div>
  );
};

export default GoogleAuthButton;
