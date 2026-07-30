import type { ReactNode } from "react";
import { InteractionPixelStage } from "./InteractionPixelStage";

interface InteractionSceneShellProps {
  ariaLabel: string;
  children: ReactNode;
  hud?: ReactNode;
}

export function InteractionSceneShell({
  ariaLabel,
  children,
  hud
}: InteractionSceneShellProps) {
  return (
    <InteractionPixelStage ariaLabel={ariaLabel} hud={hud}>
      {children}
    </InteractionPixelStage>
  );
}
