import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import {
  Switch,
  Route,
  Redirect,
  useLocation,
  Router as WouterRouter,
} from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Patients from "@/pages/Patients";
import PatientProfile from "@/pages/PatientProfile";
import Appointments from "@/pages/Appointments";
import WoundImaging from "@/pages/WoundImaging";
import TreatmentPlans from "@/pages/TreatmentPlans";
import VisitNotes from "@/pages/VisitNotes";
import Insurance from "@/pages/Insurance";
import AuditLogs from "@/pages/AuditLogs";
import NotFound from "@/pages/not-found";

// REQUIRED — copy verbatim. Resolves the key from window.location.hostname so the
// same build serves multiple Clerk custom domains. Do not inline the env var, leave
// publishableKey undefined, or replace publishableKeyFromHost with anything else.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — copy verbatim. Empty in dev (Clerk hits dev FAPI directly), auto-set
// in prod. Do NOT gate on import.meta.env.PROD / NODE_ENV — the empty dev value
// is intentional, and any branching breaks the prod proxy.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Clerk passes full paths to routerPush/routerReplace, but wouter's
// setLocation prepends the base — strip it to avoid doubling.
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#1193d4",
    colorForeground: "#062647",
    colorMutedForeground: "#60809f",
    colorDanger: "#ef4343",
    colorBackground: "#ffffff",
    colorInput: "#dee9ed",
    colorInputForeground: "#062647",
    colorNeutral: "#d7e5ea",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#062647] font-bold",
    headerSubtitle: "text-[#60809f]",
    socialButtonsBlockButtonText: "text-[#062647] font-medium",
    formFieldLabel: "text-[#062647] font-medium",
    footerActionLink: "text-[#1193d4] font-medium hover:text-[#0d76ab]",
    footerActionText: "text-[#60809f]",
    dividerText: "text-[#60809f]",
    identityPreviewEditButton: "text-[#1193d4]",
    formFieldSuccessText: "text-[#0f9d58]",
    alertText: "text-[#ef4343]",
    logoBox: "flex justify-center py-2",
    logoImage: "h-12 w-12",
    socialButtonsBlockButton: "border border-[#d7e5ea] hover:bg-[#f8fafc]",
    formButtonPrimary: "bg-[#1193d4] hover:bg-[#0d76ab] text-white",
    formFieldInput: "border border-[#d7e5ea] text-[#062647] bg-white",
    footerAction: "bg-transparent",
    dividerLine: "bg-[#d7e5ea]",
    alert: "bg-[#fdecec] border border-[#f5c6c6]",
    otpCodeFieldInput: "border border-[#d7e5ea] text-[#062647]",
    formFieldRow: "",
    main: "gap-4",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

// Keeps the React Query cache in sync when the signed-in Clerk user changes
// (e.g. sign out then sign in as a different user in the same tab).
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const rqClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        rqClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, rqClient]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Dashboard />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function Protected({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/patients">
        <Protected component={Patients} />
      </Route>
      <Route path="/patients/:id">
        <Protected component={PatientProfile} />
      </Route>
      <Route path="/appointments">
        <Protected component={Appointments} />
      </Route>
      <Route path="/wound-imaging">
        <Protected component={WoundImaging} />
      </Route>
      <Route path="/treatment-plans">
        <Protected component={TreatmentPlans} />
      </Route>
      <Route path="/visit-notes">
        <Protected component={VisitNotes} />
      </Route>
      <Route path="/insurance">
        <Protected component={Insurance} />
      </Route>
      <Route path="/audit-logs">
        <Protected component={AuditLogs} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to Woundence to continue",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "Join Woundence to manage patient wound care",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Toaster />
          <AppRoutes />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
