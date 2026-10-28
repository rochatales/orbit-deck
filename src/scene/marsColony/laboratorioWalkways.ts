import { BufferGeometry, Float32BufferAttribute, Mesh, MeshStandardMaterial } from 'three';
import { LABORATORIO } from '../../game/laboratorioLayout';
/** Uma chamada para os três trechos, sem faces duplicadas nas duas quinas. */
export function createLaboratorioWalkways() {
    const positions: number[] = [];
    for (const b of LABORATORIO.connectors) positions.push(
        b.minX, .012, b.minZ, b.minX, .012, b.maxZ, b.maxX, .012, b.maxZ,
        b.minX, .012, b.minZ, b.maxX, .012, b.maxZ, b.maxX, .012, b.minZ
    );
    const geometry = new BufferGeometry(); geometry.setAttribute('position', new Float32BufferAttribute(positions, 3)); geometry.computeVertexNormals();
    const material = new MeshStandardMaterial({ color: '#66655e', roughness: .9 });
    const mesh = new Mesh(geometry, material); mesh.name = 'LaboratorioPavimento'; mesh.receiveShadow = true;
    mesh.userData.ownedMaterial = material;
    return mesh;
}
