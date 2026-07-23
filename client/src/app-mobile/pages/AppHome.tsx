import { Redirect } from "wouter";
import { collaboratorAppEnabled } from "../config";

// The collaborator app opens straight into the punch screen — no landing page.
// Access/eligibility is handled inside AppTimesheetHome (redirects to /ponto if blocked).
export default function AppHome() {
  if (!collaboratorAppEnabled) {
    return <Redirect to="/ponto" />;
  }
  return <Redirect to="/app/ponto" />;
}
