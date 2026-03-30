class Player extends GameObject3D {
  constructor(scene, playerIndex) {
    super(scene);
    this.name = 'Player';
    this.playerIndex = playerIndex;
    this.size = 1;
    this.speed = 8;
    this.targetPos = new THREE.Vector3();
    this.color = this.getColor(playerIndex);
    this.score = 0;
    this.health = 1;
    this.displayName = '';
    this.kills = 0;
    this.boosting = false;
    this.boostCooldown = 0;
    this.speedMultiplier = 1;
    // Random spawn
    this.position.set((Math.random() - 0.5) * 800, 0.5, (Math.random() - 0.5) * 800);
    this.targetPos.copy(this.position);
    this.createMesh();
    window.addEventListener('keydown', (e) => { if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.boosting = true; });
    window.addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.boosting = false; });

  }
  getColor(idx) {
    const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff, 0xff8844, 0x8844ff, 0x44ff88, 0xff4488, 0x88ff44, 0x4488ff, 0xffaa00, 0xaa00ff, 0x00ffaa, 0xff0088];
    return colors[idx % colors.length];
  }
  createMesh() {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshLambertMaterial({ color: this.color });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }
  setSize(s) {
    this.size = s;
    const scale = this.getScale();
    if (this.mesh) this.mesh.scale.set(scale, scale, scale);
    this.position.y = scale / 2;
  }
  getScale() { return 0.5 + this.size * 0.3; }
  update(dt, input) {
    const s = this.getScale();
    let baseSpeed = Math.max(6, 18 - this.size * 0.4);
    if (this.boosting && this.size > 2) {
      baseSpeed *= 1.8;
      this.boostCooldown += dt;
      if (this.boostCooldown >= 0.3) {
        this.boostCooldown = 0;
        this.size = Math.max(1, this.size - 1);
        this.score = this.size;
        if (window.game) window.game.spawnFoodAt(this.position.x - (Math.random()-0.5)*2, this.position.z - (Math.random()-0.5)*2);
      }
    } else {
      this.boostCooldown = 0;
    }
    this.speed = baseSpeed * this.speedMultiplier;
    if (input) {
      if (input.mx !== undefined) {
        this.targetPos.x = input.mx;
        this.targetPos.z = input.mz;
      }
    }
    const dir = new THREE.Vector3(this.targetPos.x - this.position.x, 0, this.targetPos.z - this.position.z);
    if (dir.length() > 0.5) {
      dir.normalize();
      this.position.x += dir.x * this.speed * dt;
      this.position.z += dir.z * this.speed * dt;
      this.rotation.y = Math.atan2(dir.x, dir.z);
    }
    // Clamp to arena
    this.position.x = THREE.MathUtils.clamp(this.position.x, -500, 500);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -500, 500);
    this.position.y = s / 2;
    this.mesh.scale.set(s, s, s);
    super.update(dt);
  }
}
