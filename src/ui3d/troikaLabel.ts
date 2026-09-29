import { CanvasTexture, Group, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
export interface TroikaLabelOptions {
    text: string;
    fontSize: number;
    color?: string;
    maxWidth?: number;
    anchorX?: string;
    anchorY?: string;
    outlineWidth?: number;
    outlineColor?: string;
    outlineOpacity?: number;
    letterSpacing?: number;
}
/** Local canvas lettering avoids requesting fonts from an external service. */
export class TroikaLabel3D extends Group {
    constructor(options: TroikaLabelOptions) {
        super();
        const canvas = document.createElement('canvas');
        canvas.width = 768;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        if (!context)
            return;
        context.font = 'bold 42px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = options.color ?? '#ffffff';
        context.fillText(options.text, 384, 64, 740);
        const texture = new CanvasTexture(canvas);
        texture.colorSpace = SRGBColorSpace;
        const mesh = new Mesh(new PlaneGeometry(options.maxWidth ?? 2.5, (options.maxWidth ?? 2.5) / 6), new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
        this.add(mesh);
    }
}
