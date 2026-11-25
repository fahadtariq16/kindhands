import type { RouteObject } from "react-router";
import Landing from "./pages/Landing";
import { Login } from "./pages/auth/Login";
import { Setup } from "./pages/auth/Setup";
import { AcceptInvite } from "./pages/auth/AcceptInvite";
import { AppLayout } from "./pages/app/AppLayout";
import { Overview } from "./pages/app/Overview";
import { Shifts } from "./pages/app/Shifts";
import { ShiftEditor } from "./pages/app/ShiftEditor";
import { ShiftDetailPage } from "./pages/app/ShiftDetail";
import { Volunteers } from "./pages/app/Volunteers";
import { Team } from "./pages/app/Team";
import { Settings } from "./pages/app/Settings";
import { OrgSignupPage } from "./pages/public/OrgSignupPage";
import { ManageSignup } from "./pages/public/ManageSignup";
import { Mailbox } from "./pages/dev/Mailbox";
import { NotFound } from "./pages/NotFound";

export const routes: RouteObject[] = [
  { path: "/", element: <Landing /> },
  { path: "/login", element: <Login /> },
  { path: "/setup", element: <Setup /> },
  { path: "/invite", element: <AcceptInvite /> },
  {
    path: "/app",
    element: <AppLayout />,
    children: [
      { index: true, element: <Overview /> },
      { path: "shifts", element: <Shifts /> },
      { path: "shifts/new", element: <ShiftEditor /> },
      { path: "shifts/:id", element: <ShiftDetailPage /> },
      { path: "shifts/:id/edit", element: <ShiftEditor /> },
      { path: "volunteers", element: <Volunteers /> },
      { path: "team", element: <Team /> },
      { path: "settings", element: <Settings /> },
    ],
  },
  { path: "/o/:slug", element: <OrgSignupPage /> },
  { path: "/s/:token", element: <ManageSignup /> },
  ...(import.meta.env.DEV ? [{ path: "/dev/mailbox", element: <Mailbox /> }] : []),
  { path: "*", element: <NotFound /> },
];
