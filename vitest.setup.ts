import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest doesn't expose globals, so Testing Library can't auto-register its cleanup.
afterEach(() => cleanup());
