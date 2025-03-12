import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { LineSegments } from 'three';
import { EdgesGeometry } from 'three';
import { LineBasicMaterial } from 'three';

// Scene setup
const scene = new THREE.Scene();
const backgroundColor = 0x262626;
scene.background = new THREE.Color(backgroundColor);

// Camera setup
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 5;

// Renderer setup with enhanced shadow mapping
const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  logarithmicDepthBuffer: true 
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// Enhanced lighting setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

// Main key light (top-right)
const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
keyLight.position.set(5, 8, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
keyLight.shadow.camera.near = 0.1;
keyLight.shadow.camera.far = 100;
keyLight.shadow.bias = -0.0001;
keyLight.shadow.normalBias = 0.02;
keyLight.shadow.radius = 3;
scene.add(keyLight);

// Fill light (left)
const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
fillLight.position.set(-5, 3, 0);
scene.add(fillLight);

// Rim light (back)
const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
rimLight.position.set(0, 2, -5);
scene.add(rimLight);

// Invisible ground plane for shadows
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.ShadowMaterial({ 
  opacity: 0.3,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
ground.receiveShadow = true;
scene.add(ground);

// Edge material for model outlines
const edgeMaterial = new LineBasicMaterial({ 
  color: 0x000000,
  linewidth: 1,
});

// Improved clay-like material
const clayMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.6,
  metalness: 0.0,
  flatShading: false,
  envMapIntensity: 1.0,
  shadowSide: THREE.FrontSide,
});

// Create ambient occlusion texture
const aoTexture = new THREE.TextureLoader().load('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
clayMaterial.aoMap = aoTexture;
clayMaterial.aoMapIntensity = 0.5;

// Controls setup
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 1;
controls.maxDistance = 50;
controls.maxPolarAngle = Math.PI / 2;

// Load the model
const loader = new OBJLoader();
loader.load(
  '/models/House.obj',
  (object) => {
    // Apply clay material to all meshes and add edges
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = clayMaterial;
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Ensure smooth normals for better lighting
        if (child.geometry) {
          child.geometry.computeVertexNormals();
          child.geometry.normalizeNormals();
          
          // Add edges to each mesh
          const edges = new EdgesGeometry(child.geometry, 15); // 15 degrees threshold
          const edgeLines = new LineSegments(edges, edgeMaterial);
          child.add(edgeLines);
        }
      }
    });

    // Center the model
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    // Scale model to fit in view
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 3 / maxDim;
    object.scale.multiplyScalar(scale);
    
    // Position model so it sits on the ground
    object.position.x = -center.x * scale;
    object.position.z = -center.z * scale;
    object.position.y = -box.min.y * scale; // This places the bottom at y=0
    
    // Add to scene
    scene.add(object);
    
    // Hide loading message
    document.getElementById('loading').style.display = 'none';
    
    // Update camera position based on model size
    camera.position.set(
      maxDim * scale * 2,
      maxDim * scale * 1.5,
      maxDim * scale * 2
    );

    // Set camera target to bottom center of model
    const bottomCenter = new THREE.Vector3(
      0, // centered in X
      0, // bottom of model
      0  // centered in Z
    );
    controls.target.copy(bottomCenter);
    controls.update();

    // Adjust shadow camera frustum to fit the model precisely
    const shadowCameraSize = maxDim * scale * 1.5;
    keyLight.shadow.camera.left = -shadowCameraSize;
    keyLight.shadow.camera.right = shadowCameraSize;
    keyLight.shadow.camera.top = shadowCameraSize;
    keyLight.shadow.camera.bottom = -shadowCameraSize;
    keyLight.shadow.camera.updateProjectionMatrix();
  },
  (xhr) => {
    const percent = (xhr.loaded / xhr.total) * 100;
    document.getElementById('loading').textContent = `Loading: ${Math.round(percent)}%`;
  },
  (error) => {
    console.error('Error loading model:', error);
    document.getElementById('loading').textContent = 'Error loading model';
  }
);

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop with throttled render
let lastRenderTime = 0;
const minRenderInterval = 1000 / 60; // Cap at 60 FPS

function animate(currentTime) {
  requestAnimationFrame(animate);
  
  // Throttle rendering
  if (currentTime - lastRenderTime >= minRenderInterval) {
    controls.update();
    renderer.render(scene, camera);
    lastRenderTime = currentTime;
  }
}

animate(); 