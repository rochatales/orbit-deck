import {
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  TorusGeometry,
  CylinderGeometry
} from "three";
import { createMCPCharacter, type MCPCharacter } from "../characters/createMCPCharacter";
import type { MCPConfig } from "./mcpData";

export interface NPCInstance {
  data: MCPConfig;
  group: Group;
  ring: Mesh<TorusGeometry, MeshStandardMaterial>;
  labelAnchor: Object3D;
  character: MCPCharacter;
}

export function createNPC(data: MCPConfig): NPCInstance {
  const group = new Group();
  group.position.set(data.position.x, data.position.y, data.position.z);
  group.castShadow = true;

  const character = createMCPCharacter(data.id, data.color);
  const accent = new Color(character.config.accentColor);
  const darkMaterial = new MeshStandardMaterial({
    color: "#253249",
    roughness: 0.65,
    metalness: 0.15
  });
  group.add(character.root);

  const ringMaterial = new MeshStandardMaterial({
    color: accent,
    emissive: accent.clone().multiplyScalar(0.15),
    transparent: true,
    opacity: 0.9,
    roughness: 0.35,
    metalness: 0.25
  });
  const ring = new Mesh<TorusGeometry, MeshStandardMaterial>(new TorusGeometry(0.8, 0.08, 12, 40), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  ring.receiveShadow = true;
  group.add(ring);

  const pedestal = new Mesh(new CylinderGeometry(0.68, 0.76, 0.12, 18), darkMaterial);
  pedestal.position.y = 0.06;
  pedestal.receiveShadow = true;
  group.add(pedestal);

  const labelAnchor = character.labelAnchor;

  return { data, group, ring, labelAnchor, character };
}
