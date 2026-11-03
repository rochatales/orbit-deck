import { AdditiveBlending, CatmullRomCurve3, Group, Mesh, MeshBasicMaterial, Object3D, SpotLight, TubeGeometry, Vector3 } from 'three';
import { COLONY_VISOR_LIGHT } from '../../scene/lightingConfig';

// Faixa inferior do capacete, medida na malha posada em Idle_Colony e convertida
// uma vez para o espaço do Head. Folga frontal de ~1 cm evita z-fighting.
const STRIPE_POINTS = [
  [-.08835656, .07353094, .14515466], [-.06020959, .07409565, .16190914],
  [-.03278125, .07419324, .17202600], [-.00596168, .07389512, .17651996],
  [.02006845, .07308385, .17372218], [.04581018, .07208511, .16826055],
  [.07070770, .07053761, .15500135], [.09505864, .06863484, .13669366],
  [.11834911, .06604272, .10859076]
];

/** Só na montagem; o osso transporta faixa e foco durante todos os clipes. */
export function createColonyVisor(character: Object3D) {
  const head = character.getObjectByName('mixamorig:Head') ?? character.getObjectByName('mixamorigHead');
  if (!head) return null;
  const group = new Group();
  group.name = 'ColonyPlayerVisor';
  const curve = new CatmullRomCurve3(STRIPE_POINTS.map(p => new Vector3(p[0], p[1], p[2])));
  const config = COLONY_VISOR_LIGHT;
  const geometry = new TubeGeometry(curve, 48, config.stripeRadius, 6, false);
  const haloGeometry = new TubeGeometry(curve, 48, config.haloRadius, 6, false);
  const material = new MeshBasicMaterial({ color: config.stripeColor, toneMapped: false });
  const haloMaterial = new MeshBasicMaterial({
    color: config.stripeColor, toneMapped: false, transparent: true,
    opacity: config.haloOpacity, blending: AdditiveBlending, depthWrite: false
  });
  const stripe = new Mesh(geometry, material), halo = new Mesh(haloGeometry, haloMaterial);
  stripe.name = 'ColonyVisorStripe';
  halo.name = 'ColonyVisorHalo';
  const light = new SpotLight(config.color, config.intensity, config.reach, config.angle, config.penumbra, config.decay);
  light.name = 'ColonyVisorLight';
  light.position.fromArray(config.position);
  light.castShadow = false;
  const target = new Object3D();
  target.position.fromArray(config.target);
  light.target = target;
  group.add(stripe, halo, light, target);
  // Recursos privados, sem tocar no atlas nem nos materiais compartilhados do GLB.
  const dispose = () => {
    group.removeFromParent();
    geometry.dispose(); haloGeometry.dispose(); material.dispose(); haloMaterial.dispose(); light.dispose();
  };
  return { group, head, light, stripe, dispose };
}
