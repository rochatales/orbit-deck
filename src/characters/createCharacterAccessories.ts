import { Group, Mesh, Object3D } from "three";
import type { CharacterConfig } from "./characterConfig";
import {
  createBackpack,
  createFloatingCards,
  createGlasses,
  createHalo,
  createHeadphones,
  createHood,
  createLabCoat,
  createLayerPanels,
  createPhone,
  createSunglasses,
  createTablet,
  createWaveform,
  type CharacterBaseRig,
  type CharacterMaterialSet
} from "./createCharacterParts";

export interface CharacterAccessoryRefs {
  orbitGroup?: Group;
  floatingNodes?: Group;
  floatingCards?: Group;
  socialIcons?: Group;
  calendarBlocks?: Group;
  waveform?: Group;
  layerPanels?: Group;
  designFrames?: Group;
  heldPhone?: Group;
  heldTablet?: Group;
  voiceCard?: Group;
  brandBook?: Group;
  backpackAntenna?: Object3D;
}

export function createCharacterAccessories(
  config: CharacterConfig,
  rig: CharacterBaseRig,
  materials: CharacterMaterialSet
) {
  const refs: CharacterAccessoryRefs = {};

  config.accessories.forEach((accessory) => {
    if (accessory === "glasses") {
      const glasses = createGlasses(materials);
      glasses.position.copy(rig.anchors.face.position);
      rig.anchors.head.add(glasses);
    }

    if (accessory === "sunglasses") {
      const glasses = createSunglasses(materials);
      glasses.position.copy(rig.anchors.face.position);
      rig.anchors.head.add(glasses);
    }

    if (accessory === "headphones") {
      const headphones = createHeadphones(materials);
      headphones.position.set(0, 0.02, 0.01);
      rig.anchors.head.add(headphones);
    }

    if (accessory === "neckHeadphones") {
      const headphones = createHeadphones(materials, true);
      headphones.position.set(0, -0.06, 0.12);
      rig.anchors.head.add(headphones);
    }

    if (accessory === "labCoat") {
      const coat = createLabCoat(materials);
      coat.position.set(0, 0.88, 0);
      rig.bodyRoot.add(coat);
    }

    if (accessory === "hood") {
      const hood = createHood(materials);
      hood.position.set(0, 0.02, -0.03);
      rig.anchors.head.add(hood);
    }

    if (accessory === "backpack") {
      const backpack = createBackpack(materials, config.id === "editorial" || config.id === "narration");
      backpack.position.set(0, 0.02, -0.2);
      rig.anchors.back.add(backpack);
      refs.backpackAntenna = backpack.getObjectByName("antenna") ?? undefined;
    }

    if (accessory === "brainHalo") {
      const halo = createHalo(materials);
      halo.position.set(0, 0.12, 0);
      rig.anchors.overhead.add(halo);
      refs.orbitGroup = halo;
    }
  });

  config.props.forEach((prop) => {
    if (prop === "brandBook") {
      const book = createTablet(materials);
      book.scale.setScalar(0.88);
      book.rotation.set(-0.25, -0.45, -0.18);
      book.position.set(-0.22, -0.06, 0.07);
      rig.anchors.leftHand.add(book);
      refs.brandBook = book;
    }

    if (prop === "networkNodes") {
      const nodes = createFloatingCards(materials, config.accentColor);
      nodes.scale.setScalar(0.82);
      nodes.position.set(0.28, 1.32, 0.1);
      rig.bodyRoot.add(nodes);
      refs.floatingNodes = nodes;
    }

    if (prop === "phone") {
      const phone = createPhone(materials);
      phone.rotation.set(-0.55, -0.18, 0.1);
      phone.position.set(0.02, -0.03, 0.08);
      rig.anchors.rightHand.add(phone);
      refs.heldPhone = phone;
    }

    if (prop === "socialIcons") {
      const icons = createFloatingCards(materials, config.accentColor);
      icons.scale.set(0.9, 0.8, 0.9);
      icons.position.set(0.28, 1.2, 0.12);
      rig.bodyRoot.add(icons);
      refs.socialIcons = icons;
    }

    if (prop === "tablet") {
      const tablet = createTablet(materials);
      tablet.rotation.set(-0.55, -0.18, 0.08);
      tablet.position.set(0.02, -0.02, 0.08);
      rig.anchors.rightHand.add(tablet);
      refs.heldTablet = tablet;
    }

    if (prop === "floatingCards") {
      const cards = createFloatingCards(materials, config.accentColor);
      cards.position.set(0.24, 1.18, -0.08);
      rig.bodyRoot.add(cards);
      refs.floatingCards = cards;
    }

    if (prop === "calendarBlocks") {
      const calendar = createLayerPanels(materials);
      calendar.scale.set(0.82, 0.82, 0.82);
      calendar.position.set(-0.28, 1.08, 0.12);
      rig.bodyRoot.add(calendar);
      refs.calendarBlocks = calendar;
    }

    if (prop === "microphone") {
      const mic = new Group();
      const stand = new Mesh(rig.torso.geometry.clone(), materials.dark);
      stand.scale.set(0.08, 0.24, 0.08);
      stand.position.set(0, -0.05, 0);
      mic.add(stand);
      const head = new Mesh(rig.head.geometry.clone(), materials.accentGlow);
      head.scale.setScalar(0.16);
      head.position.set(0, 0.12, 0.04);
      mic.add(head);
      mic.scale.set(0.44, 0.44, 0.44);
      mic.rotation.set(-0.55, -0.15, 0.1);
      mic.position.set(-0.05, -0.04, 0.08);
      rig.anchors.leftHand.add(mic);
    }

    if (prop === "waveform") {
      const waveform = createWaveform(materials);
      waveform.position.set(0.22, 1.05, 0.14);
      rig.bodyRoot.add(waveform);
      refs.waveform = waveform;
    }

    if (prop === "voiceCard") {
      const voiceCard = createPhone(materials);
      voiceCard.scale.set(0.9, 0.65, 0.9);
      voiceCard.position.set(-0.2, 1.12, 0.08);
      rig.bodyRoot.add(voiceCard);
      refs.voiceCard = voiceCard;
    }

    if (prop === "designFrames") {
      const frames = createFloatingCards(materials, config.accentColor);
      frames.scale.set(1, 0.95, 1);
      frames.position.set(0.24, 1.18, 0.02);
      rig.bodyRoot.add(frames);
      refs.designFrames = frames;
    }

    if (prop === "layerPanels") {
      const panels = createLayerPanels(materials);
      panels.position.set(-0.18, 1.04, 0.12);
      rig.bodyRoot.add(panels);
      refs.layerPanels = panels;
    }

    if (prop === "paletteBadge") {
      const badge = createWaveform(materials);
      badge.scale.set(0.62, 0.4, 0.62);
      badge.rotation.y = Math.PI / 2;
      badge.position.set(0.16, 0.95, 0.18);
      rig.bodyRoot.add(badge);
    }
  });

  return refs;
}
