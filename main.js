// ============= FLOW ARYZON - MOTEUR DE JEU COMPLET =============
// Version 1.0 - Jeu 3D multijoueur avec Three.js

// ============= VARIABLES GLOBALES =============
let scene, camera, renderer, player, world = {};
let gameStarted = false;
let currentXP = 0, maxXP = 100, playerLevel = 1;
let playerHP = 100, maxHP = 100;
let auraLevel = 0; // 0: aucune, 1: bleu clair, 2: bleu foncé, ..., 10: noir
let playerMuscle = 0; // 0-100 (0 = squelettique, 100 = musclé normal)
let gameObjects = [];
let monsters = [];
let otherPlayers = {};
let chatMessages = [];
let isTraining = false, inCombat = false;
let keys = {};
let controls = { forward: false, backward: false, left: false, right: false };
let mouseX = 0, mouseY = 0;
let cameraOffset = { x: 0, y: 15, z: 20 };
let clock = new THREE.Clock();
let mixers = [];
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

// État du jeu
const gameState = {
    playerId: 'player_' + Math.random().toString(36).substr(2, 9),
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    team: [],
    friends: [],
    inventory: ['💪', '⚔️', '🛡️', '⚡', '🔮'],
    activeSlot: 0,
    settings: {
        graphics: 'medium',
        sound: true,
        chat: true,
        mouseSensitivity: 1.0
    },
    stats: {
        strength: 1,
        defense: 1,
        speed: 1,
        energy: 100,
        maxEnergy: 100
    }
};

// Configuration du jeu
const CONFIG = {
    WORLD_SIZE: 1000,
    MOVEMENT_SPEED: 8,
    JUMP_FORCE: 12,
    GRAVITY: -25,
    XP_MULTIPLIER: 1.0,
    TRAINING_XP: 10,
    MONSTER_XP: 25,
    AURA_LEVELS: [0, 100, 200, 300, 500, 700, 1000, 1500, 2000, 3000, 5000],
    RESPAWN_TIME: 5000
};

// ============= INITIALISATION =============
function initGame() {
    console.log('🎮 Initialisation de Flow Aryzon...');
    
    // Initialisation Three.js
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 100, 800);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('gameCanvas'), 
        antialias: true,
        alpha: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x87CEEB);

    // Lumières
    setupLighting();
    
    // Création du monde
    createWorld();
    createPlayer();
    setupControls();
    setupMinimap();
    setupUI();
    
    // Simulation multijoueur
    simulateMultiplayer();
    
    // Démarrage du loop de jeu
    animate();
    
    console.log('✅ Flow Aryzon initialisé avec succès!');
}

function setupLighting() {
    // Lumière ambiante
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    // Lumière directionnelle (soleil)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);

    // Lumière d'accentuation
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x228B22, 0.4);
    scene.add(hemisphereLight);
}

function createWorld() {
    console.log('🌍 Création du monde...');
    
    // Sol principal (immense carte)
    const groundGeometry = new THREE.PlaneGeometry(CONFIG.WORLD_SIZE, CONFIG.WORLD_SIZE, 100, 100);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x228B22,
        transparent: true,
        opacity: 0.9
    });
    
    // Ajouter de la variation au terrain
    const vertices = groundGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        vertices[i + 2] = Math.random() * 2 - 1; // Variation de hauteur
    }
    groundGeometry.attributes.position.needsUpdate = true;
    groundGeometry.computeVertexNormals();
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData = { type: 'ground' };
    scene.add(ground);
    world.ground = ground;

    // Création des différentes zones
    createMountains();
    createForest();
    createTrainingArea();
    createPortals();
    spawnMonsters();
    createPowerUps();
    
    console.log('✅ Monde créé avec succès!');
}

function createMountains() {
    const mountainGroup = new THREE.Group();
    
    for (let i = 0; i < 30; i++) {
        const height = Math.random() * 80 + 40;
        const radius = Math.random() * 30 + 15;
        
        const mountainGeometry = new THREE.ConeGeometry(radius, height, 8);
        const mountainMaterial = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color().setHSL(0.1, 0.4, Math.random() * 0.3 + 0.4)
        });
        
        const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
        mountain.position.set(
            (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 0.8,
            height / 2,
            (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 0.8
        );
        mountain.castShadow = true;
        mountain.receiveShadow = true;
        mountain.userData = { type: 'mountain' };
        
        mountainGroup.add(mountain);
    }
    
    scene.add(mountainGroup);
    world.mountains = mountainGroup;
}

function createForest() {
    const forestGroup = new THREE.Group();
    
    for (let i = 0; i < 150; i++) {
        const tree = createTree();
        tree.position.set(
            (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 0.7,
            0,
            (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 0.7
        );
        
        // Éviter de placer des arbres trop proche de la zone de spawn
        if (tree.position.distanceTo(new THREE.Vector3(0, 0, 0)) < 50) {
            continue;
        }
        
        forestGroup.add(tree);
        gameObjects.push(tree);
    }
    
    scene.add(forestGroup);
    world.forest = forestGroup;
}

function createTree() {
    const treeGroup = new THREE.Group();
    
    // Tronc
    const trunkGeometry = new THREE.CylinderGeometry(1 + Math.random(), 2 + Math.random(), 12 + Math.random() * 6, 8);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunk.geometry.parameters.height / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    
    // Feuillage
    const leavesGeometry = new THREE.SphereGeometry(6 + Math.random() * 4, 8, 6);
    const leavesMaterial = new THREE.MeshLambertMaterial({ 
        color: new THREE.Color().setHSL(0.3, 0.7, 0.3 + Math.random() * 0.2)
    });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.y = trunk.geometry.parameters.height + 4;
    leaves.castShadow = true;
    leaves.receiveShadow = true;
    
    treeGroup.add(trunk);
    treeGroup.add(leaves);
    treeGroup.userData = { type: 'tree' };
    
    return treeGroup;
}

function createTrainingArea() {
    const trainingGroup = new THREE.Group();
    
    // Zone d'entraînement au spawn
    const areaGeometry = new THREE.PlaneGeometry(60, 60);
    const areaMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x8B4513,
        transparent: true,
        opacity: 0.8
    });
    const trainingArea = new THREE.Mesh(areaGeometry, areaMaterial);
    trainingArea.rotation.x = -Math.PI / 2;
    trainingArea.position.y = 0.2;
    trainingArea.receiveShadow = true;
    trainingGroup.add(trainingArea);

    // Équipements d'entraînement
    const equipmentTypes = [
        { name: 'halteres', color: 0x696969, size: [3, 1, 8], xp: 10 },
        { name: 'barre', color: 0x556B2F, size: [8, 1, 1], xp: 15 },
        { name: 'poids', color: 0x2F4F4F, size: [2, 2, 2], xp: 8 },
        { name: 'machine', color: 0x483D8B, size: [4, 6, 3], xp: 20 }
    ];
    
    for (let i = 0; i < 15; i++) {
        const equipType = equipmentTypes[Math.floor(Math.random() * equipmentTypes.length)];
        const equipmentGeometry = new THREE.BoxGeometry(...equipType.size);
        const equipmentMaterial = new THREE.MeshLambertMaterial({ color: equipType.color });
        const equipment = new THREE.Mesh(equipmentGeometry, equipmentMaterial);
        
        equipment.position.set(
            (Math.random() - 0.5) * 50,
            equipType.size[1] / 2,
            (Math.random() - 0.5) * 50
        );
        equipment.castShadow = true;
        equipment.receiveShadow = true;
        equipment.userData = { 
            type: 'training', 
            subType: equipType.name,
            xpGain: equipType.xp,
            cooldown: 0
        };
        
        trainingGroup.add(equipment);
        gameObjects.push(equipment);
    }
    
    scene.add(trainingGroup);
    world.trainingArea = trainingGroup;
}

function createPortals() {
    const portalGroup = new THREE.Group();
    
    // Portail niveau 100 (Aura Zone)
    const portal1 = createPortal(0x00d4ff, 100, 0, 200);
    portal1.userData = { requiredLevel: 100, destination: 'aura_zone' };
    portalGroup.add(portal1);
    
    // Portail niveau 500 (Dark Zone)
    const portal2 = createPortal(0x8A2BE2, -150, 0, -200);
    portal2.userData = { requiredLevel: 500, destination: 'dark_zone' };
    portalGroup.add(portal2);
    
    // Portail niveau 1000 (Final Zone)
    const portal3 = createPortal(0x000000, 0, 0, -400);
    portal3.userData = { requiredLevel: 1000, destination: 'final_zone' };
    portalGroup.add(portal3);
    
    scene.add(portalGroup);
    world.portals = portalGroup;
}

function createPortal(color, x, y, z) {
    const portalGroup = new THREE.Group();
    
    // Anneau extérieur
    const ringGeometry = new THREE.TorusGeometry(8, 2, 8, 20);
    const ringMaterial = new THREE.MeshBasicMaterial({ 
        color: color,
        transparent: true,
        opacity: 0.8
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    
    // Centre énergétique
    const centerGeometry = new THREE.PlaneGeometry(12, 12);
    const centerMaterial = new THREE.MeshBasicMaterial({ 
        color: color,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.rotation.x = -Math.PI / 2;
    center.position.y = 0.1;
    
    portalGroup.add(ring);
    portalGroup.add(center);
    portalGroup.position.set(x, y + 5, z);
    portalGroup.userData = { type: 'portal' };
    
    // Animation du portail
    const animate = () => {
        ring.rotation.z += 0.02;
        center.rotation.z -= 0.01;
        requestAnimationFrame(animate);
    };
    animate();
    
    gameObjects.push(portalGroup);
    return portalGroup;
}

function spawnMonsters() {
    const monsterGroup = new THREE.Group();
    
    for (let i = 0; i < 80; i++) {
        const monster = createMonster();
        
        // Position aléatoire, mais pas trop proche du spawn
        let position;
        do {
            position = new THREE.Vector3(
                (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 0.8,
                0,
                (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 0.8
            );
        } while (position.distanceTo(new THREE.Vector3(0, 0, 0)) < 80);
        
        monster.position.copy(position);
        monsterGroup.add(monster);
        monsters.push(monster);
    }
    
    scene.add(monsterGroup);
    world.monsters = monsterGroup;
}

function createMonster() {
    const monsterGroup = new THREE.Group();
    
    // Corps principal
    const bodyGeometry = new THREE.SphereGeometry(2 + Math.random() * 2, 8, 6);
    const bodyMaterial = new THREE.MeshLambertMaterial({ 
        color: new THREE.Color().setHSL(Math.random(), 0.8, 0.4)
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = bodyGeometry.parameters.radius;
    body.castShadow = true;
    body.receiveShadow = true;
    
    // Yeux
    const eyeGeometry = new THREE.SphereGeometry(0.3, 6, 4);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    
    const eye1 = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye1.position.set(-0.8, 0.5, 1.5);
    const eye2 = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye2.position.set(0.8, 0.5, 1.5);
    
    body.add(eye1);
    body.add(eye2);
    
    monsterGroup.add(body);
    monsterGroup.userData = { 
        type: 'monster',
        hp: 50 + Math.random() * 50,
        maxHP: 50 + Math.random() * 50,
        xpReward: 25 + Math.random() * 25,
        level: Math.floor(Math.random() * 10) + 1,
        aggressive: Math.random() > 0.5,
        speed: 2 + Math.random() * 3,
        detectionRange: 20 + Math.random() * 10,
        attackDamage: 10 + Math.random() * 15,
        lastAttack: 0
    };
    
    return monsterGroup;
}

function createPowerUps() {
    const powerUpGroup = new THREE.Group();
    
    for (let i = 0; i < 20; i++) {
        const powerUp = createPowerUp();
        powerUp.position.set(
            (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 0.6,
            2,
            (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 0.6
        );
        powerUpGroup.add(powerUp);
        gameObjects.push(powerUp);
    }
    
    scene.add(powerUpGroup);
    world.powerUps = powerUpGroup;
}

function createPowerUp() {
    const types = [
        { name: 'xp', color: 0x00ff00, effect: 'xp_boost', value: 50 },
        { name: 'health', color: 0xff0000, effect: 'heal', value: 50 },
        { name: 'energy', color: 0x0000ff, effect: 'energy_boost', value: 100 },
        { name: 'strength', color: 0xffa500, effect: 'strength_boost', value: 2 }
    ];
    
    const type = types[Math.floor(Math.random() * types.length)];
    
    const geometry = new THREE.OctahedronGeometry(1.5);
    const material = new THREE.MeshBasicMaterial({ 
        color: type.color,
        transparent: true,
        opacity: 0.8
    });
    const powerUp = new THREE.Mesh(geometry, material);
    
    powerUp.userData = {
        type: 'powerup',
        subType: type.name,
        effect: type.effect,
        value: type.value,
        respawnTime: 30000,
        collected: false
    };
    
    // Animation de rotation
    const animate = () => {
        if (!powerUp.userData.collected) {
            powerUp.rotation.y += 0.02;
            powerUp.position.y = 2 + Math.sin(Date.now() * 0.005) * 0.5;
        }
        requestAnimationFrame(animate);
    };
    animate();
    
    return powerUp;
}

function createPlayer() {
    const playerGroup = new THREE.Group();
    
    // Corps (change selon le niveau de muscle)
    const bodyGeometry = new THREE.CapsuleGeometry(0.8, 3.5, 8, 16);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xffdbac });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 2;
    body.castShadow = true;
    body.receiveShadow = true;
    
    // Tête
    const headGeometry = new THREE.SphereGeometry(0.8, 16, 12);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffdbac });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 4.5;
    head.castShadow = true;
    head.receiveShadow = true;
    
    // Yeux
    const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 6);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    const eye1 = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye1.position.set(-0.3, 0.2, 0.7);
    const eye2 = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye2.position.set(0.3, 0.2, 0.7);
    
    head.add(eye1);
    head.add(eye2);
    
    // Bras
    const armGeometry = new THREE.CapsuleGeometry(0.3, 2, 6, 12);
    const armMaterial = new THREE.MeshLambertMaterial({ color: 0xffdbac });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-1.2, 2.5, 0);
    leftArm.castShadow = true;
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(1.2, 2.5, 0);
    rightArm.castShadow = true;
    
    // Jambes
    const legGeometry = new THREE.CapsuleGeometry(0.4, 2.5, 6, 12);
    const legMaterial = new THREE.MeshLambertMaterial({ color: 0x0000ff });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.5, 0.5, 0);
    leftLeg.castShadow = true;
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.5, 0.5, 0);
    rightLeg.castShadow = true;
    
    playerGroup.add(body);
    playerGroup.add(head);
    playerGroup.add(leftArm);
    playerGroup.add(rightArm);
    playerGroup.add(leftLeg);
    playerGroup.add(rightLeg);
    
    playerGroup.position.set(0, 0, 0);
    playerGroup.userData = { 
        type: 'player',
        id: gameState.playerId,
        body: body,
        head: head,
        leftArm: leftArm,
        rightArm: rightArm,
        leftLeg: leftLeg,
        rightLeg: rightLeg
    };
    
    scene.add(playerGroup);
    player = playerGroup;
    
    // Position de la caméra
    updateCameraPosition();
}

function updatePlayerMuscle() {
    if (!player) return;
    
    const userData = player.userData;
    const muscleScale = 1 + (playerMuscle / 100) * 0.5; // 1.0 à 1.5
    
    // Ajuster la taille du corps selon le niveau de muscle
    userData.body.scale.set(muscleScale, muscleScale, muscleScale);
    userData.leftArm.scale.set(muscleScale, muscleScale, muscleScale);
    userData.rightArm.scale.set(muscleScale, muscleScale, muscleScale);
}

function updatePlayerAura() {
    if (!player) return;
    
    // Supprimer l'ancienne aura
    const oldAura = player.getObjectByName('aura');
    if (oldAura) {
        player.remove(oldAura);
    }
    
    if (auraLevel === 0) return;
    
    // Créer la nouvelle aura
    const auraGeometry = new THREE.SphereGeometry(4, 32, 16);
    let auraColor, auraIntensity;
    
    if (auraLevel <= 3) {
        auraColor = 0x00d4ff; // Bleu clair
        auraIntensity = 0.2 + (auraLevel * 0.1);
    } else if (auraLevel <= 7) {
        auraColor = 0x4169e1; // Bleu foncé
        auraIntensity = 0.3 + ((auraLevel - 3) * 0.1);
    } else {
        auraColor = 0x000000; // Noir
        auraIntensity = 0.5 + ((auraLevel - 7) * 0.1);
    }
    
    const auraMaterial = new THREE.MeshBasicMaterial({ 
        color: auraColor,
        transparent: true,
        opacity: auraIntensity,
        side: THREE.DoubleSide
    });
    
    const aura = new THREE.Mesh(auraGeometry, auraMaterial);
    aura.name = 'aura';
    aura.position.y = 2;
    
    // Animation de l'aura
    const animateAura = () => {
        aura.rotation.y += 0.01;
        aura.scale.set(
            1 + Math.sin(Date.now() * 0.003) * 0.1,
            1 + Math.cos(Date.now() * 0.003) * 0.1,
            1 + Math.sin(Date.now() * 0.003) * 0.1
        );
        requestAnimationFrame(animateAura);
    };
    animateAura();
    
    player.add(aura);
}

function setupControls() {
    // Événements clavier
    document.addEventListener('keydown', (event) => {
        keys[event.code] = true;
        
        switch(event.code) {
            case 'KeyW':
            case 'ArrowUp':
                controls.forward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                controls.backward = true;
          
