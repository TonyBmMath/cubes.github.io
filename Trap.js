class Trap extends GameObject3D {
  constructor(scene, x, z, ownerName) {
    super(scene);
    this.ownerName = ownerName;
    this.position.set(x, 0.15, z);
    this.lifetime = 15;
    this.triggered = false;
    this.createMesh();
  }
  createMesh() {
    const geo = new THREE.BoxGeometry(1.8, 0.3, 1.8);
    const mat = new THREE.MeshLambertMaterial({ color: 0x880000, emissive: 0x440000, emissiveIntensity: 0.5, transparent: true, opacity: 0.6 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(this.position);
    this.mesh.castShadow = true;
    this.scene.add(this.mesh);
    // Spikes
    for (let i = 0; i < 4; i++) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.4, 4),
        new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0x881111, emissiveIntensity: 0.4 })
      );
      const angle = (Math.PI * 2 * i) / 4 + Math.PI / 4;
      spike.position.set(Math.cos(angle) * 0.5, 0.3, Math.sin(angle) * 0.5);
      this.mesh.add(spike);
    }
  }
  update(dt) {
    this.lifetime -= dt;
    if (this.mesh) {
      this.mesh.material.opacity = this.lifetime < 3 ? 0.3 + Math.sin(Date.now() * 0.01) * 0.2 : 0.6;
    }
  }
  destroy() {
    if (this.mesh) { this.scene.remove(this.mesh); this.mesh = null; }
  }
}
