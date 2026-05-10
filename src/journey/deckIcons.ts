import { Brain, Megaphone, Mic2, Newspaper, Palette, type LucideIcon } from "lucide-react";
import type { DeckIconId } from "../domain/decks";

/**
 * Resolve o `iconId` (string) declarado no domínio para um componente
 * de ícone do `lucide-react`. Mantém `domain/` livre de dependências
 * de UI, e centraliza o vínculo visual em um só lugar.
 */
export const DECK_ICON_REGISTRY: Record<DeckIconId, LucideIcon> = {
  brain: Brain,
  newspaper: Newspaper,
  palette: Palette,
  mic: Mic2,
  megaphone: Megaphone
};

export function getDeckIcon(iconId: DeckIconId): LucideIcon {
  return DECK_ICON_REGISTRY[iconId];
}
