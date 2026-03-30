class PowerUp extends GameObject3D {
  constructor(scene, id, x, z, type) {
    super(scene);
    this.puId = id;
    this.type = type;
    this.position.set(x, 1.5, z);
    this.time = 0;
    this.createMesh();
  }
  createMesh() {
    const colors = { shield: 0x00aaff, magnet: 0xcc44ff, speed: 0xffee00, score: 0x44ff44, eagle: 0xff8844, shockwave: 0x00ffff, laser: 0xff0044, explosion: 0xff6600, freeze: 0x66ddff, trap: 0x880000 };
    const emissive = { shield: 0x0066aa, magnet: 0x8800cc, speed: 0xaa9900, score: 0x008800, eagle: 0x884400, shockwave: 0x008888, laser: 0x880022, explosion: 0x883300, freeze: 0x336688, trap: 0x440000 };
    const isAbility = ['shockwave','laser','explosion','freeze','trap'].includes(this.type);
    const geo = isAbility ? new THREE.BoxGeometry(1.2, 1.2, 1.2) : new THREE.SphereGeometry(0.8, 16, 16);
    const mat = new THREE.MeshLambertMaterial({
      color: colors[this.type] || 0xffffff,
      emissive: emissive[this.type] || 0x444444,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.85
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(this.position);
    this.mesh.castShadow = true;
    this.scene.add(this.mesh);

    const ringGeo = new THREE.TorusGeometry(1.1, 0.08, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: colors[this.type] || 0xffffff, transparent: true, opacity: 0.5 });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.rotation.x = Math.PI / 2;
    this.mesh.add(this.ring);

    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const icons = { shield: '🛡️', magnet: '🧲', speed: '⚡', score: '✖️2', eagle: '🦅', shockwave: '💨', laser: '🔴', explosion: '💥', freeze: '🧊', trap: '⚠️' };
    ctx.font = '40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(icons[this.type] || '?', 64, 45);
    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    this.label = new THREE.Sprite(spriteMat);
    this.label.scale.set(2, 1, 1);
    this.label.position.y = 2;
    this.label.renderOrder = 999;
    this.mesh.add(this.label);
  }
  update(dt) {
    this.time += dt;
    if (this.mesh) {
      this.mesh.position.y = 1.5 + Math.sin(this.time * 3) * 0.4;
      this.mesh.rotation.y += dt * 2;
      if (this.ring) this.ring.rotation.z += dt * 3;
    }
  }
  destroy() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh = null;
    }
  }
}
