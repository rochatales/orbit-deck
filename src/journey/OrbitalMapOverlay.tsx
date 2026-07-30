import { useEffect, useRef } from "react";
import { usePlayerJourneyStore } from "../state/usePlayerJourneyStore";
import { DeckSelectionScreen } from "./DeckSelectionScreen";

export function OrbitalMapOverlay() {
  const isOpen = usePlayerJourneyStore((state) => state.isOrbitalMapOpen);
  const closeOrbitalMap = usePlayerJourneyStore((state) => state.closeOrbitalMap);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="orbit-overlay" onMouseDown={closeOrbitalMap}>
      <div
        ref={dialogRef}
        className="orbit-overlay-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Mapa orbital"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <DeckSelectionScreen mode="overlay" onRequestClose={closeOrbitalMap} />
      </div>
    </div>
  );
}
