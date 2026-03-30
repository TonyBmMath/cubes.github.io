class RemotePlayer extends GameObject3D {
  constructor(scene, playerIndex) {
    super(scene);
    this.name = 'RemotePlayer';
    this.playerIndex = playerIndex;
    this.targetPos = new THREE.Vector3();
    this.targetRotY = 0;
    this.size = 1;
    this.score = 0;
    this.health = 1;
    this.displayName = '';
    this.createMesh();
  }
  getColor(idx) {
    const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff, 0xff8844, 0x8844ff, 0x44ff88, 0xff4488, 0x88ff44, 0x4488ff, 0xffaa00, 0xaa00ff, 0x00ffaa, 0xff0088];
    return colors[idx % colors.length];
  }
  createMesh() {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshLambertMaterial({ color: this.getColor(this.playerIndex) });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }
  getScale() { return 0.5 + this.size * 0.3; }
  update(dt) {
    this.position.lerp(this.targetPos, 0.15);
    this.rotation.y += (this.targetRotY - this.rotation.y) * 0.15;
    const s = this.getScale();
    if (this.mesh) this.mesh.scale.set(s, s, s);
    this.position.y = s / 2;
    super.update(dt);
  }
}
