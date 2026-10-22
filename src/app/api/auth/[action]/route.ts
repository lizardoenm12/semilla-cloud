import { maintenance } from "@/lib/local/db";
import { NextResponse } from "next/server";
import { authMode, workspaceEnabled, workspaceOrigin } from "@/lib/local/identity";
import { loginSettings, loginConfiguration, oidc } from "@/lib/oidc";
import { SESSION_COOKIE, FLOW_COOKIE, SESSION_SECONDS, cookieValue, sessionPrincipal, revokeSession, createFlow, consumeFlow, provisionPrincipal, createSession } from "@/lib/local/auth-store";
export const runtime = "nodejs", dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
type Context = {
    params: Promise<{
        action: string;
    }>;
};
async function handle(request: Request, context: Context) {
    if (!workspaceEnabled())
        return Response.json({ error: "No disponible" }, { status: 404, headers: noStore });
    try {
        if(process.env.APP_MODE === "cloud") workspaceOrigin(request);
        const action = (await context.params).action;
        if(action!=="session"&&maintenance())return Response.json({error:"Estamos trasladando tus datos. Vuelve a intentar en un momento."},{status:503,headers:noStore});
        if (action === "session" && request.method === "GET")
            return Response.json({ mode: authMode(), user: authMode() !== "local" ? await sessionPrincipal(cookieValue(request.headers.get("cookie"), SESSION_COOKIE)) : null }, { headers: noStore });
        if (authMode() === "local")
            return Response.json({ error: "Inicio de sesión externo pendiente de configurar." }, { status: 409, headers: noStore });
        const settings = loginSettings(), url = new URL(request.url), host = request.headers.get("host");
        const options = { httpOnly: true, sameSite: "lax" as const, secure: settings.secure, path: "/" };
        if (action === "login" && request.method === "GET") {
            if (host !== new URL(settings.base).host)
                return NextResponse.redirect(settings.base + "/api/auth/login", { headers: noStore });
            const config = await loginConfiguration(), verifier = oidc.randomPKCECodeVerifier(), nonce = oidc.randomNonce(), flow = await createFlow(verifier, nonce);
            const target = oidc.buildAuthorizationUrl(config, { redirect_uri: settings.callback, scope: "openid profile", response_type: "code", response_mode: "query", code_challenge: await oidc.calculatePKCECodeChallenge(verifier), code_challenge_method: "S256", nonce, state: flow.state, prompt: "select_account" });
            const response = NextResponse.redirect(target, { headers: noStore });
            response.cookies.set(FLOW_COOKIE, flow.browser, { ...options, maxAge: 600 });
            return response;
        }
        if (action === "callback" && request.method === "GET") {
            if (host !== new URL(settings.base).host)
                return Response.json({ error: "Dirección de retorno no permitida" }, { status: 400, headers: noStore });
            const state = url.searchParams.get("state"), flow = await consumeFlow(state, cookieValue(request.headers.get("cookie"), FLOW_COOKIE));
            if (!flow)
                throw new Error("Inicio de sesión caducado o inválido");
            const current = new URL(settings.callback);
            current.search = url.search;
            const tokens = await oidc.authorizationCodeGrant(await loginConfiguration(), current, { pkceCodeVerifier: flow.verifier, expectedState: state!, expectedNonce: flow.nonce, idTokenExpected: true });
            const claims = tokens.claims();
            if (!claims)
                throw new Error("Sin identidad verificada");
            const principal = await provisionPrincipal(claims);
            await revokeSession(cookieValue(request.headers.get("cookie"), SESSION_COOKIE));
            const token = await createSession(principal);
            const response = NextResponse.redirect(settings.base + "/", { headers: noStore });
            response.cookies.set(SESSION_COOKIE, token, { ...options, maxAge: SESSION_SECONDS });
            response.cookies.set(FLOW_COOKIE, "", { ...options, maxAge: 0 });
            return response;
        }
        if (action === "logout" && request.method === "POST") {
            if (request.headers.get("origin") !== settings.base || host !== new URL(settings.base).host)
                return Response.json({ error: "Origen no permitido" }, { status: 403, headers: noStore });
            await revokeSession(cookieValue(request.headers.get("cookie"), SESSION_COOKIE));
            const response = NextResponse.redirect(settings.base + "/", { status: 303, headers: noStore });
            response.cookies.set(SESSION_COOKIE, "", { ...options, maxAge: 0 });
            response.cookies.set(FLOW_COOKIE, "", { ...options, maxAge: 0 });
            return response;
        }
        return Response.json({ error: "Ruta o método no permitido" }, { status: 405, headers: noStore });
    }
    catch {
        // No devolver códigos OAuth, tokens, secretos ni mensajes del proveedor.
        const response = NextResponse.json({ error: "No se pudo completar el inicio de sesión. Vuelve al inicio e inténtalo nuevamente." }, { status: 400, headers: noStore });
        response.cookies.set(FLOW_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
        return response;
    }
}
export const GET = handle, POST = handle;
