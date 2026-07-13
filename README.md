# Dashboard UI

## Low-Level Design (LLD) & In-Depth Overview

The **Dashboard UI** is a modern, responsive Single Page Application (SPA) built with React and Vite. It serves as the visual control plane for the DevOps Pro platform.

### Key Capabilities
1. **State Management**: Uses React Context/Hooks to manage user sessions and tenant state.
2. **Unified Incident View**: Displays both infrastructure anomalies (from Splunk) and code vulnerabilities (from SonarCloud) in a unified grid. 
3. **Interactive Remediation**: Allows users to review LLM-generated code diffs, regenerate descriptions to get alternative fixes, and trigger automated Pull Requests.
4. **Configuration Interface**: Provides forms to input API keys and test connections to LLMs and external systems.

### Architecture
- Served via **Nginx** inside Docker.
- Communicates exclusively with the `gateway-service` on port `8080` (all API calls are prefixed with `/api/v1/`).
- Styling uses CSS Variables / TailwindCSS for theming (supporting dark/light mode and modern glassmorphism aesthetics).

### How to Interact
- **Port**: `5173` (Mapped to host via Docker)
- **Development**: Run `npm run dev` locally (outside Docker) to leverage Vite's Hot Module Replacement.
- **Production Build**: `npm run build` creates static assets served by Nginx.
