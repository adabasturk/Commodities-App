---
name: Managed authentication
description: The project's authentication provider and transport boundary.
---

Meridian uses Replit-managed Clerk for user authentication. The web client relies on Clerk's browser session cookie; it does not attach bearer tokens to API calls. The Express API validates the Clerk session before serving shipment and analytics routes, while the health endpoint remains public.

**Why:** Generic authentication requests default to the managed Clerk tenant in this workspace, and browser cookie auth is the supported transport for this web artifact.

**How to apply:** Keep auth provider configuration in the workspace Auth pane and preserve cookie-based requests for the web app. Any new protected API route should use the existing auth guard rather than trusting client-side state.