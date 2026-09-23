import { authorize } from "./_lib/authz.js";
import { queueAccessLog } from "./_lib/audit.js";
import { canUseReport } from "./_lib/registry.js";

const REPORT_KEY = "sales_by_channel";
const PORTAL_URL = "https://equestrian-labs-dashboard.pages.dev";

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff",
    },
  });
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  }[c]));
}

function accessDeniedResponse() {
  return htmlResponse(`
    <!doctype html>
    <html>
    <body style="font-family:Arial;text-align:center;padding:60px">
    <h1>Access denied</h1>
    <p>You don't have permission to view Sales by Channel.</p>
    <p><a href="${PORTAL_URL}?reason=access_denied">Return to dashboard</a></p>
    </body>
    </html>
  `, 403);
}

function setupErrorResponse(error) {
  return htmlResponse(`
    <!doctype html>
    <html>
    <body style="font-family:Arial;text-align:center;padding:60px">
    <h1>Access setup error</h1>
    <p>Sales by Channel could not validate the user registry.</p>
    <pre style="white-space:pre-wrap;text-align:left;max-width:860px;margin:24px auto;padding:16px;background:#f5f5f5;border:1px solid #ddd">${escapeHtml(error?.message || "Access configuration failed")}</pre>
    </body>
    </html>
  `, 500);
}

function signInResponse(message = "Please sign in to view Sales by Channel.") {
  return htmlResponse(`
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Sales by Channel Sign In</title>
      <script src="https://accounts.google.com/gsi/client" async defer></script>
      <style>
        body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Arial,sans-serif;background:#f4f7fb;color:#081f3d}
        main{width:min(440px,calc(100vw - 32px));background:#fff;border:1px solid #dbe5f2;border-radius:16px;padding:34px;box-shadow:0 18px 50px rgba(8,31,61,.08);text-align:center}
        h1{margin:0 0 10px;font-size:28px}
        p{margin:0 0 24px;color:#54708f;line-height:1.5}
        #status{margin-top:16px;font-size:13px;color:#a33;min-height:18px}
        a{color:#1b68c9;text-decoration:none}
      </style>
    </head>
    <body>
      <main>
        <h1>Sales by Channel</h1>
        <p>${escapeHtml(message)}</p>
        <div id="googleBtn"></div>
        <div id="status"></div>
        <p style="font-size:12px;margin-top:22px">Use the same Google account authorized in the dashboard.</p>
      </main>
      <script>
        const statusEl = document.getElementById("status");
        function setStatus(text){ statusEl.textContent = text || ""; }
        async function init(){
          try{
            const cfgRes = await fetch("/api/config", {cache:"no-store"});
            const cfg = await cfgRes.json();
            if(!cfgRes.ok || !cfg.googleClientId) throw new Error(cfg.error || "Google sign-in is not configured");
            google.accounts.id.initialize({
              client_id: cfg.googleClientId,
              callback: async ({credential}) => {
                try{
                  setStatus("Signing in...");
                  const r = await fetch("/api/login", {
                    method:"POST",
                    credentials:"include",
                    headers:{"content-type":"application/json"},
                    body:JSON.stringify({credential})
                  });
                  const d = await r.json().catch(() => ({}));
                  if(!r.ok) throw new Error(d.error || "Sign-in failed");
                  location.reload();
                }catch(err){
                  setStatus(err.message || "Sign-in failed");
                }
              }
            });
            google.accounts.id.renderButton(document.getElementById("googleBtn"), {
              theme:"outline",
              size:"large",
              width:300
            });
          }catch(err){
            setStatus(err.message || "Unable to initialize sign-in");
          }
        }
        window.onload = init;
      </script>
    </body>
    </html>
  `, 401);
}

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.pathname.startsWith("/api/")) {
    return context.next();
  }

  try {
    const { user } = await authorize(context);
    if (!canUseReport(user, REPORT_KEY)) {
      queueAccessLog(context, { project: "Sales by Channel", reportKey: REPORT_KEY, action: "view", result: "denied", user });
      return accessDeniedResponse();
    }
    queueAccessLog(context, { project: "Sales by Channel", reportKey: REPORT_KEY, action: "view", result: "allowed", user });
    return context.next();
  } catch (e) {
    if (["session_missing", "session_expired", "session_invalid"].includes(e?.code)) {
      queueAccessLog(context, { project: "Sales by Channel", reportKey: REPORT_KEY, action: "view", result: e.code });
      return signInResponse(e.code === "session_expired" ? "Your session expired. Please sign in again." : undefined);
    }
    if (!e?.status || Number(e.status) >= 500) {
      queueAccessLog(context, { project: "Sales by Channel", reportKey: REPORT_KEY, action: "view", result: "setup_error" });
      return setupErrorResponse(e);
    }
    queueAccessLog(context, { project: "Sales by Channel", reportKey: REPORT_KEY, action: "view", result: "denied" });
    return accessDeniedResponse();
  }
}
