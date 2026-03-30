class Food extends GameObject3D {
  constructor(scene, id, x, z, color) {
    super(scene);
    this.name = 'Food';
    this.foodId = id;
    this.position.set(x, 0.25, z);
    this.foodColor = color || 0xffffff;
    this.foodValue = 1;
    this.isSpecial = false;
    this.createMesh();
  }
  createMesh() {
    const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const mat = new THREE.MeshLambertMaterial({ color: this.foodColor });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }
  setFoodValue(val) {
    this.foodValue = val;
    this.isSpecial = (val !== 1);
    // Create label
    this.createValueLabel();
    // Create glow
    this.createGlow();
  }
  createValueLabel() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 64);
    const text = (this.foodValue > 0 ? '+' : '') + this.foodValue;
    const isPositive = this.foodValue > 0;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.fillStyle = isPositive ? '#44ff66' : '#ff4444';
    ctx.strokeText(text, 64, 32);
    ctx.fillText(text, 64, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    this.labelSprite = new THREE.Sprite(mat);
    this.labelSprite.scale.set(2, 1, 1);
    this.labelSprite.renderOrder = 998;
    this.scene.add(this.labelSprite);
  }
  createGlow() {
    const isPositive = this.foodValue > 0;
    const glowColor = isPositive ? 0x00ff44 : 0xff2222;
    if (this.mesh) {
      this.mesh.material.emissive = new THREE.Color(glowColor);
      this.mesh.material.emissiveIntensity = 0.6 + Math.abs(this.foodValue) * 0.04;
    }
  }
  update(dt) {
    this.rotation.y += dt * 2;
    this.rotation.x += dt * 1.5;
    // Bobbing
    this.mesh.position.y = this.position.y + Math.sin(Date.now() * 0.003 + this.position.x) * 0.15;
    if (this.labelSprite) {
      this.labelSprite.position.set(this.position.x, this.mesh.position.y + 1.2, this.position.z);
    }

    super.update(dt);
  }
  destroy() {
    if (this.labelSprite) {
      this.scene.remove(this.labelSprite);
      if (this.labelSprite.material.map) this.labelSprite.material.map.dispose();
      this.labelSprite.material.dispose();
    }

    super.destroy();
  }
}
