"use client";

import { useState, useEffect, useRef } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { MessageCircle, CheckCircle2, Loader2 } from "lucide-react";
import { connectWhatsapp, disconnectWhatsapp } from "@/lib/api";
import { META_APP_ID, META_CONFIG_ID } from "@/lib/config";

const GRAPH_VERSION = "v25.0";

declare global {
  interface Window {
    FB?: any;
  }
}

/**
 * WhatsApp Embedded Signup (coexistence). The owner connects their WhatsApp
 * Business number via the Meta popup; the QR step happens inside the popup, so
 * the number keeps working in the WhatsApp Business app while the API runs
 * alongside it. FINISH (postMessage) and the login `code` arrive in any order —
 * we submit to the backend once both are present.
 */
export default function WhatsappConnect({
  restaurant,
  onUpdate,
}: {
  restaurant: any;
  onUpdate: () => void;
}) {
  const connected = Boolean(restaurant.whatsappPhoneNumberId);
  const configured = Boolean(META_APP_ID && META_CONFIG_ID);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);

  const signupRef = useRef<{ waba_id?: string; phone_number_id?: string }>({});
  const codeRef = useRef<string | null>(null);

  // Always-fresh finalize fn so the (once-registered) message listener and the
  // login callback never close over stale props.
  const finalizeRef = useRef<() => void>(() => {});
  finalizeRef.current = async () => {
    const { waba_id, phone_number_id } = signupRef.current;
    const code = codeRef.current;
    if (!waba_id || !phone_number_id || !code) return; // wait for both parts

    setSubmitting(true);
    setError(null);
    try {
      await connectWhatsapp(restaurant.id, {
        code,
        wabaId: waba_id,
        phoneNumberId: phone_number_id,
      });
      signupRef.current = {};
      codeRef.current = null;
      onUpdate();
    } catch (err: any) {
      setError(err.message || "Failed to connect WhatsApp");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!event.origin.endsWith("facebook.com")) return;
      let data: any;
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (data?.type !== "WA_EMBEDDED_SIGNUP") return;

      if (typeof data.event === "string" && data.event.startsWith("FINISH")) {
        signupRef.current = {
          waba_id: data.data?.waba_id,
          phone_number_id: data.data?.phone_number_id,
        };
        finalizeRef.current();
      } else if (data.event === "CANCEL") {
        signupRef.current = {};
        codeRef.current = null;
        setSubmitting(false);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // <Script onLoad> only fires on a fresh page load. On client-side navigation
  // the SDK is already in the DOM and onLoad won't fire again, leaving the button
  // disabled — so detect/poll for window.FB on mount and initialise here too.
  useEffect(() => {
    if (window.FB) { initSdk(); return; }
    const t = setInterval(() => {
      if (window.FB) { initSdk(); clearInterval(t); }
    }, 300);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initSdk() {
    if (!window.FB || !META_APP_ID) return;
    window.FB.init({
      appId: META_APP_ID,
      autoLogAppEvents: true,
      xfbml: false,
      version: GRAPH_VERSION,
    });
    setSdkReady(true);
  }

  function launchSignup() {
    if (!window.FB) return;
    setError(null);
    window.FB.login(
      (response: any) => {
        if (response?.authResponse?.code) {
          codeRef.current = response.authResponse.code;
          finalizeRef.current();
        }
      },
      {
        config_id: META_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: "3",
        },
      }
    );
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect this WhatsApp number? Customers will no longer reach the AI assistant on it.")) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await disconnectWhatsapp(restaurant.id);
      onUpdate();
    } catch (err: any) {
      setError(err.message || "Failed to disconnect");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border rounded-lg p-5 shadow-sm bg-white">
      <Script src="https://connect.facebook.net/en_US/sdk.js" strategy="lazyOnload" onLoad={initSdk} />

      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-5 h-5 text-emerald-600" />
        <h3 className="font-semibold text-sm">WhatsApp</h3>
      </div>

      {connected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-emerald-700">WhatsApp connected</div>
              <div className="font-mono text-sm font-semibold text-emerald-900 break-all">
                {restaurant.whatsappPhone ?? "Connected"}
              </div>
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button size="sm" variant="outline" onClick={handleDisconnect} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Disconnect"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Connect your WhatsApp Business number so customers can order via WhatsApp. You keep using the
            WhatsApp Business app — the AI assistant handles messages alongside it.
          </p>
          {!configured && (
            <p className="text-xs text-amber-600">WhatsApp signup is not configured (missing Meta app settings).</p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button size="sm" className="gap-2" onClick={launchSignup} disabled={submitting || !sdkReady || !configured}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            Connect WhatsApp
          </Button>
        </div>
      )}
    </div>
  );
}
