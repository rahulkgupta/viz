// Three.js setup
let scene, camera, renderer, composer;
let analyser, dataArray;
let audioContext, audioSource;
let particleSystem, particleSystemBg, particleTrails;
let shaderMaterial, trailsMaterial, backgroundMaterial;
let time = 0;
let beatDetected = false;
let lastBeatTime = 0;
let renderTarget, renderTargetBlur;

// Visualization settings
const settings = {
    particles: {
        count: 10000,
        size: 2,
        spread: 20
    },
    motion: {
        speed: 1,
        rotation: 1
    },
    audio: {
        beatThreshold: 0.5,
        beatDecay: 200,
        smoothing: 0.8
    },
    colors: {
        scheme: 'rainbow',
        intensity: 1
    },
    camera: {
        distance: 30,
        movement: 1
    },
    effects: {
        bloom: true,
        trails: true,
        background: true
    },
    background: {
        style: 'spiral',
        intensity: 0.6
    }
};

// Color scheme presets
const colorSchemes = {
    rainbow: {
        getColor: (radius, maxRadius) => {
            return new THREE.Color().setHSL(radius / maxRadius, 0.8, 0.5);
        }
    },
    fire: {
        getColor: (radius, maxRadius) => {
            const hue = 0.05 + (radius / maxRadius) * 0.1;
            return new THREE.Color().setHSL(hue, 0.8, 0.5);
        }
    },
    ocean: {
        getColor: (radius, maxRadius) => {
            const hue = 0.5 + (radius / maxRadius) * 0.2;
            return new THREE.Color().setHSL(hue, 0.7, 0.4);
        }
    },
    neon: {
        getColor: (radius, maxRadius) => {
            const hues = [0.83, 0.6, 0.15, 0.9]; // Purple, Blue, Orange, Pink
            const hueIndex = Math.floor((radius / maxRadius) * hues.length);
            return new THREE.Color().setHSL(hues[hueIndex], 1, 0.5);
        }
    }
};

// Background style presets
const backgroundStyles = {
    spiral: {
        fragmentShader: `
            uniform float time;
            uniform float beat;
            uniform vec3 colorA;
            uniform vec3 colorB;
            varying vec2 vUv;

            void main() {
                vec2 position = vUv * 2.0 - 1.0;
                float dist = length(position);
                
                float angle = atan(position.y, position.x);
                float spiral = sin(dist * 10.0 - time * 2.0 + angle * 2.0);
                
                float intensity = (1.0 + spiral * 0.5) * (1.0 - dist);
                intensity = smoothstep(0.0, 1.0, intensity);
                
                vec3 color = mix(colorA, colorB, intensity + beat * 0.3);
                float alpha = max(0.0, 0.3 - dist * 0.3) + beat * 0.1;
                gl_FragColor = vec4(color * (0.3 + beat * 0.2), alpha);
            }
        `
    },
    grid: {
        fragmentShader: `
            uniform float time;
            uniform float beat;
            uniform vec3 colorA;
            uniform vec3 colorB;
            varying vec2 vUv;

            void main() {
                vec2 position = vUv * 2.0 - 1.0;
                vec2 grid = abs(fract(position * 8.0 - time * 0.2) - 0.5) / fwidth(position * 8.0);
                float lines = min(grid.x, grid.y);
                
                float dist = length(position);
                vec3 color = mix(colorA, colorB, dist + beat * 0.3);
                float alpha = (1.0 - min(lines, 1.0)) * (0.2 + beat * 0.1) * (1.0 - dist * 0.5);
                gl_FragColor = vec4(color * (0.3 + beat * 0.2), alpha);
            }
        `
    },
    ripple: {
        fragmentShader: `
            uniform float time;
            uniform float beat;
            uniform vec3 colorA;
            uniform vec3 colorB;
            varying vec2 vUv;

            void main() {
                vec2 position = vUv * 2.0 - 1.0;
                float dist = length(position);
                
                float ripple = sin(dist * 20.0 - time * 3.0) * 0.5 + 0.5;
                ripple *= exp(-dist * 3.0);
                
                float wave = sin(position.x * 10.0 + time) * cos(position.y * 10.0 + time) * 0.5 + 0.5;
                float pattern = mix(ripple, wave, 0.5);
                
                vec3 color = mix(colorA, colorB, pattern + beat * 0.3);
                float alpha = (pattern * 0.5 + 0.1) * (1.0 - dist) + beat * 0.1;
                gl_FragColor = vec4(color * (0.3 + beat * 0.2), alpha);
            }
        `
    },
    nebula: {
        fragmentShader: `
            uniform float time;
            uniform float beat;
            uniform vec3 colorA;
            uniform vec3 colorB;
            varying vec2 vUv;

            float noise(vec2 p) {
                return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }

            void main() {
                vec2 position = vUv * 2.0 - 1.0;
                float dist = length(position);
                
                float n = noise(position + time * 0.1);
                float cloud = sin(position.x * 4.0 + time + n) * cos(position.y * 4.0 - time + n);
                cloud = smoothstep(-1.0, 1.0, cloud);
                
                float swirl = sin(atan(position.y, position.x) * 3.0 + time);
                float pattern = mix(cloud, swirl, 0.5) * (1.0 - dist);
                
                vec3 color = mix(colorA, colorB, pattern + beat * 0.3);
                float alpha = (pattern * 0.4 + 0.1) * (1.0 - dist * 0.7) + beat * 0.1;
                gl_FragColor = vec4(color * (0.3 + beat * 0.2), alpha);
            }
        `
    },
    vortex: {
        fragmentShader: `
            uniform float time;
            uniform float beat;
            uniform vec3 colorA;
            uniform vec3 colorB;
            varying vec2 vUv;

            void main() {
                vec2 position = vUv * 2.0 - 1.0;
                float dist = length(position);
                float angle = atan(position.y, position.x);
                
                float spiral = sin(angle * 8.0 + dist * 20.0 - time * 4.0);
                float vortex = (spiral * 0.5 + 0.5) * exp(-dist * 2.0);
                
                float rings = sin(dist * 20.0 - time * 2.0) * 0.5 + 0.5;
                float pattern = mix(vortex, rings, 0.5);
                
                vec3 color = mix(colorA, colorB, pattern + beat * 0.3);
                float alpha = (pattern * 0.5 + 0.1) * (1.0 - dist * 0.5) + beat * 0.1;
                gl_FragColor = vec4(color * (0.3 + beat * 0.2), alpha);
            }
        `
    }
};

// Background color presets
const backgroundColors = {
    dark: {
        colorA: new THREE.Color(0.05, 0.0, 0.1),
        colorB: new THREE.Color(0.1, 0.0, 0.15)
    },
    cosmic: {
        colorA: new THREE.Color(0.1, 0.0, 0.2),
        colorB: new THREE.Color(0.2, 0.0, 0.3)
    },
    ember: {
        colorA: new THREE.Color(0.2, 0.05, 0.0),
        colorB: new THREE.Color(0.3, 0.1, 0.0)
    },
    deep: {
        colorA: new THREE.Color(0.0, 0.1, 0.2),
        colorB: new THREE.Color(0.0, 0.15, 0.3)
    }
};

// Background shader
const backgroundVertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

// Shader code
const vertexShader = `
    attribute float size;
    attribute vec3 customColor;
    varying vec3 vColor;
    uniform float time;
    uniform float beat;
    uniform float motionSpeed;
    uniform float audioData[64];

    void main() {
        vColor = customColor;
        vec3 pos = position;
        
        // Add wave motion
        float wave = sin(pos.x * 0.5 + time) * cos(pos.y * 0.5 + time) * 2.0;
        pos.z += wave * (1.0 + beat);
        
        // Add spiral motion
        float angle = time * motionSpeed;
        float radius = length(pos.xy);
        float c = cos(angle);
        float s = sin(angle);
        pos.x = pos.x * c - pos.y * s;
        pos.y = pos.x * s + pos.y * c;
        
        // Audio reactive position
        float audioIndex = mod(radius * 2.0, 64.0);
        float audioValue = audioData[int(audioIndex)];
        pos.z += audioValue * 5.0;
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * (1.0 + beat * 0.5) * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fragmentShader = `
    varying vec3 vColor;
    uniform float beat;
    uniform float colorIntensity;

    void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        
        float intensity = 1.0 - (dist * 2.0);
        intensity = pow(intensity, 2.0);
        
        vec3 color = vColor * (1.0 + beat * 0.5) * colorIntensity;
        gl_FragColor = vec4(color, intensity);
    }
`;

const trailsVertexShader = `
    attribute float size;
    attribute vec3 color;
    varying vec3 vColor;
    uniform float time;
    uniform float beat;

    void main() {
        vColor = color;
        vec3 pos = position;
        
        // Spiral motion
        float angle = time * 0.5;
        float radius = length(pos.xy);
        float c = cos(angle);
        float s = sin(angle);
        float x = pos.x;  // Store original x value
        pos.x = x * c - pos.y * s;
        pos.y = x * s + pos.y * c;
        
        // Wave motion
        pos.z += sin(radius - time * 2.0) * 2.0 * (1.0 + beat);
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * (1.0 + beat * 0.3) * (200.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const trailsFragmentShader = `
    varying vec3 vColor;
    uniform float beat;

    void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        
        float intensity = 1.0 - (dist * 2.0);
        intensity = pow(intensity, 3.0);
        
        vec3 color = vColor * (1.0 + beat * 0.3);
        gl_FragColor = vec4(color, intensity * 0.5);
    }
`;

function createBackground() {
    const geometry = new THREE.PlaneGeometry(100, 100);
    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            beat: { value: 0 },
            colorA: { value: backgroundColors.dark.colorA },
            colorB: { value: backgroundColors.dark.colorB }
        },
        vertexShader: backgroundVertexShader,
        fragmentShader: backgroundStyles[settings.background.style].fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = -40;
    mesh.renderOrder = -1;
    return mesh;
}

function createTrails() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(1000 * 3);
    const colors = new Float32Array(1000 * 3);
    const sizes = new Float32Array(1000);

    for (let i = 0; i < 1000; i++) {
        const i3 = i * 3;
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 30;
        
        positions[i3] = Math.cos(angle) * radius;
        positions[i3 + 1] = Math.sin(angle) * radius;
        positions[i3 + 2] = (Math.random() - 0.5) * 20;
        
        const color = new THREE.Color().setHSL(Math.random(), 0.9, 0.6);
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
        
        sizes[i] = Math.random() * 4 + 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            beat: { value: 0 }
        },
        vertexShader: trailsVertexShader,
        fragmentShader: trailsFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    return new THREE.Points(geometry, material);
}

function createParticleSystem() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(settings.particles.count * 3);
    const colors = new Float32Array(settings.particles.count * 3);
    const sizes = new Float32Array(settings.particles.count);

    for (let i = 0; i < settings.particles.count; i++) {
        const i3 = i * 3;
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * settings.particles.spread;
        
        positions[i3] = Math.cos(angle) * radius;
        positions[i3 + 1] = Math.sin(angle) * radius;
        positions[i3 + 2] = (Math.random() - 0.5) * 10;
        
        const color = colorSchemes[settings.colors.scheme].getColor(radius, settings.particles.spread);
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
        
        sizes[i] = Math.random() * settings.particles.size + 1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    shaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            beat: { value: 0 },
            audioData: { value: new Float32Array(64) },
            motionSpeed: { value: settings.motion.speed },
            beatScale: { value: 1.0 },
            colorIntensity: { value: settings.colors.intensity }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    return new THREE.Points(geometry, shaderMaterial);
}

// Initialize Three.js scene
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Add background
    const background = createBackground();
    scene.add(background);

    // Add trails
    particleTrails = createTrails();
    scene.add(particleTrails);

    // Add main particle system
    particleSystem = createParticleSystem();
    scene.add(particleSystem);

    camera.position.z = settings.camera.distance;

    // Set up post-processing
    setupPostProcessing();

    setupControls();
}

function setupPostProcessing() {
    composer = new THREE.EffectComposer(renderer);
    
    const renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.8,    // strength (reduced from 1.5)
        0.3,    // radius (reduced from 0.4)
        0.66    // threshold (reduced from 0.85)
    );
    composer.addPass(bloomPass);

    // Store reference to bloom pass for dynamic updates
    window.bloomPass = bloomPass;
}

function setupControls() {
    // Particle controls
    document.getElementById('particleCountSlider').addEventListener('input', (e) => {
        settings.particles.count = parseInt(e.target.value);
        document.getElementById('particleCount').textContent = settings.particles.count;
        updateParticleSystem();
    });

    document.getElementById('particleSizeSlider').addEventListener('input', (e) => {
        settings.particles.size = parseFloat(e.target.value);
        document.getElementById('particleSize').textContent = settings.particles.size;
        updateParticleSystem();
    });

    document.getElementById('particleSpreadSlider').addEventListener('input', (e) => {
        settings.particles.spread = parseFloat(e.target.value);
        document.getElementById('particleSpread').textContent = settings.particles.spread;
        updateParticleSystem();
    });

    // Motion controls
    document.getElementById('motionSpeedSlider').addEventListener('input', (e) => {
        settings.motion.speed = parseFloat(e.target.value);
        document.getElementById('motionSpeed').textContent = settings.motion.speed;
        shaderMaterial.uniforms.motionSpeed.value = settings.motion.speed;
    });

    document.getElementById('rotationSpeedSlider').addEventListener('input', (e) => {
        settings.motion.rotation = parseFloat(e.target.value);
        document.getElementById('rotationSpeed').textContent = settings.motion.rotation;
    });

    // Audio controls
    document.getElementById('beatSensitivitySlider').addEventListener('input', (e) => {
        settings.audio.beatThreshold = parseFloat(e.target.value);
        document.getElementById('beatSensitivity').textContent = settings.audio.beatThreshold;
    });

    document.getElementById('smoothingSlider').addEventListener('input', (e) => {
        settings.audio.smoothing = parseFloat(e.target.value);
        document.getElementById('smoothing').textContent = settings.audio.smoothing;
        if (analyser) analyser.smoothingTimeConstant = settings.audio.smoothing;
    });

    // Color controls
    document.getElementById('colorScheme').addEventListener('change', (e) => {
        settings.colors.scheme = e.target.value;
        updateParticleSystem();
    });

    document.getElementById('colorIntensitySlider').addEventListener('input', (e) => {
        settings.colors.intensity = parseFloat(e.target.value);
        document.getElementById('colorIntensity').textContent = settings.colors.intensity;
        shaderMaterial.uniforms.colorIntensity.value = settings.colors.intensity;
    });

    // Camera controls
    document.getElementById('cameraDistanceSlider').addEventListener('input', (e) => {
        settings.camera.distance = parseFloat(e.target.value);
        document.getElementById('cameraDistance').textContent = settings.camera.distance;
    });

    document.getElementById('cameraMovementSlider').addEventListener('input', (e) => {
        settings.camera.movement = parseFloat(e.target.value);
        document.getElementById('cameraMovement').textContent = settings.camera.movement;
    });

    // Effects controls
    document.getElementById('bloomStrengthSlider').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        document.getElementById('bloomStrength').textContent = value;
        if (window.bloomPass) {
            window.bloomPass.strength = value;
        }
    });

    document.getElementById('bgIntensitySlider').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        document.getElementById('bgIntensity').textContent = value;
        const background = scene.children[0];
        if (background && background.material) {
            background.material.opacity = value;
        }
    });

    // Add background style control to the Effects control group
    const bgStyleSelect = document.createElement('div');
    bgStyleSelect.className = 'control-item';
    bgStyleSelect.innerHTML = `
        <label>Background Style</label>
        <select id="bgStyle">
            <option value="spiral">Spiral</option>
            <option value="grid">Grid</option>
            <option value="ripple">Ripple</option>
            <option value="nebula">Nebula</option>
            <option value="vortex">Vortex</option>
        </select>
    `;
    document.querySelector('.control-group:last-child').insertBefore(
        bgStyleSelect,
        document.getElementById('bloomStrengthSlider').parentElement
    );

    const bgColorSelect = document.createElement('div');
    bgColorSelect.className = 'control-item';
    bgColorSelect.innerHTML = `
        <label>Background Color</label>
        <select id="bgColor">
            <option value="dark">Dark</option>
            <option value="cosmic">Cosmic</option>
            <option value="ember">Ember</option>
            <option value="deep">Deep</option>
        </select>
    `;
    document.querySelector('.control-group:last-child').insertBefore(
        bgColorSelect,
        document.getElementById('bloomStrengthSlider').parentElement
    );

    // Add event listeners for new controls
    document.getElementById('bgStyle').addEventListener('change', (e) => {
        settings.background.style = e.target.value;
        updateBackground();
    });

    document.getElementById('bgColor').addEventListener('change', (e) => {
        const colors = backgroundColors[e.target.value];
        const background = scene.children[0];
        if (background && background.material) {
            background.material.uniforms.colorA.value.copy(colors.colorA);
            background.material.uniforms.colorB.value.copy(colors.colorB);
        }
    });
}

function updateParticleSystem() {
    scene.remove(particleSystem);
    particleSystem = createParticleSystem();
    scene.add(particleSystem);
}

function updateBackground() {
    const oldBackground = scene.children[0];
    scene.remove(oldBackground);
    const newBackground = createBackground();
    scene.add(newBackground);
    scene.children[0].renderOrder = -1;
}

// Beat detection function
function detectBeat(dataArray) {
    let sum = 0;
    const sampleCount = 8;
    
    for(let i = 0; i < sampleCount; i++) {
        sum += dataArray[i];
    }
    
    const average = sum / sampleCount;
    const normalized = average / 255;
    
    const now = Date.now();
    if (normalized > settings.audio.beatThreshold && now - lastBeatTime > settings.audio.beatDecay) {
        lastBeatTime = now;
        return true;
    }
    return false;
}

// Handle audio processing
function setupAudio(stream) {
    if (audioContext) audioContext.close();
    
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = settings.audio.smoothing;
    
    if (stream instanceof MediaStream) {
        audioSource = audioContext.createMediaStreamSource(stream);
    } else {
        audioSource = audioContext.createMediaElementSource(stream);
        stream.play();
    }
    
    audioSource.connect(analyser);
    if (!(stream instanceof MediaStream)) {
        analyser.connect(audioContext.destination);
    }
    
    dataArray = new Uint8Array(analyser.frequencyBinCount);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    time += 0.01 * settings.motion.speed;

    if (analyser) {
        analyser.getByteFrequencyData(dataArray);
        beatDetected = detectBeat(dataArray);
        
        const audioDataFloat = new Float32Array(64);
        for (let i = 0; i < 64; i++) {
            audioDataFloat[i] = dataArray[i] / 255;
        }
        
        // Update all materials with audio data
        shaderMaterial.uniforms.audioData.value = audioDataFloat;
        shaderMaterial.uniforms.beat.value = beatDetected ? 1.0 : shaderMaterial.uniforms.beat.value * 0.95;
        particleTrails.material.uniforms.beat.value = shaderMaterial.uniforms.beat.value;
        scene.children[0].material.uniforms.beat.value = shaderMaterial.uniforms.beat.value;
    }

    // Update time uniforms
    shaderMaterial.uniforms.time.value = time;
    particleTrails.material.uniforms.time.value = time;
    scene.children[0].material.uniforms.time.value = time;

    // Rotate and update positions
    particleSystem.rotation.z += 0.001 * settings.motion.rotation;
    particleTrails.rotation.z -= 0.0005 * settings.motion.rotation;
    
    // Camera movement
    camera.position.x = Math.sin(time * 0.1) * 2 * settings.camera.movement;
    camera.position.y = Math.cos(time * 0.1) * 2 * settings.camera.movement;
    camera.position.z = settings.camera.distance;
    camera.lookAt(scene.position);

    composer.render();
}

// Event listeners
document.getElementById('micBtn').addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setupAudio(stream);
    } catch (err) {
        console.error('Error accessing microphone:', err);
        alert('Error accessing microphone. Please check permissions.');
    }
});

document.getElementById('uploadBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const audio = new Audio();
        audio.src = URL.createObjectURL(file);
        setupAudio(audio);
    }
});

// Sidebar toggle functionality
document.getElementById('sidebar-toggle').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
    const toggleButton = document.getElementById('sidebar-toggle');
    toggleButton.textContent = sidebar.classList.contains('open') ? '×' : '≡';
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize and start animation
init();
animate(); 