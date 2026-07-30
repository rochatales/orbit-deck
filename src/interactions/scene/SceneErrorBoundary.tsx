import { Component, type ErrorInfo, type ReactNode } from "react";

interface SceneErrorBoundaryProps {
  children: ReactNode;
  /**
   * Custom HTML fallback rendered when the wrapped subtree throws.
   * Default fallback explains the failure plainly so the user isn't
   * staring at a blank screen.
   */
  fallback?: (error: Error) => ReactNode;
}

interface SceneErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time errors in an interaction scene and renders a
 * visible diagnostic instead of letting them blank the whole app.
 * Use this around any subtree that uses suspending hooks (drei's
 * useTexture, useLoader, etc.) so a failed asset fetch is loud, not
 * silent.
 */
export class SceneErrorBoundary extends Component<
  SceneErrorBoundaryProps,
  SceneErrorBoundaryState
> {
  state: SceneErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): SceneErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[SceneErrorBoundary] caught scene error", error, info);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error);
      return (
        <div
          role="alert"
          style={{
            position: "fixed",
            inset: 0,
            display: "grid",
            placeItems: "center",
            background: "rgba(7, 11, 22, 0.94)",
            color: "#edf8ff",
            fontFamily: '"Courier New", monospace',
            fontSize: 14,
            zIndex: 9999,
            padding: 32,
            textAlign: "center"
          }}
        >
          <div>
            <div style={{ marginBottom: 12, color: "#ff8aa7", fontWeight: 700 }}>
              Cena com falha.
            </div>
            <div style={{ opacity: 0.75 }}>{this.state.error.message}</div>
            <div style={{ marginTop: 16, opacity: 0.55, fontSize: 12 }}>
              ESC fecha a tela. Confira o console para detalhes.
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
