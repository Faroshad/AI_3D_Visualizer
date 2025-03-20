import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { LineSegments } from 'three';
import { EdgesGeometry } from 'three';
import { LineBasicMaterial } from 'three';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';

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
camera.position.set(10, 10, 10); // Position the camera at a 45-degree angle
camera.lookAt(0, 0, 0); // Look at the center of the scene

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
renderer.toneMappingExposure = 0.3; // Reduced for more dramatic shadows
renderer.physicallyCorrectLights = true;
document.body.appendChild(renderer.domElement);

// Add subtle environment map for better reflections - MOVED AFTER RENDERER INITIALIZATION
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

// Function to create a sky gradient texture
function createGradientTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  
  // Create gradient
  const gradient = context.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#88bbff'); // Sky blue at top
  gradient.addColorStop(0.5, '#eeeeff'); // Light at horizon
  gradient.addColorStop(1, '#ffeedd'); // Warm light at bottom
  
  // Fill canvas
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  
  return texture;
}

// Create a simple environment map procedurally
const envScene = new THREE.Scene();
const gradientTexture = createGradientTexture();
const envGeometry = new THREE.SphereGeometry(50, 32, 32);
const envMaterial = new THREE.MeshBasicMaterial({
  map: gradientTexture,
  side: THREE.BackSide
});
const envMesh = new THREE.Mesh(envGeometry, envMaterial);
envScene.add(envMesh);

// Generate environment map
const envMap = pmremGenerator.fromScene(envScene).texture;
scene.environment = envMap;
pmremGenerator.dispose();

// Sun parameters
const sunParams = {
  elevation: 45, // 0 to 90 degrees
  azimuth: 45,   // 0 to 360 degrees
  intensity: 1.0,
  color: 0xffffff,
  size: 1.0,     // Visual size of the sun sphere
  showHelper: true
};

// Date and location parameters
const dateTimeParams = {
  date: '2023-06-21', // Default to summer solstice
  time: '12:00',      // Default to noon
  latitude: 40.7128,  // Default to New York
  longitude: -74.006, // Default to New York
  timezone: -4,       // Default to EDT
  useRealPosition: false // Toggle between manual controls and date-based position
};

// Create sun (directional light)
const sunLight = new THREE.DirectionalLight(sunParams.color, sunParams.intensity);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 4096;
sunLight.shadow.mapSize.height = 4096;
sunLight.shadow.camera.near = 0.1;
sunLight.shadow.camera.far = 100;
sunLight.shadow.bias = -0.0001;
sunLight.shadow.normalBias = 0.005; // Reduced for sharper shadows
sunLight.shadow.radius = 1; // Reduced for sharper shadow edges
scene.add(sunLight);

// Add ambient light to fill shadows (very subtle)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.04); // Reduced for more dramatic shadows
scene.add(ambientLight);

// Create soft hemisphere light for more realistic light bouncing
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.05); // Reduced for more dramatic shadows
scene.add(hemiLight);

// Add a very subtle point light to simulate light bounce
const bounceLight = new THREE.PointLight(0xffffff, 0.02); // Reduced for more dramatic shadows
bounceLight.position.set(0, 0.5, 0);
bounceLight.castShadow = false;
scene.add(bounceLight);

import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { TextureLoader } from "three";

// Load Sun Texture
const textureLoader = new TextureLoader();
const sunMaterial = new THREE.MeshBasicMaterial({
    map: textureLoader.load('/models/sun/textures/suncyl1.jpg'),
    emissive: 0xffff00,
    emissiveIntensity: 1
});

// Declare sunSphere globally so it's accessible later
let sunSphere = null;

// Load the FBX model
const fbxLoader = new FBXLoader();
fbxLoader.load('/models/sun/source/UnstableStar.fbx', (fbx) => {
    fbx.name = "sunSphere"; // Keep the same name

    fbx.traverse((child) => {
        if (child.isMesh) {
            child.material = sunMaterial; // Apply the sun material
            child.castShadow = false; // Disable shadow casting
            child.receiveShadow = false; // Disable shadow receiving
            child.scale.set(0.3, 0.3, 0.3); // Make the model much smaller
        }
    });

    // Assign the FBX model to sunSphere
    sunSphere = fbx;
    scene.add(sunSphere);

    console.log("✅ FBX Model Loaded as sunSphere");

    // Now that sunSphere exists, safely update its position
    if (sunLight) {
        sunSphere.position.copy(sunLight.position);
    }

    // Ensure sun updates only after loading
    updateSunPosition();
}, 
(xhr) => { console.log(`FBX Model Loading: ${(xhr.loaded / xhr.total) * 100}%`); },
(error) => { console.error("❌ Error loading FBX:", error); });

// Modify updateSunPosition() to handle both manual and real-time updates
function updateSunPosition() {
    if (!sunSphere) {
        console.warn("⏳ sunSphere not loaded yet. Skipping position update.");
        return; // Don't execute if sunSphere isn't ready
    }

    // If using real position, calculate it based on date and time
    if (dateTimeParams.useRealPosition) {
        const sunPos = calculateSunPosition(
            dateTimeParams.date,
            dateTimeParams.time,
            dateTimeParams.latitude,
            dateTimeParams.longitude,
            dateTimeParams.timezone
        );
        
        // Update the manual controls to match the calculated position
        sunParams.elevation = Math.max(0, sunPos.elevation); // Clamp to >= 0 to keep sun above horizon
        sunParams.azimuth = sunPos.azimuth;
        
        // Update the GUI controllers
        for (const controller of sunFolder.controllers) {
            controller.updateDisplay();
        }
    }

    // Convert to radians
    const elevationRad = THREE.MathUtils.degToRad(sunParams.elevation);
    const azimuthRad = THREE.MathUtils.degToRad(sunParams.azimuth);
    
    // Calculate position on the celestial sphere
    const radius = 10; // Distance from scene center
    const x = radius * Math.sin(azimuthRad) * Math.cos(elevationRad);
    const y = radius * Math.sin(elevationRad);
    const z = radius * Math.cos(azimuthRad) * Math.cos(elevationRad);
    
    // Update sun light position
    sunLight.position.set(x, y, z);
    sunLight.intensity = sunParams.intensity * 1.5; // Increased intensity for more dramatic shadows
    sunLight.color.set(sunParams.color);
    
    // Update sun sphere position and size
    sunSphere.position.copy(sunLight.position);
    sunSphere.scale.setScalar(sunParams.size * 0.1); // Maintain small scale while allowing size adjustment
    
    // Update helper (if ever needed)
    if (sunHelper.visible) {
        sunHelper.update();
    }
    
    // Update bounce light position to be opposite to the sun
    bounceLight.position.set(-x * 0.2, 0.5, -z * 0.2);
    // Adjust bounce light color to complement sun color
    bounceLight.color.set(sunParams.color);
    bounceLight.intensity = 0.02 + (90 - sunParams.elevation) / 90 * 0.08; // Reduced for higher contrast
    
    // Adjust hemisphere light intensity based on sun elevation
    hemiLight.intensity = 0.03 + sunParams.elevation / 90 * 0.07; // Reduced for higher contrast
}

// Sun helper to visualize direction (will not be shown by default)
const sunHelper = new THREE.DirectionalLightHelper(sunLight, 2);
sunHelper.visible = false; // Hide helper by default
scene.add(sunHelper);

// Function to calculate the sun position based on date and time
function calculateSunPosition(date, time, latitude, longitude, timezone) {
  // Parse date and time
  const dateObj = new Date(`${date}T${time}:00${timezone >= 0 ? '+' : '-'}${Math.abs(timezone).toString().padStart(2, '0')}:00`);
  
  // Calculate Julian date - number of days since January 1, 4713 BC
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1; // JavaScript months are 0-based
  const day = dateObj.getDate();
  const hour = dateObj.getHours();
  const minute = dateObj.getMinutes();
  
  // Calculate Julian date
  let JD = 367 * year - Math.floor(7 * (year + Math.floor((month + 9) / 12)) / 4) -
    Math.floor(3 * (Math.floor((year + (month - 9) / 7) / 100) + 1) / 4) +
    Math.floor(275 * month / 9) + day + 1721028.5 + (hour + minute / 60) / 24;
  
  // Calculate time in Julian centuries from J2000.0
  const T = (JD - 2451545.0) / 36525;
  
  // Calculate solar coordinates
  // Mean longitude of the sun
  let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  L0 = L0 % 360;
  if(L0 < 0) L0 += 360;
  
  // Mean anomaly of the sun
  let M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  M = M % 360;
  if(M < 0) M += 360;
  
  // Convert to radians for trigonometry
  const Mrad = M * Math.PI / 180;
  
  // Equation of center
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad) +
            (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
            0.000289 * Math.sin(3 * Mrad);
  
  // True longitude of the sun
  const L = L0 + C;
  
  // Calculate the obliquity of the ecliptic
  const e = 23.439291 - 0.013004167 * T;
  const erad = e * Math.PI / 180;
  
  // Convert sun's longitude to right ascension and declination
  const Lrad = L * Math.PI / 180;
  
  // Right ascension
  let RA = Math.atan2(Math.cos(erad) * Math.sin(Lrad), Math.cos(Lrad)) * 180 / Math.PI;
  RA = RA % 360;
  if(RA < 0) RA += 360;
  
  // Convert RA to hours (divide by 15)
  RA = RA / 15;
  
  // Declination
  const dec = Math.asin(Math.sin(erad) * Math.sin(Lrad)) * 180 / Math.PI;
  
  // Calculate local hour angle
  // Greenwich Mean Sidereal Time
  const GMST = 280.46061837 + 360.98564736629 * (JD - 2451545.0);
  
  // Local Mean Sidereal Time
  let LMST = GMST + longitude;
  LMST = LMST % 360;
  if(LMST < 0) LMST += 360;
  
  // Hour angle
  let HA = LMST - RA * 15;
  if(HA < 0) HA += 360;
  
  // Convert to radians
  const latRad = latitude * Math.PI / 180;
  const decRad = dec * Math.PI / 180;
  const HARad = HA * Math.PI / 180;
  
  // Calculate altitude and azimuth
  const sinAlt = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(HARad);
  const alt = Math.asin(sinAlt) * 180 / Math.PI;
  
  // Calculate azimuth (from north, clockwise)
  let azm = Math.atan2(
    -Math.cos(decRad) * Math.sin(HARad),
    Math.sin(decRad) * Math.cos(latRad) - Math.cos(decRad) * Math.sin(latRad) * Math.cos(HARad)
  ) * 180 / Math.PI;
  
  // Convert from north-referenced azimuth to east-referenced azimuth
  azm = azm + 180;
  if(azm > 360) azm -= 360;
  
  return {
    elevation: alt,
    azimuth: azm
  };
}

// Initialize sun position
updateSunPosition();

// Invisible ground plane for shadows
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.ShadowMaterial({ 
  opacity: 0.5, // Increased opacity for more dramatic ground shadows
  color: 0x000000 // Pure black shadows
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
  opacity: 0.7, // Slightly transparent edges for subtlety
  transparent: true
});

// Improved clay-like material
const clayMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.9, // Increased for more dramatic self-shadowing
  metalness: 0.01, // Reduced further to emphasize matte look for dramatic shadows
  flatShading: false,
  envMapIntensity: 0.2, // Reduced further to emphasize direct light and shadow
  shadowSide: THREE.FrontSide,
  // These ensure proper shadow rendering
  side: THREE.DoubleSide, // Render both sides of faces
  depthWrite: true,
  depthTest: true
});

// Create ambient occlusion texture
const aoTexture = new THREE.TextureLoader().load('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
clayMaterial.aoMap = aoTexture;
clayMaterial.aoMapIntensity = 1.2; // Increased for even deeper shadows in crevices

// Controls setup
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 1;
controls.maxDistance = 50;
controls.maxPolarAngle = Math.PI / 2;

// GUI setup for sun controls
const gui = new GUI();

// Sun manual controls folder
const sunFolder = gui.addFolder('Sun Manual Controls');
sunFolder.add(sunParams, 'elevation', 0, 90, 1).name('Elevation').onChange(updateSunPosition);
sunFolder.add(sunParams, 'azimuth', 0, 360, 1).name('Azimuth').onChange(updateSunPosition);
sunFolder.add(sunParams, 'intensity', 0, 3, 0.1).name('Intensity').onChange(updateSunPosition);
sunFolder.addColor(sunParams, 'color').name('Color').onChange(updateSunPosition);
sunFolder.add(sunParams, 'size', 0.1, 3, 0.1).name('Sun Size').onChange(updateSunPosition);
sunFolder.open();

// Date and time based controls
const dateTimeFolder = gui.addFolder('Date & Location');
dateTimeFolder.add(dateTimeParams, 'date').name('Date (YYYY-MM-DD)').onChange(updateSunPosition);
dateTimeFolder.add(dateTimeParams, 'time').name('Time (HH:MM)').onChange(updateSunPosition);
dateTimeFolder.add(dateTimeParams, 'latitude', -90, 90, 0.1).name('Latitude').onChange(updateSunPosition);
dateTimeFolder.add(dateTimeParams, 'longitude', -180, 180, 0.1).name('Longitude').onChange(updateSunPosition);
dateTimeFolder.add(dateTimeParams, 'timezone', -12, 12, 1).name('Timezone (UTC+/-)').onChange(updateSunPosition);
dateTimeFolder.add(dateTimeParams, 'useRealPosition').name('Use Real Sun Position').onChange(() => {
  // Disable manual controls when using real position
  const isManualEnabled = !dateTimeParams.useRealPosition;
  for (const controller of sunFolder.controllers) {
    if (controller.property === 'elevation' || controller.property === 'azimuth') {
      controller.disable(!isManualEnabled);
    }
  }
  updateSunPosition();
});
dateTimeFolder.open();

// Add buttons for specific locations
const locations = {
  currentLocation: 'New York',
  setLocation: function() {
    switch(this.currentLocation) {
      case 'New York':
        dateTimeParams.latitude = 40.7128;
        dateTimeParams.longitude = -74.006;
        dateTimeParams.timezone = -4;
        break;
      case 'Tokyo':
        dateTimeParams.latitude = 35.6762;
        dateTimeParams.longitude = 139.6503;
        dateTimeParams.timezone = 9;
        break;
      case 'London':
        dateTimeParams.latitude = 51.5074;
        dateTimeParams.longitude = -0.1278;
        dateTimeParams.timezone = 1;
        break;
      case 'Sydney':
        dateTimeParams.latitude = -33.8688;
        dateTimeParams.longitude = 151.2093;
        dateTimeParams.timezone = 10;
        break;
      case 'Rio de Janeiro':
        dateTimeParams.latitude = -22.9068;
        dateTimeParams.longitude = -43.1729;
        dateTimeParams.timezone = -3;
        break;
      case 'Cairo':
        dateTimeParams.latitude = 30.0444;
        dateTimeParams.longitude = 31.2357;
        dateTimeParams.timezone = 2;
        break;
    }
    // Update all controllers
    for (const controller of dateTimeFolder.controllers) {
      controller.updateDisplay();
    }
    if (dateTimeParams.useRealPosition) {
      updateSunPosition();
    }
  }
};

const locationsFolder = gui.addFolder('Preset Locations');
locationsFolder.add(locations, 'currentLocation', [
  'New York', 'Tokyo', 'London', 'Sydney', 'Rio de Janeiro', 'Cairo'
]).name('Location');
locationsFolder.add(locations, 'setLocation').name('Apply Location');
locationsFolder.open();

// Add quick buttons for specific times of day
const quickTimes = {
  setCurrentTime: function() {
    const now = new Date();
    dateTimeParams.date = now.toISOString().split('T')[0];
    dateTimeParams.time = now.toTimeString().slice(0, 5);
    
    // Update controllers
    for (const controller of dateTimeFolder.controllers) {
      controller.updateDisplay();
    }
    if (dateTimeParams.useRealPosition) {
      updateSunPosition();
    }
  },
  setSolstice: function(season) {
    const year = new Date().getFullYear();
    
    if (season === 'summer') {
      dateTimeParams.date = `${year}-06-21`;
    } else if (season === 'winter') {
      dateTimeParams.date = `${year}-12-21`;
    }
    
    // Update controllers
    for (const controller of dateTimeFolder.controllers) {
      controller.updateDisplay();
    }
    if (dateTimeParams.useRealPosition) {
      updateSunPosition();
    }
  }
};

const timeButtonsFolder = gui.addFolder('Quick Time Settings');
timeButtonsFolder.add(quickTimes, 'setCurrentTime').name('Use Current Time');
const solsticeButtons = {
  'Summer Solstice': () => quickTimes.setSolstice('summer'),
  'Winter Solstice': () => quickTimes.setSolstice('winter')
};
timeButtonsFolder.add({ 'Summer Solstice': solsticeButtons['Summer Solstice'] }, 'Summer Solstice');
timeButtonsFolder.add({ 'Winter Solstice': solsticeButtons['Winter Solstice'] }, 'Winter Solstice');
timeButtonsFolder.open();

// Preset times of day
const presets = {
  time: 'Noon',
  setTimeOfDay: function() {
    switch(this.time) {
      case 'Sunrise':
        sunParams.elevation = 10;
        sunParams.azimuth = 90;
        sunParams.intensity = 0.8;
        sunParams.color = 0xffcc88;
        break;
      case 'Morning':
        sunParams.elevation = 30;
        sunParams.azimuth = 120;
        sunParams.intensity = 1.0;
        sunParams.color = 0xffeedd;
        break;
      case 'Noon':
        sunParams.elevation = 80;
        sunParams.azimuth = 180;
        sunParams.intensity = 1.2;
        sunParams.color = 0xffffff;
        break;
      case 'Afternoon':
        sunParams.elevation = 30;
        sunParams.azimuth = 240;
        sunParams.intensity = 1.0;
        sunParams.color = 0xffeedd;
        break;
      case 'Sunset':
        sunParams.elevation = 10;
        sunParams.azimuth = 270;
        sunParams.intensity = 0.8;
        sunParams.color = 0xff8866;
        break;
      case 'Night':
        sunParams.elevation = 5;
        sunParams.azimuth = 0;
        sunParams.intensity = 0.2;
        sunParams.color = 0x3333aa;
        break;
    }
    updateSunPosition();
    // Update GUI controllers
    for (const controller of sunFolder.controllers) {
      controller.updateDisplay();
    }
  }
};

const presetsFolder = gui.addFolder('Manual Presets');
presetsFolder.add(presets, 'time', ['Sunrise', 'Morning', 'Noon', 'Afternoon', 'Sunset', 'Night']).name('Time of Day');
presetsFolder.add(presets, 'setTimeOfDay').name('Apply Preset');
presetsFolder.open();

// Create upload button
const uploadButton = document.createElement('input');
uploadButton.type = 'file';
uploadButton.accept = '.obj,.mtl,.gltf,.glb,.bin,.jpg,.png,.jpeg'; // Accept all relevant file types
// Remove directory selection to allow normal file selection
uploadButton.setAttribute('multiple', 'true'); // Allow multiple files
uploadButton.style.position = 'fixed';
uploadButton.style.left = '50%';
uploadButton.style.bottom = '12%';
uploadButton.style.transform = 'translateX(-50%)';
uploadButton.style.zIndex = '1000';
uploadButton.style.cursor = 'pointer';
uploadButton.style.width = '250px';
uploadButton.style.height = '40px';
uploadButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'; // Glassmorphism background
uploadButton.style.border = 'none';
uploadButton.style.borderRadius = '20px';
uploadButton.style.backdropFilter = 'blur(10px)'; // Glass effect
uploadButton.style.color = 'white';
uploadButton.style.fontSize = '16px';
uploadButton.style.textAlign = 'center';
uploadButton.style.padding = '10px';
uploadButton.style.outline = 'none';
document.body.appendChild(uploadButton);

// Update helper text
const helperText = document.createElement('div');
helperText.style.position = 'fixed';
helperText.style.left = '50%';
helperText.style.bottom = '7%';
helperText.style.transform = 'translateX(-50%)';
helperText.style.color = 'white';
helperText.style.fontSize = '12px';
helperText.style.textAlign = 'center';
helperText.style.width = '300px';
helperText.style.zIndex = '1000';
helperText.innerHTML = 'Select model files (.obj + .mtl) or (.gltf + .bin) and textures together';
document.body.appendChild(helperText);

// Handle file upload
uploadButton.addEventListener('change', (event) => {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;

  // Create a loading indicator
  const loadingIndicator = document.createElement('div');
  loadingIndicator.style.position = 'fixed';
  loadingIndicator.style.top = '50%';
  loadingIndicator.style.left = '50%';
  loadingIndicator.style.transform = 'translate(-50%, -50%)';
  loadingIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  loadingIndicator.style.color = 'white';
  loadingIndicator.style.padding = '20px';
  loadingIndicator.style.borderRadius = '10px';
  loadingIndicator.style.zIndex = '1001';
  loadingIndicator.textContent = 'Loading model...';
  document.body.appendChild(loadingIndicator);

  console.log("Files selected:", files.map(f => f.name).join(", "));

  // Group files by type
  const objFiles = files.filter(f => f.name.toLowerCase().endsWith('.obj'));
  const mtlFiles = files.filter(f => f.name.toLowerCase().endsWith('.mtl'));
  const gltfFiles = files.filter(f => f.name.toLowerCase().endsWith('.gltf'));
  const glbFiles = files.filter(f => f.name.toLowerCase().endsWith('.glb'));
  const binFiles = files.filter(f => f.name.toLowerCase().endsWith('.bin'));
  const imageFiles = files.filter(f => /\.(jpe?g|png|gif|webp|bmp)$/i.test(f.name));

  // Determine which type of model to load
  if (glbFiles.length > 0) {
    // GLB is preferred if available (self-contained)
    loadGLBModel(glbFiles[0], loadingIndicator);
  } else if (objFiles.length > 0) {
    // OBJ with MTL if available
    loadOBJModel(objFiles[0], mtlFiles, loadingIndicator);
  } else if (gltfFiles.length > 0) {
    // GLTF with BIN and textures
    loadGLTFModel(gltfFiles[0], binFiles, imageFiles, loadingIndicator);
  } else {
    // No valid model files selected
    loadingIndicator.textContent = 'Error: No valid 3D model file selected (.obj, .gltf, or .glb)';
    setTimeout(() => document.body.removeChild(loadingIndicator), 3000);
  }
});

// Function to load GLB model
function loadGLBModel(glbFile, loadingIndicator) {
  const fileURL = URL.createObjectURL(glbFile);
  const gltfLoader = new GLTFLoader();
  
  console.log("Loading GLB from URL:", fileURL);
  
  gltfLoader.load(
    fileURL,
    (gltf) => {
      processLoadedModel(gltf.scene, true);
      document.body.removeChild(loadingIndicator);
      URL.revokeObjectURL(fileURL);
    },
    (xhr) => {
      const percent = (xhr.loaded / xhr.total) * 100;
      loadingIndicator.textContent = `Loading model... ${Math.round(percent)}%`;
    },
    (error) => {
      console.error('Error loading GLB:', error);
      loadingIndicator.textContent = 'Error loading model: ' + error.message;
      setTimeout(() => {
        document.body.removeChild(loadingIndicator);
      }, 3000);
      URL.revokeObjectURL(fileURL);
    }
  );
}

// Helper function to fix material lighting properties
function fixMaterialLighting(material) {
  // Skip materials that are already correct
  if (!material) return;
  
  // Ensure basic properties are set for proper rendering
  material.needsUpdate = true;
  material.side = THREE.DoubleSide;
  
  // Fix for lighting and shadows
  material.shadowSide = THREE.FrontSide;
  
  // Increase ambient lighting to prevent dark materials
  if (ambientLight.intensity < 0.25) {
    ambientLight.intensity = 0.25; // Increase ambient light to make materials visible
  }
  
  // Add a little more hemisphere light
  if (hemiLight.intensity < 0.2) {
    hemiLight.intensity = 0.2;
  }
  
  // Convert basic materials to standard materials for better lighting
  if (material instanceof THREE.MeshBasicMaterial ||
      material.type === 'MeshBasicMaterial') {
    
    // Create a new standard material with color from the basic material
    const newMaterial = new THREE.MeshStandardMaterial({
      color: material.color ? material.color.clone() : 0xcccccc,
      map: material.map,
      transparent: material.transparent,
      opacity: material.opacity,
      side: THREE.DoubleSide,
      roughness: 0.5, // Decreased for better light reflection
      metalness: 0.1,
      envMapIntensity: 1.0 // Increased for better environment reflection
    });
    
    // Copy over textures if they exist
    if (material.map) newMaterial.map = material.map;
    if (material.normalMap) newMaterial.normalMap = material.normalMap;
    if (material.alphaMap) newMaterial.alphaMap = material.alphaMap;
    
    // Replace the material
    Object.assign(material, newMaterial);
  } 
  // Enhance phong materials
  else if (material instanceof THREE.MeshPhongMaterial || 
          material.type === 'MeshPhongMaterial') {
    
    // Ensure good default values for reflectivity
    material.shininess = Math.max(material.shininess || 30, 30);
    material.specular = material.specular || new THREE.Color(0x444444);
    material.reflectivity = Math.max(material.reflectivity || 0.3, 0.3);
    material.emissive = material.emissive || new THREE.Color(0x111111);
    material.emissiveIntensity = 0.2;
  }
  // Enhance lambert materials
  else if (material instanceof THREE.MeshLambertMaterial || 
          material.type === 'MeshLambertMaterial') {
    
    // Lambert is already good for diffuse, but add default values
    material.emissive = material.emissive || new THREE.Color(0x111111);
    material.emissiveIntensity = 0.2;
  }
  
  // Check for dark or black materials and make them brighter
  if (material.color) {
    // If all color channels are very dark
    if (material.color.r < 0.1 && material.color.g < 0.1 && material.color.b < 0.1) {
      // Make it a medium grey instead of black
      material.color.setRGB(0.6, 0.6, 0.6);
    }
    // If color is too dark but not completely black, brighten it
    else if (material.color.r < 0.3 && material.color.g < 0.3 && material.color.b < 0.3) {
      // Brighten the existing color by multiplying each channel
      material.color.r = Math.min(material.color.r * 2, 1.0);
      material.color.g = Math.min(material.color.g * 2, 1.0);
      material.color.b = Math.min(material.color.b * 2, 1.0);
    }
  }
  
  return material;
}

// Function to load OBJ model
function loadOBJModel(objFile, mtlFiles, loadingIndicator) {
  // Temporarily increase ambient light for OBJ models
  const originalAmbientIntensity = ambientLight.intensity;
  ambientLight.intensity = 0.8; // Increased from 0.5 for better visibility
  
  // Add temporary lighting specifically for OBJ loading
  const tempLight1 = new THREE.PointLight(0xffffff, 1.2); // Increased intensity
  tempLight1.position.set(5, 10, 5);
  tempLight1.name = 'temp_obj_light1';
  scene.add(tempLight1);
  
  const tempLight2 = new THREE.PointLight(0xffffff, 1.2); // Increased intensity
  tempLight2.position.set(-5, 10, -5);
  tempLight2.name = 'temp_obj_light2';
  scene.add(tempLight2);
  
  // Read OBJ file
  const objReader = new FileReader();
  
  objReader.onload = (objEvent) => {
    const objContent = objEvent.target.result;
    
    // Get OBJ file name without extension
    const objName = objFile.name.replace(/\.obj$/i, '');
    console.log("Looking for MTL file matching:", objName);
    
    // Look for a matching MTL file in several ways
    let matchingMtl = null;
    
    // 1. First try exact name match (name.obj → name.mtl)
    matchingMtl = mtlFiles.find(f => f.name.toLowerCase() === `${objName}.mtl`.toLowerCase());
    
    // 2. If not found, try files that start with same name
    if (!matchingMtl) {
      matchingMtl = mtlFiles.find(f => f.name.toLowerCase().startsWith(`${objName.toLowerCase()}.`));
    }
    
    // 3. If still not found, try any MTL file with similar name
    if (!matchingMtl && mtlFiles.length > 0) {
      matchingMtl = mtlFiles[0]; // Take first available MTL file
      console.log("No exact match found, using first available MTL:", matchingMtl.name);
    }
    
    if (matchingMtl) {
      console.log("Loading OBJ with MTL:", matchingMtl.name);
      
      // Load the MTL file
      const mtlReader = new FileReader();
      mtlReader.onload = (mtlEvent) => {
        try {
          // Create a base path for textures (empty since we're loading from memory)
          const basePath = '';
          
          // Parse the MTL file with enhanced options
          const mtlLoader = new MTLLoader();
          mtlLoader.setMaterialOptions({ 
            side: THREE.DoubleSide,
            wrap: THREE.RepeatWrapping,
            normalizeRGB: true,
            ignoreZeroRGBs: true, // Ignore zero RGB values
            invertTrProperty: true // Better transparency handling
          });
          const materials = mtlLoader.parse(mtlEvent.target.result, basePath);
          materials.preload();
          
          // Enhanced material handling - properly enhance all MTL materials
          for (const matName in materials.materials) {
            const material = materials.materials[matName];
            
            // Convert all materials to MeshPhongMaterial for better lighting
            const phongMaterial = new THREE.MeshPhongMaterial({
              color: material.color ? material.color.clone() : new THREE.Color(0xcccccc),
              specular: new THREE.Color(0x555555), // Increased specular
              shininess: 35, // Increased shininess
              reflectivity: 0.5, // Increased reflectivity
              transparent: material.transparent,
              opacity: material.opacity,
              side: THREE.DoubleSide,
              map: material.map,
              normalMap: material.normalMap,
              specularMap: material.specularMap,
              alphaMap: material.alphaMap
            });
            
            // Ensure emissive contribution
            phongMaterial.emissive = new THREE.Color(0x111111);
            phongMaterial.emissiveIntensity = 0.2;
            
            // Brighten dark materials
            if (phongMaterial.color) {
              const maxChannel = Math.max(
                phongMaterial.color.r,
                phongMaterial.color.g,
                phongMaterial.color.b
              );
              if (maxChannel < 0.1) {
                // Very dark material - make grey
                phongMaterial.color.setRGB(0.7, 0.7, 0.7);
              } else if (maxChannel < 0.3) {
                // Dark material - brighten it
                phongMaterial.color.r = Math.min(phongMaterial.color.r * 3.5, 1.0);
                phongMaterial.color.g = Math.min(phongMaterial.color.g * 3.5, 1.0);
                phongMaterial.color.b = Math.min(phongMaterial.color.b * 3.5, 1.0);
              }
            }
            
            // Enable shadows
            phongMaterial.castShadow = true;
            phongMaterial.receiveShadow = true;
            
            // Replace the original material
            materials.materials[matName] = phongMaterial;
          }
          
          // Create OBJ loader and set materials
          const objLoader = new OBJLoader();
          objLoader.setMaterials(materials);
          
          // Parse the OBJ file with materials
          const object = objLoader.parse(objContent);
          
          // Additional material fixes after parsing
          object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                  if (mat.map) mat.map.encoding = THREE.sRGBEncoding;
                  mat.needsUpdate = true;
                });
              } else if (child.material) {
                if (child.material.map) child.material.map.encoding = THREE.sRGBEncoding;
                child.material.needsUpdate = true;
              }
              
              // Enable shadows
              child.castShadow = true;
              child.receiveShadow = true;
              
              // Add edge lines
              if (child.geometry) {
                child.geometry.computeVertexNormals();
                const edges = new EdgesGeometry(child.geometry, 15);
                const edgeLines = new LineSegments(edges, edgeMaterial);
                child.add(edgeLines);
              }
            }
          });
          
          console.log("OBJ loaded with enhanced materials and lighting");
          processLoadedModel(object, true, true); // Keep original materials, skip material replacement
          document.body.removeChild(loadingIndicator);
          
          // Keep increased lighting for better visibility
          ambientLight.intensity = 0.6; // Maintain higher ambient light
          hemiLight.intensity = 0.4; // Increase hemisphere light
          
          // Remove temporary lights after a short delay
          setTimeout(() => {
            scene.remove(scene.getObjectByName('temp_obj_light1'));
            scene.remove(scene.getObjectByName('temp_obj_light2'));
          }, 100);
        } catch (error) {
          console.error("Error processing MTL file:", error);
          
          // Fallback to without MTL if there's an error
          console.log("Falling back to enhanced material for OBJ");
          scene.remove(scene.getObjectByName('temp_obj_light1'));
          scene.remove(scene.getObjectByName('temp_obj_light2'));
          ambientLight.intensity = originalAmbientIntensity;
          const objLoader = new OBJLoader();
          const object = objLoader.parse(objContent);
          processLoadedModel(object, false); // Use clay material
          document.body.removeChild(loadingIndicator);
        }
      };
      
      mtlReader.onerror = () => {
        console.error("Error reading MTL file");
        
        // Load OBJ without materials due to MTL read error
        console.log("Loading OBJ without materials due to MTL read error");
        scene.remove(scene.getObjectByName('temp_obj_light1'));
        scene.remove(scene.getObjectByName('temp_obj_light2'));
        ambientLight.intensity = originalAmbientIntensity;
        const objLoader = new OBJLoader();
        const object = objLoader.parse(objContent);
        processLoadedModel(object, false); // Use clay material
        document.body.removeChild(loadingIndicator);
      };
      
      // Start reading the MTL file
      mtlReader.readAsText(matchingMtl);
    } else {
      console.log("No MTL file found, loading OBJ with enhanced material");
      
      // No MTL file, load OBJ with enhanced material
      scene.remove(scene.getObjectByName('temp_obj_light1'));
      scene.remove(scene.getObjectByName('temp_obj_light2'));
      
      // Create enhanced default material
      const enhancedMaterial = new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        specular: 0x555555,
        shininess: 35,
        reflectivity: 0.5,
        side: THREE.DoubleSide
      });
      
      const objLoader = new OBJLoader();
      const object = objLoader.parse(objContent);
      
      // Apply enhanced material
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = enhancedMaterial.clone();
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      processLoadedModel(object, true); // Use enhanced material
      document.body.removeChild(loadingIndicator);
      
      // Maintain better lighting
      ambientLight.intensity = 0.6;
      hemiLight.intensity = 0.4;
    }
  };
  
  objReader.onerror = () => {
    console.error("Error reading OBJ file");
    scene.remove(scene.getObjectByName('temp_obj_light1'));
    scene.remove(scene.getObjectByName('temp_obj_light2'));
    ambientLight.intensity = originalAmbientIntensity;
    loadingIndicator.textContent = 'Error reading OBJ file';
    setTimeout(() => document.body.removeChild(loadingIndicator), 3000);
  };
  
  // Start reading the OBJ file
  objReader.readAsText(objFile);
}

// Function to load GLTF model
function loadGLTFModel(gltfFile, binFiles, imageFiles, loadingIndicator) {
  // Create a map of available resources
  const resources = {};
  const fileMap = new Map();
  
  // Add all files to the map for easy access
  [...binFiles, ...imageFiles, gltfFile].forEach(file => {
    fileMap.set(file.name, file);
    
    // Also map by basename for easier lookup
    const basename = file.name.split('/').pop();
    fileMap.set(basename, file);
  });
  
  // Read the GLTF file first
  const gltfReader = new FileReader();
  
  gltfReader.onload = (gltfEvent) => {
    let gltfJson;
    try {
      // Parse the GLTF to find required resources
      gltfJson = JSON.parse(gltfEvent.target.result);
      
      // Set up GLTF loader with intercepted file loading
      const manager = new THREE.LoadingManager();
      const loader = new GLTFLoader(manager);
      
      // Intercept file loading requests
      manager.setURLModifier((url) => {
        // Extract the base filename
        const basename = url.split('/').pop();
        console.log("Looking for resource:", basename);
        
        // Check if we have this file
        if (fileMap.has(basename)) {
          const file = fileMap.get(basename);
          
          // Create a blob URL for the file
          if (!resources[basename]) {
            resources[basename] = URL.createObjectURL(file);
            console.log("Created URL for:", basename, resources[basename]);
          }
          
          return resources[basename];
        }
        
        console.warn("Resource not found:", basename);
        return url;
      });
      
      // Create a blob URL for the GLTF file itself
      const gltfUrl = URL.createObjectURL(gltfFile);
      
      // Load the model
      loader.load(
        gltfUrl,
        (gltf) => {
          processLoadedModel(gltf.scene, true);
          document.body.removeChild(loadingIndicator);
          
          // Clean up all created URLs
          URL.revokeObjectURL(gltfUrl);
          Object.values(resources).forEach(url => URL.revokeObjectURL(url));
        },
        (xhr) => {
          const percent = (xhr.loaded / xhr.total) * 100;
          loadingIndicator.textContent = `Loading model... ${Math.round(percent)}%`;
        },
        (error) => {
          console.error("GLTF load error:", error);
          loadingIndicator.textContent = 'Error: ' + error.message;
          
          // Try to provide more helpful error message
          if (gltfJson.buffers && gltfJson.buffers.length > 0) {
            const missingBuffers = gltfJson.buffers
              .filter(buffer => buffer.uri && !fileMap.has(buffer.uri.split('/').pop()))
              .map(buffer => buffer.uri);
            
            if (missingBuffers.length > 0) {
              loadingIndicator.textContent = `Missing required files: ${missingBuffers.join(', ')}`;
            }
          }
          
          setTimeout(() => document.body.removeChild(loadingIndicator), 5000);
          
          // Clean up all created URLs
          URL.revokeObjectURL(gltfUrl);
          Object.values(resources).forEach(url => URL.revokeObjectURL(url));
        }
      );
    } catch (error) {
      console.error("Error parsing GLTF JSON:", error);
      loadingIndicator.textContent = 'Error parsing GLTF file: ' + error.message;
      setTimeout(() => document.body.removeChild(loadingIndicator), 3000);
    }
  };
  
  gltfReader.onerror = () => {
    console.error("Error reading GLTF file");
    loadingIndicator.textContent = 'Error reading GLTF file';
    setTimeout(() => document.body.removeChild(loadingIndicator), 3000);
  };
  
  gltfReader.readAsText(gltfFile);
}

// Function to process any loaded 3D model
function processLoadedModel(object, keepMaterials = false, skipMaterialReplacement = false) {
  // Remove existing model
  scene.remove(scene.getObjectByName('uploadedModel'));
  
  // Apply clay material to all meshes and add edges
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      // Handle material assignments
      if (!keepMaterials) {
        // Always use clay material
        child.material = clayMaterial.clone();
      } else if (!skipMaterialReplacement) {
        // Make sure original materials can cast and receive shadows
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              fixMaterialLighting(mat);
            });
          } else {
            fixMaterialLighting(child.material);
          }
        }
      }
      
      // Always ensure shadows are enabled
      child.castShadow = true;
      child.receiveShadow = true;
      
      // Add edge lines if not already added
      if (child.geometry && !child.children.some(c => c instanceof THREE.LineSegments)) {
        child.geometry.computeVertexNormals();
        child.geometry.normalizeNormals();
        const edges = new EdgesGeometry(child.geometry, 15);
        const edgeLines = new LineSegments(edges, edgeMaterial);
        child.add(edgeLines);
      }
    }
  });

  // Center the model
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 3 / maxDim;
  object.scale.multiplyScalar(scale);
  object.position.x = -center.x * scale;
  object.position.z = -center.z * scale;
  object.position.y = -box.min.y * scale;
  object.name = 'uploadedModel';
  scene.add(object);

  // Update camera position
  camera.position.set(maxDim * scale * 2, maxDim * scale * 1.5, maxDim * scale * 2);
  controls.target.set(0, 0, 0);
  controls.update();
  
  // Store model data for future reference
  window.modelLoaded = {
    center: center.clone(),
    maxDim: maxDim,
    scale: scale
  };
  
  // Make sure lighting is increased for better visibility
  if (ambientLight.intensity < 0.2) {
    ambientLight.intensity = 0.2;
  }
  if (hemiLight.intensity < 0.1) {
    hemiLight.intensity = 0.1;
  }
}

// Function to add a message to the chat
function addMessage(text, sender) {
  const messagesContainer = document.querySelector('.chatbox-messages');
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');
  messageElement.classList.add(sender === 'user' ? 'user-message' : 'bot-message');
  
  // Process text for special formatting
  let formattedText = text
    // Convert Texas A&M University to maroon color
    .replace(/Texas A&M University/g, '<span class="tamu">Texas A&M University</span>')
    // Convert emoji shortcodes to actual emojis
    .replace(/:white_check_mark:/g, '<span class="emoji">✅</span>')
    .replace(/:warning:/g, '<span class="emoji">⚠️</span>')
    .replace(/:pushpin:/g, '<span class="emoji">📌</span>')
    .replace(/:link:/g, '<span class="emoji">🔗</span>')
    // Convert markdown-style bold to HTML bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // If it's a bot message and doesn't already have a details prompt,
  // add the "Would you like more details?" prompt
  if (sender === 'bot' && !text.includes('Would you like more details?')) {
    formattedText += '<div class="details-prompt">Would you like more details? (Yes/No)</div>';
  }
  
  // Use innerHTML to preserve HTML formatting
  messageElement.innerHTML = formattedText;
  
  messagesContainer.appendChild(messageElement);
  
  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

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

// Create chatbot UI
function createChatbotUI() {
  // Add Inter font from Google Fonts
  const fontLink = document.createElement('link');
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';
  fontLink.rel = 'stylesheet';
  document.head.appendChild(fontLink);
  
  // Create main container for chatbot
  const chatbotContainer = document.createElement('div');
  document.body.appendChild(chatbotContainer);
  
  // Update chatbot icon
  const chatbotIcon = document.createElement('div');
  chatbotIcon.id = 'chatbot-icon';
  chatbotIcon.style.backgroundImage = 'url(/models/chatbot.png)';
  chatbotIcon.style.backgroundSize = '80%'; // Adjust size for logo
  chatbotIcon.style.backgroundPosition = 'center';
  chatbotIcon.style.backgroundRepeat = 'no-repeat';
  chatbotIcon.style.width = '80px'; // Increase size for circle
  chatbotIcon.style.height = '80px';
  chatbotIcon.style.position = 'fixed';
  chatbotIcon.style.left = 'calc(50% - 80px)'; // Adjusted for spacing
  chatbotIcon.style.bottom = '30%';
  chatbotIcon.style.transform = 'translateX(-50%)';
  chatbotIcon.style.cursor = 'pointer';
  chatbotIcon.style.zIndex = '1000';
  chatbotIcon.style.backgroundColor = 'rgba(255, 255, 255, 0.47)'; // Glassmorphism background
  chatbotIcon.style.borderRadius = '50%'; // Circle shape
  chatbotIcon.style.backdropFilter = 'blur(10px)'; // Glass effect
  chatbotIcon.style.border = 'none'; // Remove border

  // Update chatbot icon shadow

  document.body.appendChild(chatbotIcon);
  
  // Update camera icon
  const cameraIcon = document.createElement('div');
  cameraIcon.id = 'camera-icon';
  cameraIcon.style.backgroundImage = 'url(/models/camera.png)';
  cameraIcon.style.backgroundSize = '60%'; // Adjust size for logo
  cameraIcon.style.backgroundPosition = 'center';
  cameraIcon.style.backgroundRepeat = 'no-repeat';
  cameraIcon.style.width = '80px'; // Increase size for circle
  cameraIcon.style.height = '80px';
  cameraIcon.style.position = 'fixed';
  cameraIcon.style.left = 'calc(50% + 80px)'; // Adjusted for spacing
  cameraIcon.style.bottom = '30%';
  cameraIcon.style.transform = 'translateX(-50%)';
  cameraIcon.style.cursor = 'pointer';
  cameraIcon.style.zIndex = '1000';
  cameraIcon.style.backgroundColor = 'rgba(255, 255, 255, 0.47)'; // Glassmorphism background
  cameraIcon.style.borderRadius = '50%'; // Circle shape
  cameraIcon.style.backdropFilter = 'blur(5px)'; // Glass effect
  cameraIcon.style.border = 'none'; // Remove border

  // Update camera icon shadow

  document.body.appendChild(cameraIcon);
  
  // Create chatbox
  const chatbox = document.createElement('div');
  chatbox.id = 'chatbox';
  chatbox.style.display = 'none';
  chatbox.innerHTML = `
    <div class="chatbox-header">
      <div class="chatbox-title">AI Architectural Analyst</div>
      <div class="chatbox-close">×</div>
    </div>
    <div class="chatbox-messages"></div>
    <div class="chatbox-input-container">
      <input type="text" class="chatbox-input" placeholder="Ask about the architectural design...">
      <button class="chatbox-send">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#FFFFFF">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
        </svg>
      </button>
    </div>
  `;
  chatbotContainer.appendChild(chatbox);
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    body, button, input {
      font-family: 'Inter', sans-serif;
    }
    
    #chatbot-icon {
      position: fixed;
      left: 40%;
      top: 70%;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #3f51b5;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;
      z-index: 1000;
    }
    
    #camera-icon {
      position: fixed;
      left: calc(40% + 70px); /* Position to the right of chatbot icon */
      top: 70%;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #4CAF50; /* Green color for camera */
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;
      z-index: 1000;
    }
    
    #chatbot-icon:hover, #camera-icon:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
    }
    
    #chatbox {
      position: fixed;
      left: calc(40% - 150px);
      top: calc(70% - 350px);
      width: 350px;
      height: 450px;
      background-color: #fff;
      border-radius: 20px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 1000;
      font-family: 'Inter', sans-serif;
    }
    
    .chatbox-header {
      padding: 15px;
      background-color:rgb(53, 148, 148);
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: move; /* Indicate draggable */
      user-select: none; /* Prevent text selection during drag */
    }
    
    .chatbox-title {
      font-weight: 600;
      font-size: 16px;
    }
    
    .chatbox-close {
      font-size: 24px;
      cursor: pointer;
    }
    
    .chatbox-messages {
      flex: 1;
      padding: 15px;
      overflow-y: auto;
    }
    
    .message {
      margin-bottom: 10px;
      padding: 8px 15px;
      border-radius: 18px;
      max-width: 80%;
      word-wrap: break-word;
      font-size: 14px;
      line-height: 1.5;
    }
    
    .message ul {
      list-style-type: none;
      margin: 5px 0;
      padding-left: 5px;
    }
    
    .message li {
      margin: 5px 0;
      position: relative;
      padding-left: 20px;
    }
    
    .message li:before {
      content: "-";
      position: absolute;
      left: 5px;
    }
    
    .message strong, .message b {
      font-weight: 600;
    }
    
    .message p {
      margin: 8px 0;
    }
    
    .message .tamu {
      color: #500000;
      font-weight: bold;
    }
    
    .message .emoji {
      font-size: 16px;
      vertical-align: middle;
      margin: 0 2px;
    }
    
    .message .highlight {
      background-color: rgba(255, 255, 0, 0.2);
      padding: 0 3px;
    }
    
    .message .details-prompt {
      margin-top: 10px;
      font-style: italic;
      color: #666;
    }
    
    .user-message {
      background-color:rgb(156, 218, 218);
      box-shadow: -3px 3px 10px rgba(0, 0, 0, 0.33); /* Adds a shadow on the opposite side */
      margin-left: auto;
      border-bottom-right-radius: 5px;
    }
    
    .bot-message {
      background-color: #f1f1f1;
      box-shadow: -3px 3px 10px rgba(0, 0, 0, 0.33); /* Adds a shadow on the opposite side */

      margin-right: auto;
      border-bottom-left-radius: 5px;
    }
    
    .loading-message {
      position: relative;
      padding-right: 40px;
    }
    
    .loading-message:after {
      content: "";
      position: absolute;
      right: 15px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      border: 3px solid #ddd;
      border-radius: 50%;
      border-top-color: #3f51b5;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to {
        transform: translateY(-50%) rotate(360deg);
      }
    }
    
    .chatbox-input-container {
      display: flex;
      padding: 10px;
      border-top: 1px solid #eee;
    }
    
    .chatbox-input {
      flex: 1;
      padding: 10px 15px;
      border: 1px solid #ddd;
      border-radius: 20px;
      outline: none;
      font-size: 14px;
    }
    
    .chatbox-send {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color:rgb(53, 148, 148);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 10px;
      cursor: pointer;
      border: none;
      outline: none;
    }
    
    .chatbox-send:hover {
      background-color:rgb(30, 99, 99);
    }
    
    .capture-notification {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 12px 24px;
      border-radius: 30px;
      font-size: 14px;
      z-index: 1001;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .show-notification {
      opacity: 1;
    }
  `;
  document.head.appendChild(style);
  
  // Add event listeners
  chatbotIcon.addEventListener('click', () => {
    chatbox.style.display = 'flex';
    chatbotIcon.style.display = 'none';
    
    // Add welcome message if the chat is empty
    const messagesContainer = document.querySelector('.chatbox-messages');
    if (messagesContainer.childElementCount === 0) {
      const welcomeMessage = `
        ✅ **Welcome to the AI Architectural Analyst!** 👋

        I can help you analyze the architectural design of the 3D model. To get started:
        
        - Click the green camera button to capture views of the model
        - Ask me specific questions about the design
        - I'll analyze the model's architectural features, sustainability, and functional performance
        
        Would you like more details? (Yes/No)
      `;
      addMessage(welcomeMessage, 'bot');
    }
  });
  
  document.querySelector('.chatbox-close').addEventListener('click', () => {
    chatbox.style.display = 'none';
    chatbotIcon.style.display = 'flex';
  });
  
  // Camera icon click handler - direct capture without going through chatbot
  cameraIcon.addEventListener('click', () => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'capture-notification';
    notification.textContent = 'Taking screenshots from multiple angles...';
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
      notification.classList.add('show-notification');
    }, 100);
    
    // Start capture process after a short delay
    setTimeout(() => {
      captureMultipleViews();
      
      // Remove notification after capture is complete
      setTimeout(() => {
        notification.classList.remove('show-notification');
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 300);
      }, 1500);
    }, 400);
  });
  
  document.querySelector('.chatbox-send').addEventListener('click', sendMessage);
  document.querySelector('.chatbox-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
  
  // Make the chatbox draggable
  makeDraggable(chatbox, document.querySelector('.chatbox-header'));
  
  // Function to make an element draggable
  function makeDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    if (handle) {
      // If a handle is specified, attach events to the handle
      handle.onmousedown = dragMouseDown;
    } else {
      // Otherwise, attach events to the element itself
      element.onmousedown = dragMouseDown;
    }
    
    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      
      // Get the mouse cursor position at startup
      pos3 = e.clientX;
      pos4 = e.clientY;
      
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }
    
    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      
      // Calculate the new cursor position
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      
      // Set the element's new position
      element.style.top = (element.offsetTop - pos2) + "px";
      element.style.left = (element.offsetLeft - pos1) + "px";
    }
    
    function closeDragElement() {
      // Stop moving when mouse button is released
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }
  
  // Function to send a message
  function sendMessage() {
    const inputElement = document.querySelector('.chatbox-input');
    const messageText = inputElement.value.trim();
    
    if (messageText === '') return;
    
    // Add user message to chat
    addMessage(messageText, 'user');
    inputElement.value = '';
    
    // Show loading indicator
    const loadingMessage = document.createElement('div');
    loadingMessage.classList.add('message', 'bot-message', 'loading-message');
    loadingMessage.textContent = 'Analyzing...';
    document.querySelector('.chatbox-messages').appendChild(loadingMessage);
    
    // Check if we have a captured image to analyze
    const latestImageEl = document.getElementById('latest-captured-image');
    if (latestImageEl && latestImageEl.src) {
      // We have an image, send it for analysis with the user's query
      console.log("Sending image for analysis with query:", messageText);
      
      fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: latestImageEl.src,
          prompt: messageText
        })
      })
      .then(response => response.json())
      .then(data => {
        // Remove loading message
        document.querySelector('.loading-message').remove();
        
        if (data.error) {
          addMessage("Error analyzing image: " + data.error, 'bot');
        } else {
          addMessage(data.analysis, 'bot');
        }
      })
      .catch(error => {
        // Remove loading message
        document.querySelector('.loading-message').remove();
        
        console.error("Error sending image for analysis:", error);
        addMessage("Sorry, there was an error analyzing the image. Please try again.", 'bot');
      });
    } else {
      // No image available, just use the regular chat API
      console.log("No image available, using regular chat API");
      
      fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: messageText
        })
      })
      .then(response => response.json())
      .then(data => {
        // Remove loading message
        document.querySelector('.loading-message').remove();
        
        if (data.error) {
          addMessage("Error: " + data.error, 'bot');
        } else {
          addMessage(data.response, 'bot');
        }
      })
      .catch(error => {
        // Remove loading message
        document.querySelector('.loading-message').remove();
        
        console.error("Error sending message:", error);
        addMessage("Sorry, there was an error processing your message. Please try again.", 'bot');
      });
    }
  }
}

// Initialize the chatbot UI when the page loads
createChatbotUI();

// Improved function to capture multiple views of the model
function captureMultipleViews() {
  console.log("Starting capture process...");
  
  // Save original camera position, controls target, and FOV
  const originalPosition = camera.position.clone();
  const originalTarget = controls.target.clone();
  const originalRotation = camera.rotation.clone();
  const originalFOV = camera.fov;
  
  // Set a wider FOV for capturing views
  const captureFOV = 45; // Lower FOV for less distortion (changed from 60)
  camera.fov = captureFOV;
  camera.updateProjectionMatrix();
  
  // Temporarily hide GUI and chatbot elements
  const guiElement = document.querySelector('.lil-gui');
  const chatbotIcon = document.getElementById('chatbot-icon');
  const cameraIcon = document.getElementById('camera-icon');
  const chatbox = document.getElementById('chatbox');
  
  if (guiElement) guiElement.style.display = 'none';
  if (chatbotIcon) chatbotIcon.style.display = 'none';
  if (cameraIcon) cameraIcon.style.display = 'none';
  if (chatbox) chatbox.style.display = 'none';
  
  // Create canvas for combined image
  const combinedCanvas = document.createElement('canvas');
  const size = 700; // Increased size for higher resolution (changed from 600)
  combinedCanvas.width = size * 2;
  combinedCanvas.height = size * 2;
  const ctx = combinedCanvas.getContext('2d');
  
  console.log("Determining camera positions based on model...");
  
  // Use model data if available, or fall back to scene traversal
  let modelCenter, viewDistance;
  
  if (window.modelLoaded) {
    // Use the pre-calculated model data from when the model was loaded
    const modelData = window.modelLoaded;
    modelCenter = modelData.center.clone();
    
    // Apply the same scale that was applied to the model
    modelCenter.multiplyScalar(modelData.scale);
    
    // Model center is offset by the model position after centering
    modelCenter.y = 0; // The bottom is at y=0
    
    // Calculate view distance based on model size - use a larger multiplier for wider views
    viewDistance = modelData.maxDim * modelData.scale * 2.2; // Increased from 1.8 to 2.2 for less distortion
    console.log(`Using loaded model data: maxDim=${modelData.maxDim.toFixed(2)}, scale=${modelData.scale.toFixed(2)}`);
  } else {
    // Fallback to calculating bounds from scene
    const modelBoundingBox = new THREE.Box3();
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child !== ground && child !== sunSphere) {
        modelBoundingBox.expandByObject(child);
      }
    });
    
    modelCenter = new THREE.Vector3();
    modelBoundingBox.getCenter(modelCenter);
    
    const modelSize = new THREE.Vector3();
    modelBoundingBox.getSize(modelSize);
    
    viewDistance = Math.max(modelSize.x, modelSize.y, modelSize.z) * 2.2; // Increased from 1.8 to 2.2
    console.log(`Calculated model dimensions: ${modelSize.x.toFixed(2)} x ${modelSize.y.toFixed(2)} x ${modelSize.z.toFixed(2)}`);
  }
  
  console.log(`Camera distance: ${viewDistance.toFixed(2)}`);
  console.log(`Model center: x=${modelCenter.x.toFixed(2)}, y=${modelCenter.y.toFixed(2)}, z=${modelCenter.z.toFixed(2)}`);
  
  // Create dynamic camera views based on model dimensions
  const views = [
    { 
      name: 'front', 
      position: new THREE.Vector3(
        modelCenter.x, 
        modelCenter.y + viewDistance * 0.2, // Lower elevation for better perspective
        modelCenter.z + viewDistance
      ), 
      target: new THREE.Vector3(modelCenter.x, modelCenter.y, modelCenter.z)
    },
    { 
      name: 'side', 
      position: new THREE.Vector3(
        modelCenter.x + viewDistance,
        modelCenter.y + viewDistance * 0.2, // Lower elevation for better perspective
        modelCenter.z
      ), 
      target: new THREE.Vector3(modelCenter.x, modelCenter.y, modelCenter.z)
    },
    { 
      name: 'top', 
      position: new THREE.Vector3(
        modelCenter.x,
        modelCenter.y + viewDistance * 1.5, // Higher for top view (increased from 1.2)
        modelCenter.z
      ), 
      target: new THREE.Vector3(modelCenter.x, modelCenter.y, modelCenter.z)
    },
    { 
      name: 'angle', 
      position: new THREE.Vector3(
        modelCenter.x + viewDistance * 0.8,
        modelCenter.y + viewDistance * 0.4,
        modelCenter.z + viewDistance * 0.8
      ), 
      target: new THREE.Vector3(modelCenter.x, modelCenter.y, modelCenter.z)
    }
  ];
  
  let captureCount = 0;
  const captureNextView = (index) => {
    if (index >= views.length) {
      // All views have been captured, create final image and restore view
      console.log("All views captured, creating final image...");
      
      // Convert the combined canvas to an image
      const link = document.createElement('a');
      link.download = 'model_views.jpg';
      link.href = combinedCanvas.toDataURL('image/jpeg', 0.98); // Higher quality (increased from 0.97)
      
      // Create preview element
      const previewContainer = document.createElement('div');
      previewContainer.style.position = 'fixed';
      previewContainer.style.top = '50%';
      previewContainer.style.left = '50%';
      previewContainer.style.transform = 'translate(-50%, -50%)';
      previewContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      previewContainer.style.padding = '20px';
      previewContainer.style.borderRadius = '10px';
      previewContainer.style.zIndex = '1000';
      previewContainer.style.display = 'flex';
      previewContainer.style.flexDirection = 'column';
      previewContainer.style.alignItems = 'center';
      
      const previewImage = document.createElement('img');
      previewImage.src = link.href;
      previewImage.style.width = '900px'; // Larger preview (increased from 700px)
      previewImage.style.marginBottom = '10px';
      previewImage.style.borderRadius = '5px';
      
      // Ensure preview isn't too large for the screen
      const maxHeight = window.innerHeight * 0.85;
      previewImage.style.maxHeight = `${maxHeight}px`;
      
      const downloadButton = document.createElement('button');
      downloadButton.textContent = 'Download Image';
      downloadButton.style.padding = '10px 20px';
      downloadButton.style.backgroundColor = '#4CAF50';
      downloadButton.style.color = 'white';
      downloadButton.style.border = 'none';
      downloadButton.style.borderRadius = '5px';
      downloadButton.style.cursor = 'pointer';
      downloadButton.style.marginRight = '10px';
      
      const closeButton = document.createElement('button');
      closeButton.textContent = 'Close';
      closeButton.style.padding = '10px 20px';
      closeButton.style.backgroundColor = '#f44336';
      closeButton.style.color = 'white';
      closeButton.style.border = 'none';
      closeButton.style.borderRadius = '5px';
      closeButton.style.cursor = 'pointer';
      
      const buttonContainer = document.createElement('div');
      buttonContainer.style.display = 'flex';
      buttonContainer.style.marginTop = '10px';
      
      buttonContainer.appendChild(downloadButton);
      buttonContainer.appendChild(closeButton);
      
      previewContainer.appendChild(previewImage);
      previewContainer.appendChild(buttonContainer);
      
      document.body.appendChild(previewContainer);
      
      downloadButton.addEventListener('click', () => {
        console.log("Downloading image...");
        link.click();
      });
      
      closeButton.addEventListener('click', () => {
        document.body.removeChild(previewContainer);
      });
      
      // Store reference to latest captured image for chatbot
      const latestImageEl = document.createElement('img');
      latestImageEl.id = 'latest-captured-image';
      latestImageEl.src = link.href;
      latestImageEl.style.display = 'none';
      if (document.getElementById('latest-captured-image')) {
        document.body.removeChild(document.getElementById('latest-captured-image'));
      }
      document.body.appendChild(latestImageEl);
      
      // Add message in chatbot about the new image
      const chatboxMessages = document.querySelector('.chatbox-messages');
      if (chatboxMessages) {
        const imageReadyMessage = document.createElement('div');
        imageReadyMessage.classList.add('message', 'bot-message');
        imageReadyMessage.innerHTML = 'I\'ve captured new images of your model. You can now ask me questions about the design!';
        chatboxMessages.appendChild(imageReadyMessage);
        chatboxMessages.scrollTop = chatboxMessages.scrollHeight;
      }
      
      // Restore the original camera view
      camera.position.copy(originalPosition);
      controls.target.copy(originalTarget);
      camera.rotation.copy(originalRotation);
      camera.fov = originalFOV;
      camera.updateProjectionMatrix();
      controls.update();
      
      // Show GUI and chatbot elements again
      if (guiElement) guiElement.style.display = 'block';
      if (chatbotIcon) chatbotIcon.style.display = 'block';
      if (cameraIcon) cameraIcon.style.display = 'block';
      
      return;
    }
    
    const view = views[index];
    console.log(`Capturing ${view.name} view...`);
    
    // Position the camera for this view
    camera.position.copy(view.position);
    controls.target.copy(view.target);
    camera.lookAt(view.target);
    controls.update();
    
    // Give time for the camera to update before rendering
    setTimeout(() => {
      // Render the scene
      renderer.render(scene, camera);
      
      // Create temporary canvas for this view
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = size;
      tempCanvas.height = size;
      const tempCtx = tempCanvas.getContext('2d');
      
      // Draw to the temporary canvas with proper aspect ratio preservation
      const rendererWidth = renderer.domElement.width;
      const rendererHeight = renderer.domElement.height;
      let sourceWidth, sourceHeight, sourceX, sourceY;
      
      if (rendererWidth > rendererHeight) {
        // Landscape mode - crop width
        sourceHeight = rendererHeight;
        sourceWidth = sourceHeight;
        sourceX = (rendererWidth - sourceWidth) / 2;
        sourceY = 0;
      } else {
        // Portrait mode - crop height
        sourceWidth = rendererWidth;
        sourceHeight = sourceWidth;
        sourceX = 0;
        sourceY = (rendererHeight - sourceHeight) / 2;
      }
      
      // Draw the cropped, square image to maintain proper proportions
      tempCtx.drawImage(
        renderer.domElement, 
        sourceX, sourceY, sourceWidth, sourceHeight, 
        0, 0, size, size
      );
      
      // Add view label
      tempCtx.font = 'bold 24px Arial'; // Increased font size (was 20px)
      tempCtx.fillStyle = 'white';
      tempCtx.strokeStyle = 'black';
      tempCtx.lineWidth = 4;
      tempCtx.strokeText(view.name.toUpperCase(), 15, 35); // Adjusted position (was 10, 30)
      tempCtx.fillText(view.name.toUpperCase(), 15, 35);
      
      // Determine position in combined canvas
      let x = 0, y = 0;
      if (index === 0) { // Front - top left
        x = 0;
        y = 0;
      } else if (index === 1) { // Side - top right
        x = size;
        y = 0;
      } else if (index === 2) { // Top - bottom left
        x = 0;
        y = size;
      } else if (index === 3) { // Angle - bottom right
        x = size;
        y = size;
      }
      
      // Draw to the combined canvas
      ctx.drawImage(tempCanvas, x, y);
      
      // Proceed to the next view
      captureCount++;
      console.log(`Captured ${captureCount}/${views.length} views`);
      captureNextView(index + 1);
    }, 100);
  };
  
  // Start capturing from the first view
  captureNextView(0);
}

// Create a smaller XY grid helper
const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0x444444);
gridHelper.position.y = 0; // Align with the ground
scene.add(gridHelper);

// Ensure lighting is restored
scene.add(ambientLight);
scene.add(hemiLight);
scene.add(bounceLight);

// Add a toggle button to show/hide the sun sphere
const toggleSunButton = document.createElement('button');
toggleSunButton.textContent = 'Toggle Sun';
toggleSunButton.style.position = 'fixed';
toggleSunButton.style.left = '10px';
toggleSunButton.style.top = '10px';
toggleSunButton.style.zIndex = '1000';
toggleSunButton.style.padding = '10px';
toggleSunButton.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
toggleSunButton.style.border = 'none';
toggleSunButton.style.borderRadius = '20px';
toggleSunButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
toggleSunButton.style.cursor = 'pointer';
document.body.appendChild(toggleSunButton);

toggleSunButton.addEventListener('click', () => {
  sunSphere.visible = !sunSphere.visible; // Toggle visibility
});

animate(); 