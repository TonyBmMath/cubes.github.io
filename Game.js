class Game {
  constructor() {
    window.game = this;
    this.entities = [];
    this.remotePlayers = {};
    this.foods = {};
    this.bots = [];
    this.isConnected = false;
    this.player = null;
    this.playing = false;
    this.playerColor = 0xff4444;
    this.wins = 0;
    this.winScore = 60;
    this.crowns = [];
    this.crownOwners = [null, null, null];
    this.input = { mx: 0, mz: 0 };
    this.mouseScreen = new THREE.Vector2();
    this.powerUps = {};
    this.activePowerUp = null;
    this.powerUpTimer = 0;
    this.powerUpSpawnTimer = 0;
    this.shieldMesh = null;
    this.scoreMultiplier = 1;
    this.eagleActive = false;
    this.playerName = 'Player';
    this.adRevivesUsed = 0;
    this.deathSize = 0;
    this.deathKills = 0;
    this.deathPos = null;
    this.joystickActive = false;
    this.joystickDir = { x: 0, z: 0 };
    this.traps = [];
    this.vfxObjects = [];
    this.laserMesh = null;
    this.laserTimer = 0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 200, 2000);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
    this.camera.position.set(0, 25, 20);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('gameContainer').appendChild(this.renderer.domElement);

    const ambient = new THREE.AmbientLight(0x808080, 1.2);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(200, 400, 200);
    dir.castShadow = true;
    dir.shadow.bias = -0.002;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left = -600; dir.shadow.camera.right = 600;
    dir.shadow.camera.top = 600; dir.shadow.camera.bottom = -600;
    dir.shadow.camera.far = 2000;
    this.scene.add(dir);
    this.dirLight = dir;

    this.createArena();

    window.addEventListener('mousemove', (e) => {
      this.mouseScreen.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    });
    window.addEventListener('touchmove', (e) => {
      if (this.joystickActive) return;
      const t = e.touches[0];
      this.mouseScreen.set((t.clientX / window.innerWidth) * 2 - 1, -(t.clientY / window.innerHeight) * 2 + 1);
    });

    window.addEventListener('resize', () => this.onResize());
    this.onResize();

    this.setupMenus();
    this.setupMobileControls();
    this.initMultiplayer();
  }

  setupMenus() {
    // Color picker
    const grid = document.getElementById('color-grid');
    const freeColors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff, 0xff8844, 0x8844ff, 0x44ff88, 0xff4488, 0x88ff44, 0x4488ff, 0xffaa00, 0xaa00ff, 0x00ffaa, 0xff0088];
    this.lockedColors = [
      { color: 0x000000, wins: 1, name: 'Shadow' },
      { color: 0xffffff, wins: 2, name: 'Pure White' },
      { color: 0xffd700, wins: 3, name: 'Gold' },
      { color: 0x00ff00, wins: 5, name: 'Neon Green' },
      { color: 0xff00ff, wins: 7, name: 'Hot Pink' },
      { color: 0x00ffff, wins: 10, name: 'Diamond' },
    ];
    const allColors = [...freeColors.map(c => ({ color: c, wins: 0 })), ...this.lockedColors];
    allColors.forEach((entry, i) => {
      const swatch = document.createElement('div');
      const locked = entry.wins > this.wins;
      swatch.className = 'color-swatch' + (i === 0 ? ' selected' : '') + (locked ? ' locked' : '');
      swatch.style.background = '#' + entry.color.toString(16).padStart(6, '0');
      if (locked) swatch.setAttribute('data-req', entry.wins + ' wins');
      swatch.addEventListener('click', () => {
        if (entry.wins > this.wins) return;
        grid.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
        this.playerColor = entry.color;
      });
      grid.appendChild(swatch);
    });
    this.colorSwatches = allColors;

    document.getElementById('btn-play').addEventListener('click', () => {
      this.startGame();
    });
    document.getElementById('btn-color').addEventListener('click', () => {
      document.getElementById('main-menu').style.display = 'none';
      document.getElementById('color-picker').style.display = 'flex';
    });
    document.getElementById('color-back').addEventListener('click', () => {
      document.getElementById('color-picker').style.display = 'none';
      document.getElementById('main-menu').style.display = 'flex';
    });
    document.getElementById('btn-ad-revive').addEventListener('click', () => {
      this.watchAdToRevive();
    });
    document.getElementById('btn-respawn').addEventListener('click', () => {
      this.adRevivesUsed = 0;
      document.getElementById('death-screen').style.display = 'none';
      document.getElementById('main-menu').style.display = 'flex';
    });
    document.getElementById('btn-win-menu').addEventListener('click', () => {
      document.getElementById('win-screen').style.display = 'none';
      document.getElementById('main-menu').style.display = 'flex';
    });
  }

  setupMobileControls() {
    const joystick = document.getElementById('mobile-joystick');
    const knob = document.getElementById('joystick-knob');
    const boostBtn = document.getElementById('mobile-boost-btn');
    if (!joystick) return;
    let jCenter = { x: 0, y: 0 };
    joystick.addEventListener('touchstart', (e) => {
      e.preventDefault(); e.stopPropagation();
      const rect = joystick.getBoundingClientRect();
      jCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      this.joystickActive = true;
    }, { passive: false });
    joystick.addEventListener('touchmove', (e) => {
      e.preventDefault(); e.stopPropagation();
      const t = e.touches[0];
      const dx = t.clientX - jCenter.x;
      const dy = t.clientY - jCenter.y;
      const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 50);
      const angle = Math.atan2(dy, dx);
      const nx = Math.cos(angle) * dist;
      const ny = Math.sin(angle) * dist;
      knob.style.transform = 'translate(calc(-50% + ' + nx + 'px), calc(-50% + ' + ny + 'px))';
      this.joystickDir.x = nx / 50;
      this.joystickDir.z = ny / 50;
    }, { passive: false });
    const resetJoystick = () => {
      this.joystickActive = false;
      this.joystickDir.x = 0;
      this.joystickDir.z = 0;
      knob.style.transform = 'translate(-50%, -50%)';
    };
    joystick.addEventListener('touchend', (e) => { e.preventDefault(); resetJoystick(); }, { passive: false });
    joystick.addEventListener('touchcancel', (e) => { e.preventDefault(); resetJoystick(); }, { passive: false });
    if (boostBtn) {
      boostBtn.addEventListener('touchstart', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (this.player) this.player.boosting = true;
      }, { passive: false });
      boostBtn.addEventListener('touchend', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (this.player) this.player.boosting = false;
      }, { passive: false });
    }
  }

  startGame() {
    const nameInput = document.getElementById('username-input');
    this.playerName = (nameInput && nameInput.value.trim()) || ('Player_' + Math.floor(1000 + Math.random() * 9000));
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('ui-layer').style.display = 'block';
    this.playing = true;
    this.scoreMultiplier = 1;
    this.eagleActive = false;

    if (this.player) {
      // Remove old player
      const idx = this.entities.indexOf(this.player);
      if (idx !== -1) this.entities.splice(idx, 1);
      this.player.destroy();
      if (this.player.label) this.scene.remove(this.player.label);
    }

    const pidx = this.isConnected ? Multiplayer.getMyPlayerIndex() : 0;
    this.player = new Player(this.scene, pidx);
    this.player.color = this.playerColor;
    if (this.player.mesh) this.player.mesh.material.color.setHex(this.playerColor);
    this.player.position.set((Math.random() - 0.5) * 800, 0.5, (Math.random() - 0.5) * 800);
    this.player.targetPos.copy(this.player.position);
    this.player.label = this.createLabel(this.playerName);
    this.scene.add(this.player.label);
    this.entities.push(this.player);
  }

  watchAdToRevive() {
    if (this.adRevivesUsed >= 1) return;
    // Simulate watching an ad (3 second countdown)
    const btn = document.getElementById('btn-ad-revive');
    btn.textContent = '⏳ Loading Ad... 3';
    btn.style.pointerEvents = 'none';
    let countdown = 3;
    const timer = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        btn.textContent = '⏳ Watching... ' + countdown;
      } else {
        clearInterval(timer);
        btn.textContent = '📺 Watch Ad to Revive';
        btn.style.pointerEvents = '';
        this.adRevivesUsed++;
        // Revive player
        document.getElementById('death-screen').style.display = 'none';
        document.getElementById('ui-layer').style.display = 'block';
        this.playing = true;
        const pidx = this.isConnected ? Multiplayer.getMyPlayerIndex() : 0;
        this.player = new Player(this.scene, pidx);
        this.player.color = this.playerColor;
        if (this.player.mesh) this.player.mesh.material.color.setHex(this.playerColor);
        const reviveSize = Math.max(1, Math.floor(this.deathSize / 2));
        this.player.setSize(reviveSize);
        this.player.kills = this.deathKills;
        const pos = this.deathPos || new THREE.Vector3((Math.random() - 0.5) * 800, 0.5, (Math.random() - 0.5) * 800);
        this.player.position.set(pos.x + (Math.random() - 0.5) * 20, 0.5, pos.z + (Math.random() - 0.5) * 20);
        this.player.targetPos.copy(this.player.position);
        this.player.label = this.createLabel(this.playerName);
        this.scene.add(this.player.label);
        this.entities.push(this.player);
      }
    }, 1000);
  }

  showDeath() {
    this.playing = false;
    this.deathSize = this.player.size;
    this.deathKills = this.player.kills;
    this.deathPos = this.player.position.clone();
    this.deactivatePowerUp();
    document.getElementById('ui-layer').style.display = 'none';
    document.getElementById('death-stats').textContent = 'Score: ' + this.player.size + ' | Kills: ' + this.player.kills;
    const adBtn = document.getElementById('btn-ad-revive');
    adBtn.style.display = this.adRevivesUsed < 1 ? 'inline-block' : 'none';
    adBtn.textContent = '📺 Watch Ad to Revive';
    adBtn.style.pointerEvents = '';
    document.getElementById('death-screen').style.display = 'flex';
    // Hide player
    if (this.player) {
      const idx = this.entities.indexOf(this.player);
      if (idx !== -1) this.entities.splice(idx, 1);
      this.player.destroy();
      if (this.player.label) this.scene.remove(this.player.label);
      this.player = null;
    }
  }

  showWin() {
    this.playing = false;
    document.getElementById('ui-layer').style.display = 'none';
    document.getElementById('win-stats').textContent = 'Score: ' + this.player.size + ' | Kills: ' + this.player.kills;
    document.getElementById('win-screen').style.display = 'flex';
    this.wins++;
    this.winScore = 60 + this.wins;
    this.refreshColorSwatches();
    if (this.player) {
      const idx = this.entities.indexOf(this.player);
      if (idx !== -1) this.entities.splice(idx, 1);
      this.player.destroy();
      if (this.player.label) this.scene.remove(this.player.label);
      this.player = null;
    }
  }

  refreshColorSwatches() {
    const swatches = document.getElementById('color-grid').querySelectorAll('.color-swatch');
    const allColors = this.colorSwatches;
    swatches.forEach((swatch, i) => {
      if (!allColors[i]) return;
      const locked = allColors[i].wins > this.wins;
      swatch.classList.toggle('locked', locked);
      if (locked) swatch.setAttribute('data-req', allColors[i].wins + ' wins');
      else swatch.removeAttribute('data-req');
    });
  }

  createCrownMesh(color) {
    const group = new THREE.Group();
    // Base ring
    const baseMat = new THREE.MeshLambertMaterial({ color: color, emissive: color, emissiveIntensity: 0.3 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.2, 8), baseMat);
    group.add(base);
    // Crown points (5 spikes)
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i) / 5;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.5, 4), baseMat);
      spike.position.set(Math.cos(angle) * 0.45, 0.35, Math.sin(angle) * 0.45);
      group.add(spike);
    }
    this.scene.add(group);
    return group;
  }

  createLabel(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 128);
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(text, 128, 55);
    ctx.fillText(text, 128, 55);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(4, 2, 1);
    sprite.renderOrder = 999;
    return sprite;
  }

  updateLabel(sprite, text) {
    const canvas = sprite.material.map.image;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 128);
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(text, 128, 55);
    ctx.fillText(text, 128, 55);
    sprite.material.map.needsUpdate = true;
  }

  createArena() {
    const geo = new THREE.PlaneGeometry(1000, 1000);
    const mat = new THREE.MeshLambertMaterial({ color: 0x16213e });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridGeo = new THREE.PlaneGeometry(1000, 1000, 50, 50);
    const gridMat = new THREE.MeshBasicMaterial({ color: 0x1f3460, wireframe: true, transparent: true, opacity: 0.3 });
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = 0.05;
    this.scene.add(grid);

    const wallMat = new THREE.MeshLambertMaterial({ color: 0xff2244, transparent: true, opacity: 0.4 });
    const positions = [[0, 2, -500], [0, 2, 500], [-500, 2, 0], [500, 2, 0]];
    const sizes = [[1000, 4, 1], [1000, 4, 1], [1, 4, 1000], [1, 4, 1000]];
    for (let i = 0; i < 4; i++) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(...sizes[i]), wallMat);
      w.position.set(...positions[i]);
      this.scene.add(w);
    }
  }

  async initMultiplayer() {
    await Multiplayer.connect();
    this.isConnected = true;

    Multiplayer.onPlayerJoin((p) => {
      const rp = new RemotePlayer(this.scene, p.playerIndex);
      if (p.x != null) rp.targetPos.set(p.x, p.y || 0.5, p.z);
      if (p.size != null) rp.size = p.size;
      if (p.score != null) rp.score = p.score;
      rp.displayName = p.dn || ('Player ' + p.playerIndex);
      if (p.color != null && rp.mesh) rp.mesh.material.color.setHex(p.color);
      rp.label = this.createLabel(rp.displayName);
      this.scene.add(rp.label);
      this.remotePlayers[p.id] = rp;
      this.entities.push(rp);
    });

    Multiplayer.onPlayerLeave((data) => {
      const rp = this.remotePlayers[data.id];
      if (rp) {
        const i = this.entities.indexOf(rp);
        if (i !== -1) this.entities.splice(i, 1);
        if (rp.label) this.scene.remove(rp.label);
        rp.destroy();
        delete this.remotePlayers[data.id];
      }
    });

    Multiplayer.on('playerUpdate', (data) => {
      const rp = this.remotePlayers[data.id];
      if (rp) {
        rp.targetPos.set(data.x, data.y, data.z);
        rp.targetRotY = data.ry || 0;
        if (data.size != null) rp.size = data.size;
        if (data.score != null) rp.score = data.score;
        if (data.dn != null) rp.displayName = data.dn;
        if (data.color != null && rp.mesh) rp.mesh.material.color.setHex(data.color);
        if (rp.label) {
          const s = rp.getScale();
          this.updateLabel(rp.label, rp.displayName + '\n' + rp.size);
          rp.label.position.set(rp.position.x, rp.position.y + s + 1.5, rp.position.z);
          rp.label.scale.set(2 + s * 0.5, 1 + s * 0.25, 1);
        }
      }
    });

    Multiplayer.onMessage('playerKilled', (data) => {
      if (data.victimId === Multiplayer.getMyId() && this.player && this.playing) {
        this.spawnDeathFood(this.player.position.x, this.player.position.z, this.player.size);
        this.showDeath();
      }
    });

    Multiplayer.onMessage('foodSpawn', (data) => {
      if (!this.foods[data.fid]) this.spawnFood(data.fid, data.fx, data.fz, data.fc);
    });
    Multiplayer.onMessage('foodEaten', (data) => {
      this.removeFood(data.fid);
    });
    Multiplayer.onMessage('specialFoodSpawn', (data) => {
      if (!this.foods[data.fid]) this.spawnSpecialFood(data.fid, data.fx, data.fz, data.fv);
    });

    Multiplayer.onGameDataUpdate((data) => {
      if (data && data.foods) {
        for (const f of data.foods) {
          if (!this.foods[f.id]) this.spawnFood(f.id, f.x, f.z, f.c);
        }
      }
    });

    const gd = Multiplayer.getGameData();
    if (gd && gd.foods) {
      for (const f of gd.foods) {
        if (!this.foods[f.id]) this.spawnFood(f.id, f.x, f.z, f.c);
      }
    }

    if (Multiplayer.isHost()) {
      this.spawnInitialFood();
    } else {
      // Non-host: wait a moment then check if food arrived via gameData
      setTimeout(() => {
        if (Object.keys(this.foods).length === 0) {
          const gd2 = Multiplayer.getGameData();
          if (gd2 && gd2.foods) {
            for (const f of gd2.foods) {
              if (!this.foods[f.id]) this.spawnFood(f.id, f.x, f.z, f.c);
            }
          }
        }
      }, 2000);
    }

    this.spawnBots(99);

    // Spawn initial power-ups
    for (let i = 0; i < 8; i++) this.spawnOnePowerUp();
  }

  spawnBots(count) {
    for (let i = 0; i < count; i++) {
      const botIdx = 50 + i;
      const bot = new RemotePlayer(this.scene, botIdx);
      bot.position.set((Math.random() - 0.5) * 800, 0.5, (Math.random() - 0.5) * 800);
      bot.targetPos.copy(bot.position);
      bot.size = 1 + Math.floor(Math.random() * 5);
      const botNames = ['xXSlayerXx','NoobMaster','CubeKing','BlockBuster','PixelPro','CubeCrusher','GameOver','GG_EZ','ProGamer','NinjaBlock','ShadowCube','TurboBlox','MegaCube','IceCold','FireStorm','ThunderBox','SwiftCube','DarkMatter','LaserBeam','RocketMan','BlitzKing','StormChaser','NightHawk','IronCube','GhostBlock','ToxicCube','ElitePro','DiamondBox','CyberCube','NeonBlitz','PhantomX','ViperCube','BlazeKing','FrostBite','AceCube'];
      bot.displayName = Math.random() < 0.5 ? botNames[Math.floor(Math.random() * botNames.length)] : ('Player_' + String(Math.floor(1000 + Math.random() * 9000)));
      bot.isBot = true;
      bot.botTarget = new THREE.Vector3((Math.random() - 0.5) * 800, 0, (Math.random() - 0.5) * 800);
      bot.botTimer = 0;
      bot.label = this.createLabel(bot.displayName);
      this.scene.add(bot.label);
      this.bots.push(bot);
      this.entities.push(bot);
    }
  }

  updateBots(dt) {
    for (const bot of this.bots) {
      bot.botTimer -= dt;
      if (bot.frozenTimer && bot.frozenTimer > 0) continue;
      const speed = Math.max(6, 18 - bot.size * 0.4);

      let nearestFood = null;
      let nearestDist = 40;
      for (const id in this.foods) {
        const f = this.foods[id];
        const d = bot.position.distanceTo(f.position);
        if (d < nearestDist) { nearestDist = d; nearestFood = f; }
      }

      let flee = null;
      let chase = null;
      const checkTarget = (other, otherSize) => {
        if (!other || !other.position) return;
        const d = bot.position.distanceTo(other.position);
        if (d < 25 && otherSize > bot.size + 2) flee = other;
        if (d < 30 && bot.size > otherSize + 2 && (!chase || d < bot.position.distanceTo(chase.position))) chase = other;
      };
      if (this.player) checkTarget(this.player, this.player.size);
      for (const b2 of this.bots) { if (b2 !== bot) checkTarget(b2, b2.size); }

      if (flee) {
        const dir = new THREE.Vector3().subVectors(bot.position, flee.position).normalize().multiplyScalar(40);
        bot.botTarget.set(bot.position.x + dir.x, 0, bot.position.z + dir.z);
      } else if (chase) {
        bot.botTarget.copy(chase.position);
      } else if (nearestFood) {
        bot.botTarget.copy(nearestFood.position);
      } else if (bot.botTimer <= 0) {
        bot.botTarget.set((Math.random() - 0.5) * 800, 0, (Math.random() - 0.5) * 800);
        bot.botTimer = 3 + Math.random() * 3;
      }

      const dir = new THREE.Vector3(bot.botTarget.x - bot.position.x, 0, bot.botTarget.z - bot.position.z);
      if (dir.length() > 0.5) {
        dir.normalize();
        bot.targetPos.x = bot.position.x + dir.x * speed * dt;
        bot.targetPos.z = bot.position.z + dir.z * speed * dt;
        bot.targetRotY = Math.atan2(dir.x, dir.z);
      }
      bot.targetPos.x = THREE.MathUtils.clamp(bot.targetPos.x, -490, 490);
      bot.targetPos.z = THREE.MathUtils.clamp(bot.targetPos.z, -490, 490);
      const s = bot.getScale();
      bot.targetPos.y = s / 2;

      // Bot eats food
      const bs = bot.getScale();
      for (const id in this.foods) {
        const f = this.foods[id];
        if (bot.position.distanceTo(f.position) < bs * 0.6 + 0.25) {
          const gain = f.isSpecial ? f.specialValue : 1;
          bot.size = Math.max(1, bot.size + gain);
          this.removeFood(id);
          if (Multiplayer.isHost()) this.hostSpawnOneFood();
          break;
        }
      }

      // Bot vs bot
      for (const b2 of this.bots) {
        if (b2 === bot) continue;
        const d = bot.position.distanceTo(b2.position);
        if (d < (bot.getScale() + b2.getScale()) * 0.4) {
          if (bot.size > b2.size + 2) {
            bot.size += Math.floor(b2.size / 2);
            this.spawnDeathFood(b2.position.x, b2.position.z, b2.size);
            b2.size = 1;
            b2.position.set((Math.random() - 0.5) * 800, 0.5, (Math.random() - 0.5) * 800);
            b2.targetPos.copy(b2.position);
          }
        }
      }

      // Update label
      if (bot.label) {
        this.updateLabel(bot.label, bot.displayName + '\n' + bot.size);
        bot.label.position.set(bot.position.x, bot.position.y + bs + 1.5, bot.position.z);
        bot.label.scale.set(2 + bs * 0.5, 1 + bs * 0.25, 1);
      }
    }
  }

  spawnFoodAt(x, z) {
    const id = 'f' + Math.random().toString(36).substr(2, 9);
    const colors = [0xff6b6b, 0x51cf66, 0x339af0, 0xfcc419, 0xcc5de8, 0x20c997, 0xff922b];
    const c = colors[Math.floor(Math.random() * colors.length)];
    this.spawnFood(id, x, z, c);
    if (this.isConnected) Multiplayer.sendMessage('foodSpawn', { fid: id, fx: x, fz: z, fc: c });
  }

  spawnDeathFood(x, z, size) {
    const count = Math.min(size, 15);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const dist = 1 + Math.random() * 2;
      this.spawnFoodAt(x + Math.cos(angle) * dist, z + Math.sin(angle) * dist);
    }
  }

  spawnFood(id, x, z, color) {
    const f = new Food(this.scene, id, x, z, color);
    f.setFoodValue(1);
    this.foods[id] = f;
    this.entities.push(f);
  }

  removeFood(id) {
    const f = this.foods[id];
    if (f) {
      const i = this.entities.indexOf(f);
      if (i !== -1) this.entities.splice(i, 1);
      f.destroy();
      delete this.foods[id];
    }
  }

  spawnInitialFood() {
    for (let i = 0; i < 900; i++) this.hostSpawnOneFood();
    for (let i = 0; i < 120; i++) this.hostSpawnOneSpecialFood();
    this.syncFoodGameData();
  }

  hostSpawnOneSpecialFood() {
    const id = 's' + Math.random().toString(36).substr(2, 9);
    const x = (Math.random() - 0.5) * 900;
    const z = (Math.random() - 0.5) * 900;
    const values = [5, 10, 15, 20, -5, -10, -15, -20];
    const val = values[Math.floor(Math.random() * values.length)];
    this.spawnSpecialFood(id, x, z, val);
    Multiplayer.sendMessage('specialFoodSpawn', { fid: id, fx: x, fz: z, fv: val });
  }

  spawnSpecialFood(id, x, z, value) {
    if (this.foods[id]) return;
    const color = value > 0 ? (value >= 15 ? 0xffd700 : 0x00ff88) : (value <= -15 ? 0xff0000 : 0xff6600);
    const f = new Food(this.scene, id, x, z, color);
    f.specialValue = value;
    f.isSpecial = true;
    f.setFoodValue(value);
    const scale = 0.5 + Math.abs(value) * 0.05;
    if (f.mesh) f.mesh.scale.set(scale, scale, scale);
    this.foods[id] = f;
    this.entities.push(f);
  }

  hostSpawnOneFood() {
    const id = 'f' + Math.random().toString(36).substr(2, 9);
    const x = (Math.random() - 0.5) * 900;
    const z = (Math.random() - 0.5) * 900;
    const colors = [0xff6b6b, 0x51cf66, 0x339af0, 0xfcc419, 0xcc5de8, 0x20c997, 0xff922b];
    const c = colors[Math.floor(Math.random() * colors.length)];
    this.spawnFood(id, x, z, c);
    Multiplayer.sendMessage('foodSpawn', { fid: id, fx: x, fz: z, fc: c });
  }

  syncFoodGameData() {
    if (!Multiplayer.isHost()) return;
    const foodArr = Object.values(this.foods).map(f => ({ id: f.foodId, x: f.position.x, z: f.position.z, c: f.foodColor }));
    Multiplayer.setGameData({ foods: foodArr });
  }

  foodTimer = 0;
  syncTimer = 0;

  update() {
    const dt = 1 / 60;

    // Always update fog to prevent blur
    if (this.player) {
      const fogNear = 50 + this.player.size * 5;
      const fogFar = 500 + this.player.size * 30;
      this.scene.fog.near = fogNear;
      this.scene.fog.far = fogFar;
    }

    if (this.player && this.playing) {
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(this.mouseScreen, this.camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, target);
      if (target) {
        this.input.mx = target.x;
        this.input.mz = target.z;
      }
      // Mobile joystick override
      if (this.joystickActive && this.player && (this.joystickDir.x !== 0 || this.joystickDir.z !== 0)) {
        this.input.mx = this.player.position.x + this.joystickDir.x * 30;
        this.input.mz = this.player.position.z + this.joystickDir.z * 30;
      }
    }

    this.updateBots(dt);

    for (const e of this.entities) {
      if (e === this.player) e.update(dt, this.playing ? this.input : null);
      else e.update(dt);
    }

    if (this.player && this.playing) {
      // Win check
      if (this.player.size >= this.winScore) {
        this.showWin();
        return;
      }

      // Update progress bar
      const pct = Math.min(100, (this.player.size / this.winScore) * 100);
      document.getElementById('progress-fill').style.width = pct + '%';
      document.getElementById('progress-label').textContent = this.player.size + ' / ' + this.winScore;

      const ps = this.player.getScale();
      for (const id in this.foods) {
        const f = this.foods[id];
        const dist = this.player.position.distanceTo(f.position);
        if (dist < ps * 0.6 + 0.25) {
          let gain = f.isSpecial ? f.specialValue : 1;
          if (gain > 0) gain = Math.round(gain * this.scoreMultiplier);
          this.player.setSize(Math.max(1, this.player.size + gain));
          this.player.score = this.player.size;
          Multiplayer.sendMessage('foodEaten', { fid: id });
          this.removeFood(id);
          if (Multiplayer.isHost()) this.hostSpawnOneFood();
        }
      }

      // Player vs opponents
      const allOpponents = [...Object.values(this.remotePlayers), ...this.bots];
      for (const rp of allOpponents) {
        const dist = this.player.position.distanceTo(rp.position);
        const myS = this.player.getScale();
        const theirS = rp.getScale();
        if (dist < (myS + theirS) * 0.4) {
          if (this.player.size > rp.size + 2) {
            this.player.setSize(this.player.size + Math.floor(rp.size / 2));
            this.player.score = this.player.size;
            this.player.kills++;
            if (rp.isBot) {
              this.spawnDeathFood(rp.position.x, rp.position.z, rp.size);
              rp.size = 1;
              rp.position.set((Math.random() - 0.5) * 800, 0.5, (Math.random() - 0.5) * 800);
              rp.targetPos.copy(rp.position);
            } else {
              // Killed a real player
              const victimId = Object.keys(this.remotePlayers).find(id => this.remotePlayers[id] === rp);
              if (victimId) {
                Multiplayer.sendMessage('playerKilled', { victimId: victimId });
                this.spawnDeathFood(rp.position.x, rp.position.z, rp.size);
              }
            }
          } else if (rp.size > this.player.size + 2) {
            if (this.activePowerUp === 'shield') {
              // Shield protects! Bounce away and consume shield
              this.deactivatePowerUp();
            } else {
              if (rp.isBot) rp.size += Math.floor(this.player.size / 2);
              this.spawnDeathFood(this.player.position.x, this.player.position.z, this.player.size);
              this.showDeath();
              return;
            }
          }
        }
      }

      // Camera follow
      const eagleMult = this.eagleActive ? 2.2 : 1;
      const camH = (15 + this.player.size * 0.8) * eagleMult;
      const camD = (12 + this.player.size * 0.5) * eagleMult;
      this.camera.position.lerp(new THREE.Vector3(this.player.position.x, camH, this.player.position.z + camD), 0.05);
      this.camera.lookAt(this.player.position);

      // Update directional light to follow player
      this.dirLight.position.set(this.player.position.x + 200, 400, this.player.position.z + 200);
      this.dirLight.target.position.copy(this.player.position);
      this.dirLight.target.updateMatrixWorld();

      // Update player label
      if (this.player.label) {
        this.updateLabel(this.player.label, this.playerName + ': ' + this.player.size);
        const pScale = this.player.getScale();
        this.player.label.position.set(this.player.position.x, this.player.position.y + pScale + 1.5, this.player.position.z);
        this.player.label.scale.set(2 + pScale * 0.5, 1 + pScale * 0.25, 1);
      }

      // Power-up collection
      for (const id in this.powerUps) {
        const pu = this.powerUps[id];
        if (this.player.position.distanceTo(pu.position) < ps * 0.6 + 1) {
          this.activatePowerUp(pu.type);
          const idx2 = this.entities.indexOf(pu);
          if (idx2 !== -1) this.entities.splice(idx2, 1);
          pu.destroy();
          delete this.powerUps[id];
        }
      }

      // Magnet effect: attract nearby food
      if (this.activePowerUp === 'magnet') {
        for (const id in this.foods) {
          const f = this.foods[id];
          const d = this.player.position.distanceTo(f.position);
          if (d < 25) {
            const dir2 = new THREE.Vector3().subVectors(this.player.position, f.position).normalize();
            f.position.x += dir2.x * 15 * dt;
            f.position.z += dir2.z * 15 * dt;
          }
        }
      }

      // Update active power-up timer
      if (this.activePowerUp) {
        this.powerUpTimer -= dt;
        if (this.powerUpTimer <= 0) {
          this.deactivatePowerUp();
        }
      }

      // Update shield visual
      if (this.shieldMesh) {
        const ss = this.player.getScale();
        this.shieldMesh.position.copy(this.player.position);
        this.shieldMesh.scale.set(ss * 1.4, ss * 1.4, ss * 1.4);
        this.shieldMesh.rotation.y += dt * 2;
        this.shieldMesh.material.opacity = 0.15 + Math.sin(Date.now() * 0.005) * 0.1;
      }

      // Update laser beam
      if (this.laserMesh) {
        this.laserTimer -= dt;
        if (this.laserTimer <= 0) {
          this.scene.remove(this.laserMesh);
          this.laserMesh = null;
        }
      }

      // Update traps
      for (let i = this.traps.length - 1; i >= 0; i--) {
        const trap = this.traps[i];
        trap.update(dt);
        if (trap.lifetime <= 0) {
          const ei = this.entities.indexOf(trap);
          if (ei !== -1) this.entities.splice(ei, 1);
          trap.destroy();
          this.traps.splice(i, 1);
          continue;
        }
        if (!trap.triggered) {
          for (const bot of this.bots) {
            if (bot.position.distanceTo(trap.position) < bot.getScale() * 0.5 + 1) {
              trap.triggered = true;
              const dmg = Math.max(1, Math.floor(bot.size * 0.4));
              this.spawnDeathFood(bot.position.x, bot.position.z, dmg);
              bot.size = Math.max(1, bot.size - dmg);
              this.spawnVFX(trap.position.x, trap.position.z, 0xff2222, 3);
              const ei2 = this.entities.indexOf(trap);
              if (ei2 !== -1) this.entities.splice(ei2, 1);
              trap.destroy();
              this.traps.splice(i, 1);
              break;
            }
          }
        }
      }

      // Update VFX
      for (let i = this.vfxObjects.length - 1; i >= 0; i--) {
        const vfx = this.vfxObjects[i];
        vfx.life -= dt;
        if (vfx.life <= 0) {
          this.scene.remove(vfx.mesh);
          this.vfxObjects.splice(i, 1);
        } else {
          const s = vfx.maxRadius * (1 - vfx.life / vfx.maxLife);
          vfx.mesh.scale.set(s, 0.3, s);
          vfx.mesh.material.opacity = vfx.life / vfx.maxLife * 0.5;
        }
      }

      // Unfreeze bots
      for (const bot of this.bots) {
        if (bot.frozenTimer && bot.frozenTimer > 0) {
          bot.frozenTimer -= dt;
          if (bot.frozenTimer <= 0) {
            bot.frozenTimer = 0;
            if (bot.mesh) bot.mesh.material.color.setHex(bot.getColor(bot.playerIndex));
          }
        }
      }

      // Power-up status in score
      let puText = '';
      if (this.activePowerUp) {
        const puIcons = { shield: '🛡️', magnet: '🧲', speed: '⚡', score: '×2', eagle: '🦅' };
        puText = '  ' + (puIcons[this.activePowerUp] || '') + ' ' + Math.ceil(this.powerUpTimer) + 's';
      }
      document.getElementById('score').textContent = 'Size: ' + this.player.size + '  |  Kills: ' + this.player.kills + (this.player.boosting && this.player.size > 2 ? '  ⚡ BOOST' : '') + puText;
    }

    // Spawn power-ups periodically
    this.powerUpSpawnTimer += dt;
    if (this.powerUpSpawnTimer > 5 && Object.keys(this.powerUps).length < 20) {
      this.powerUpSpawnTimer = 0;
      this.spawnOnePowerUp();
    }

    // Bots collect power-ups
    for (const bot of this.bots) {
      for (const id in this.powerUps) {
        const pu = this.powerUps[id];
        if (bot.position.distanceTo(pu.position) < bot.getScale() * 0.6 + 1) {
          // Bot gets a temporary size boost from power-ups
          if (pu.type === 'speed') bot.size += 3;
          else if (pu.type === 'shield') bot.size += 2;
          else if (pu.type === 'magnet') bot.size += 4;
          const idx3 = this.entities.indexOf(pu);
          if (idx3 !== -1) this.entities.splice(idx3, 1);
          pu.destroy();
          delete this.powerUps[id];
          break;
        }
      }
    }

    // Host: respawn food
    if (Multiplayer.isHost && Multiplayer.isHost()) {
      this.foodTimer += dt;
      this.syncTimer += dt;
      if (Object.keys(this.foods).length < 1000 && this.foodTimer > 0.1) {
        this.foodTimer = 0;
        this.hostSpawnOneFood();
        this.hostSpawnOneFood();
        if (Math.random() < 0.3) this.hostSpawnOneSpecialFood();
      }
      if (this.syncTimer > 5) {
        this.syncTimer = 0;
        this.syncFoodGameData();
      }
    }

    if (this.isConnected && this.player) {
      Multiplayer.sendUpdate({
        x: this.player.position.x, y: this.player.position.y, z: this.player.position.z,
        ry: this.player.rotation.y, size: this.player.size, score: this.player.score,
        dn: this.playerName, color: this.playerColor, kills: this.player.kills
      });
    }

    this.updateLeaderboard();
  }

  lbTimer = 0;
  updateLeaderboard() {
    this.lbTimer++;
    if (this.lbTimer % 30 !== 0) return;
    const entries = [];
    if (this.player) entries.push({ name: this.playerName, size: this.player.size, entity: this.player });
    for (const id in this.remotePlayers) {
      const rp = this.remotePlayers[id];
      entries.push({ name: rp.displayName || ('Player ' + rp.playerIndex), size: rp.size, entity: rp });
    }
    for (const bot of this.bots) {
      entries.push({ name: bot.displayName, size: bot.size, entity: bot });
    }
    entries.sort((a, b) => b.size - a.size);

    // Update 3D crowns for top 3
    const crownColors = [0xffd700, 0xc0c0c0, 0xcd7f32];
    for (let i = 0; i < 3; i++) {
      const topEntity = entries[i] ? entries[i].entity : null;
      if (this.crownOwners[i] !== topEntity) {
        // Remove old crown
        if (this.crowns[i]) { this.scene.remove(this.crowns[i]); this.crowns[i] = null; }
        this.crownOwners[i] = topEntity;
        if (topEntity) {
          this.crowns[i] = this.createCrownMesh(crownColors[i]);
        }
      }
      if (this.crowns[i] && topEntity) {
        const s = topEntity.getScale();
        this.crowns[i].position.set(topEntity.position.x, topEntity.position.y + s * 0.55, topEntity.position.z);
        const crownScale = s * 0.6;
        this.crowns[i].scale.set(crownScale, crownScale, crownScale);
        this.crowns[i].rotation.y += 0.02;
      }
    }
    const icons = ['🏆', '🥈', '🥉'];
    const lb = document.getElementById('leaderboard');
    const top10 = entries.slice(0, 10);
    let html = '<div class="lb-title">LEADERBOARD</div>';
    let playerInTop = false;
    let playerRank = -1;
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].name === this.playerName) { playerRank = i; break; }
    }
    html += top10.map((e, i) => {
      const icon = i < 3 ? icons[i] : '<span class="lb-rank">' + (i + 1) + '.</span>';
      const isYou = e.name === this.playerName;
      if (isYou) playerInTop = true;
      return '<div class="lb-row' + (isYou ? ' lb-you' : '') + '">' + icon + ' ' + e.name + ' <span class="lb-size">' + e.size + '</span></div>';
    }).join('');
    if (!playerInTop && playerRank >= 0) {
      const me = entries[playerRank];
      html += '<div class="lb-sep">···</div>';
      html += '<div class="lb-row lb-you"><span class="lb-rank">' + (playerRank + 1) + '.</span> ' + me.name + ' <span class="lb-size">' + me.size + '</span></div>';
    }
    lb.innerHTML = html;
  }

  spawnOnePowerUp() {
    const id = 'pu' + Math.random().toString(36).substr(2, 9);
    const x = (Math.random() - 0.5) * 900;
    const z = (Math.random() - 0.5) * 900;
    const types = ['shield', 'magnet', 'speed', 'score', 'eagle', 'shockwave', 'laser', 'explosion', 'freeze', 'trap'];
    const type = types[Math.floor(Math.random() * types.length)];
    const pu = new PowerUp(this.scene, id, x, z, type);
    this.powerUps[id] = pu;
    this.entities.push(pu);
  }

  activatePowerUp(type) {
    this.deactivatePowerUp();
    this.activePowerUp = type;
    this.powerUpTimer = 10;

    if (type === 'shield' && this.player) {
      const geo = new THREE.SphereGeometry(1, 16, 16);
      const mat = new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.2, wireframe: true });
      this.shieldMesh = new THREE.Mesh(geo, mat);
      this.scene.add(this.shieldMesh);
    }
    if (type === 'speed' && this.player) {
      this.player.speedMultiplier = 3.0;
    }
    if (type === 'score') {
      this.scoreMultiplier = 2;
    }
    if (type === 'eagle') {
      this.eagleActive = true;
    }
    // Instant abilities (no timer)
    if (type === 'shockwave') {
      this.doShockwave();
      this.activePowerUp = null;
      this.powerUpTimer = 0;
    }
    if (type === 'laser') {
      this.doLaser();
      this.activePowerUp = null;
      this.powerUpTimer = 0;
    }
    if (type === 'explosion') {
      this.doExplosion();
      this.activePowerUp = null;
      this.powerUpTimer = 0;
    }
    if (type === 'freeze') {
      this.doFreeze();
      this.activePowerUp = null;
      this.powerUpTimer = 0;
    }
    if (type === 'trap') {
      this.doTrap();
      this.activePowerUp = null;
      this.powerUpTimer = 0;
    }
  }

  doShockwave() {
    if (!this.player) return;
    const px = this.player.position.x, pz = this.player.position.z;
    const radius = 20;
    this.spawnVFX(px, pz, 0x00ffff, radius);
    for (const bot of this.bots) {
      const d = bot.position.distanceTo(this.player.position);
      if (d < radius && d > 0) {
        const push = new THREE.Vector3().subVectors(bot.position, this.player.position).normalize().multiplyScalar(25);
        bot.targetPos.x = THREE.MathUtils.clamp(bot.position.x + push.x, -490, 490);
        bot.targetPos.z = THREE.MathUtils.clamp(bot.position.z + push.z, -490, 490);
        bot.position.x = bot.targetPos.x;
        bot.position.z = bot.targetPos.z;
      }
    }
  }

  doLaser() {
    if (!this.player) return;
    const dir = new THREE.Vector3(
      this.input.mx - this.player.position.x, 0,
      this.input.mz - this.player.position.z
    ).normalize();
    const length = 60;
    const geo = new THREE.BoxGeometry(0.3, 0.5, length);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff0044, transparent: true, opacity: 0.8 });
    this.laserMesh = new THREE.Mesh(geo, mat);
    this.laserMesh.position.set(
      this.player.position.x + dir.x * length / 2,
      1,
      this.player.position.z + dir.z * length / 2
    );
    this.laserMesh.rotation.y = Math.atan2(dir.x, dir.z);
    this.scene.add(this.laserMesh);
    this.laserTimer = 2;
    // Hit bots along beam
    for (const bot of this.bots) {
      const toBot = new THREE.Vector3().subVectors(bot.position, this.player.position);
      toBot.y = 0;
      const proj = toBot.dot(dir);
      if (proj > 0 && proj < length) {
        const perp = toBot.clone().sub(dir.clone().multiplyScalar(proj));
        if (perp.length() < 2 + bot.getScale() * 0.5) {
          const dmg = Math.max(1, Math.floor(bot.size * 0.3));
          this.spawnDeathFood(bot.position.x, bot.position.z, dmg);
          bot.size = Math.max(1, bot.size - dmg);
          this.player.kills++;
        }
      }
    }
  }

  doExplosion() {
    if (!this.player) return;
    const px = this.player.position.x, pz = this.player.position.z;
    const radius = 15;
    this.spawnVFX(px, pz, 0xff6600, radius);
    for (const bot of this.bots) {
      const d = bot.position.distanceTo(this.player.position);
      if (d < radius) {
        const dmg = Math.max(1, Math.floor(bot.size * 0.5));
        this.spawnDeathFood(bot.position.x, bot.position.z, dmg);
        bot.size = Math.max(1, bot.size - dmg);
        this.player.kills++;
      }
    }
  }

  doFreeze() {
    if (!this.player) return;
    const radius = 25;
    this.spawnVFX(this.player.position.x, this.player.position.z, 0x66ddff, radius);
    for (const bot of this.bots) {
      const d = bot.position.distanceTo(this.player.position);
      if (d < radius) {
        bot.frozenTimer = 1 + Math.random();
        if (bot.mesh) bot.mesh.material.color.setHex(0x88ccff);
      }
    }
  }

  doTrap() {
    if (!this.player) return;
    const trap = new Trap(this.scene, this.player.position.x, this.player.position.z, this.playerName);
    this.traps.push(trap);
    this.entities.push(trap);
  }

  spawnVFX(x, z, color, radius) {
    const geo = new THREE.CylinderGeometry(1, 1, 0.3, 32);
    const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.2, z);
    this.scene.add(mesh);
    this.vfxObjects.push({ mesh, life: 0.8, maxLife: 0.8, maxRadius: radius });
  }

  deactivatePowerUp() {
    if (this.shieldMesh) {
      this.scene.remove(this.shieldMesh);
      this.shieldMesh = null;
    }
    if (this.player) this.player.speedMultiplier = 1;
    this.scoreMultiplier = 1;
    this.eagleActive = false;
    this.activePowerUp = null;
    this.powerUpTimer = 0;
  }

  getObjectAt(sx, sy) {
    const mouse = new THREE.Vector2((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
    const rc = new THREE.Raycaster();
    rc.setFromCamera(mouse, this.camera);
    const meshes = this.entities.map(e => e.mesh).filter(m => m);
    const hits = rc.intersectObjects(meshes);
    if (hits.length > 0) return this.entities.find(e => e.mesh === hits[0].object);
    return null;
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  start() {
    const loop = () => {
      requestAnimationFrame(loop);
      this.update();
      this.render();
    };
    loop();
  }
}

const game = new Game();
game.start();
