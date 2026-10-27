/**
 * Re-export everything from @testing-library/react with a custom render.
 * This is a thin wrapper so tests don't need to import from both places.
 */
import { render, type RenderOptions } from "@testing-library/react";
import { type ReactElement, type ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";

interface AllProvidersProps {
  children: ReactNode;
  /** Initial route for the MemoryRouter (default "/"). */
  initialRoute?: string;
}

function AllProviders({ children, initialRoute = "/" }: AllProvidersProps) {
  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  );
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & {
    initialRoute?: string;
  },
) {
  const { initialRoute, ...renderOptions } = options ?? {};
  return render(ui, {
    wrapper: (props) => (
      <AllProviders initialRoute={initialRoute} {...props} />
    ),
    ...renderOptions,
  });
}

export * from "@testing-library/react";
export { customRender as render };
