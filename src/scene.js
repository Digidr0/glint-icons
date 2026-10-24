import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { autoSmoothIcon } from './smooth-normals.js';
import { defaults, defaultCamera, cameraStorageKey } from './defaults.js';
import { normalizeUVChannel } from './uv-channels.js';
import { loadWatermarkFont, drawWatermark } from './watermark.js';

const modelURL = new URL('../3D/Icon.glb', import.meta.url).href;
const normalURL = new URL('../3D/Normal.webp', import.meta.url).href;
const hdrURL = new URL('../3D/studio_small_01_1k.hdr', import.meta.url).href;

// Keep the source GLB untouched. All three UV sets are passed explicitly so the
// pattern and decal can be transformed independently in the same PBR material.
const shaderPars = `
varying vec2 vStudioUV;
varying vec2 vStudioLogoUV;
varying vec2 vStudioFrontUV;
varying vec3 vStudioPosition;
varying vec3 vStudioNormal;
uniform sampler2D studioPattern;
uniform sampler2D studioLogo;
uniform sampler2D studioFlakes;
uniform float studioHasPattern;
uniform float studioHasLogo;
uniform float studioPatternStrength;
uniform float studioPatternScale;
uniform float studioPatternRotation;
uniform vec2 studioPatternOffset;
uniform float studioPatternRoughness;
uniform float studioPatternUV;
uniform float studioLogoScale;
uniform vec2 studioLogoOffset;
uniform float studioLogoUV;
uniform float studioFlakeStrength;
vec2 sourceUVFor(float channel) {
  if (channel > 1.5) return vStudioFrontUV;
  return mix(vStudioUV, vStudioLogoUV, channel);
}
float frontMask() {
  return smoothstep(0.75, 0.98, vStudioNormal.y) * step(0.17, vStudioPosition.y);
}
vec2 patternUV() {
  float a = studioPatternRotation;
  vec2 sourceUV = sourceUVFor(studioPatternUV);
  return mat2(cos(a), -sin(a), sin(a), cos(a)) * (sourceUV - 0.5) * studioPatternScale + 0.5 - studioPatternOffset;
}
vec4 patternSample() {
  vec4 pattern = texture2D(studioPattern, patternUV());
  if (studioPatternUV > 1.5) pattern.a *= frontMask();
  return pattern;
}
vec4 logoSample() {
  vec2 sourceUV = sourceUVFor(studioLogoUV);
  vec2 p = (sourceUV - 0.5 - studioLogoOffset) / studioLogoScale + 0.5;
  float inside = step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0);
  float front = frontMask();
  vec4 logo = texture2D(studioLogo, clamp(p, 0.0, 1.0));
  logo.a *= inside * front * studioHasLogo;
  return logo;
}
`;

export class IconScene {
  constructor(host, onCameraChange = () => {}) {
    this.host = host; this.dead = false; this.images = {}; this.materials = [];
    this.environmentVersion = 0;
    this.loadVersions = {}; this.settings = { ...defaults }; this.exporting = false;
    this.scene = new THREE.Scene();
    this.baseFov = 32;
    this.camera = new THREE.PerspectiveCamera(32, 1, .01, 100);
    this.camera.position.setFromSpherical(new THREE.Spherical(defaultCamera.distance, THREE.MathUtils.degToRad(90 - defaultCamera.elevation), THREE.MathUtils.degToRad(defaultCamera.azimuth)));
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = defaults.exposure;
    host.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.enablePan = false;
    this.controls.minDistance = 3.4; this.controls.maxDistance = 11;
    this.controls.target.set(0, 0, 0);
    this.defaultCameraPosition = this.camera.position.clone();
    try {
      const saved = JSON.parse(localStorage.getItem(cameraStorageKey));
      if(Array.isArray(saved) && saved.length === 3 && saved.every(Number.isFinite)) {
        const position = new THREE.Vector3(...saved), distance = position.length();
        if(distance >= this.controls.minDistance && distance <= this.controls.maxDistance) this.defaultCameraPosition.copy(position);
      }
    } catch { /* Unavailable storage or invalid data: keep the built-in view. */ }
    this.camera.position.copy(this.defaultCameraPosition);
    this.controls.addEventListener('change', () => onCameraChange(this.getCameraPose()));
    this.controls.update();
    onCameraChange(this.getCameraPose());
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x6d7384, .35));
    this.fallback = new THREE.DirectionalLight(0xffffff, 3);
    this.fallback.position.set(-3, 5, 5); this.scene.add(this.fallback);
    this.empty = new THREE.DataTexture(new Uint8Array([255,255,255,0]),1,1);
    this.empty.needsUpdate = true;
    this.flakes = this.createFlakes();
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host);
    this.resize();
    this.tick = () => { if (this.dead) return; this.frame = requestAnimationFrame(this.tick); if(!this.exporting) { if (!this.batchProcessing) this.controls.update(); this.renderer.render(this.scene,this.camera); } };
    this.tick();
  }
  createFlakes() {
    const n = 256, data = new Uint8Array(n*n*4); let seed = 814;
    const random = () => { seed = (seed*1664525+1013904223)>>>0; return seed/4294967296; };
    for(let i=0;i<n*n;i++) { data[i*4] = 85+random()*85; data[i*4+1] = 85+random()*85; data[i*4+2] = 235; data[i*4+3] = 255; }
    const t = new THREE.DataTexture(data,n,n); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t;
  }
  async load() {
    const results = await Promise.allSettled([
      new GLTFLoader().loadAsync(modelURL),
      new HDRLoader().loadAsync(hdrURL),
      new THREE.TextureLoader().loadAsync(normalURL),
    ]);
    if(this.dead) { for(const r of results) if(r.status==='fulfilled') { if(r.value.scene) r.value.scene.traverse(o=>{o.geometry?.dispose();if(o.material) (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}); else r.value.dispose(); } return; }
    if(results[0].status==='rejected') throw results[0].reason;
    if(results[1].status==='fulfilled') { this.hdr = results[1].value; this.hdr.mapping = THREE.EquirectangularReflectionMapping; this.scene.environment = this.hdr; this.fallback.intensity = .3; }
    else throw new Error('HDRI не загрузилась. Проверьте файл studio_small_01_1k.hdr.');
    if(results[2].status==='fulfilled') { this.normal = results[2].value; this.normal.flipY = false; this.normal.wrapS = this.normal.wrapT = THREE.RepeatWrapping; this.normal.anisotropy = Math.min(8,this.renderer.capabilities.getMaxAnisotropy()); }
    else throw new Error('Не удалось загрузить Normal.webp.');
    this.root = results[0].value.scene;
    this.root.traverse(obj => {
      if(!obj.isMesh) return;
      const geometry = obj.geometry;
      if(!geometry.getAttribute('uv') || !geometry.getAttribute('uv1')) throw new Error('В модели необходимы UV0 и UV1.');
      geometry.setAttribute('studioUV', geometry.getAttribute('uv'));
      geometry.setAttribute('studioLogoUV', geometry.getAttribute('uv1'));
      // Older two-channel models can still use the front-only projection.
      geometry.setAttribute('studioFrontUV', geometry.getAttribute('uv2') || geometry.getAttribute('uv1'));
      const old = Array.isArray(obj.material)?obj.material:[obj.material]; old.forEach(m=>m.dispose());
      // One continuous paint material; the shader masks the logo to the front.
      const material = this.makeMaterial();
      obj.material = material; this.materials.push(material);
      geometry.clearGroups();
      obj.geometry = autoSmoothIcon(geometry);
      geometry.dispose();
    });
    this.pivot = new THREE.Group(); this.pivot.rotation.x = Math.PI/2;
    this.pivot.add(this.root); this.scene.add(this.pivot);
    this.update(this.settings);
    await this.renderer.compileAsync(this.scene, this.camera);
  }
  makeMaterial() {
    const m = new THREE.MeshPhysicalMaterial({ color:'#a8c5fa', metalness:.7, roughness:.23, clearcoat:1, clearcoatRoughness:.09, normalMap:this.normal, normalScale:new THREE.Vector2(.15,.15), side:THREE.FrontSide, ior:1.5 });
    m.userData.uniforms = {
      studioPattern:{value:this.empty}, studioLogo:{value:this.empty}, studioFlakes:{value:this.flakes},
      studioHasPattern:{value:0}, studioHasLogo:{value:0},
      studioPatternStrength:{value:defaults.patternStrength}, studioPatternScale:{value:1}, studioPatternRotation:{value:0}, studioPatternOffset:{value:new THREE.Vector2()}, studioPatternRoughness:{value:0}, studioPatternUV:{value:0},
      studioLogoScale:{value:.65}, studioLogoOffset:{value:new THREE.Vector2()}, studioLogoUV:{value:1}, studioFlakeStrength:{value:.16},
    };
    m.onBeforeCompile = shader => {
      Object.assign(shader.uniforms,m.userData.uniforms);
      shader.vertexShader = `attribute vec2 studioUV; attribute vec2 studioLogoUV; attribute vec2 studioFrontUV; varying vec2 vStudioUV; varying vec2 vStudioLogoUV; varying vec2 vStudioFrontUV; varying vec3 vStudioPosition; varying vec3 vStudioNormal;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvStudioUV=studioUV; vStudioLogoUV=studioLogoUV; vStudioFrontUV=studioFrontUV; vStudioPosition=position; vStudioNormal=normal;');
      shader.fragmentShader = shaderPars + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        vec4 paintPattern = patternSample();
        float patternAmount = studioHasPattern * studioPatternStrength * paintPattern.a * (1.0 - studioPatternRoughness);
        diffuseColor.rgb *= mix(vec3(1.0), paintPattern.rgb, patternAmount);
        vec4 decal = logoSample();
        diffuseColor.rgb = mix(diffuseColor.rgb, decal.rgb, decal.a);
      `);
      shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        float patternLuma = dot(paintPattern.rgb, vec3(0.2126,0.7152,0.0722));
        roughnessFactor = clamp(roughnessFactor + (patternLuma-0.5) * studioPatternStrength * studioHasPattern * studioPatternRoughness * paintPattern.a, 0.04, 1.0);
        roughnessFactor = mix(roughnessFactor, max(roughnessFactor,0.3),decal.a);
      `);
      shader.fragmentShader = shader.fragmentShader.replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor *= 1.0 - decal.a;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec3 flakeNormal = texture2D(studioFlakes,vStudioUV*12.0).xyz*2.0-1.0;
        normal = normalize(normal + vec3(flakeNormal.xy * studioFlakeStrength * 0.2, 0.0));
      `);
    };
    m.customProgramCacheKey = () => 'glint-icons-paint-v2';
    return m;
  }
  update(s) {
    this.settings = s;
    this.renderer.toneMappingExposure = s.exposure ?? defaults.exposure;
    this.scene.environmentIntensity = s.light ?? 1.5;
    this.scene.environmentRotation.y = THREE.MathUtils.degToRad(s.lightRotation ?? defaults.lightRotation);
    for(const m of this.materials) {
      const u = m.userData.uniforms;
      m.color.set(s.color || defaults.color);
      m.metalness = s.metalness ?? .7; m.roughness = s.roughness ?? .23;
      m.clearcoat = s.clearcoat ?? 1; m.clearcoatRoughness = s.coatRoughness ?? .09;
      // Keep shader features enabled to avoid recompilation while dragging.
      m.iridescence = Math.max(.00001, s.iridescence ?? 0);
      m.iridescenceIOR = 1.3; m.iridescenceThicknessRange = [100,400];
      m.normalScale.setScalar(s.normalStrength ?? .15);
      u.studioPattern.value = this.images.pattern || this.empty;
      u.studioLogo.value = this.images.logo || this.empty;
      u.studioHasPattern.value = this.images.pattern ? 1 : 0;
      u.studioHasLogo.value = this.images.logo ? 1 : 0;
      u.studioPatternStrength.value = s.patternStrength ?? defaults.patternStrength;
      u.studioPatternScale.value = s.patternScale ?? 1;
      u.studioPatternRotation.value = THREE.MathUtils.degToRad(s.patternRotation ?? 0);
      u.studioPatternOffset.value.set(s.patternX || 0, -(s.patternY || 0));
      u.studioPatternRoughness.value = s.patternMode==='roughness' ? 1 : 0;
      u.studioPatternUV.value = normalizeUVChannel(s.patternUV);
      u.studioLogoScale.value = s.logoScale ?? .65;
      u.studioLogoOffset.value.set(s.logoX || 0, -(s.logoY || 0));
      u.studioLogoUV.value = normalizeUVChannel(s.logoUV, defaults.logoUV);
      u.studioFlakeStrength.value = s.flakes ?? .16;
    }
  }
  async setImage(slot, url) {
    const version = (this.loadVersions[slot] || 0) + 1; this.loadVersions[slot] = version;
    let t = await new THREE.TextureLoader().loadAsync(url);
    if(this.dead || this.loadVersions[slot]!==version) { t.dispose(); return; }
    if(t.image.width > 8192 || t.image.height > 8192) { t.dispose(); throw new Error('Максимальный размер текстуры — 8192 × 8192.'); }
    if(slot==='logo' && t.image.width!==t.image.height) {
      const canvas = document.createElement('canvas'), side = Math.max(t.image.width,t.image.height);
      canvas.width = canvas.height = side;
      canvas.getContext('2d').drawImage(t.image,(side-t.image.width)/2,(side-t.image.height)/2);
      t.dispose(); t = new THREE.CanvasTexture(canvas);
    }
    t.colorSpace = THREE.SRGBColorSpace; t.flipY = false;
    t.wrapS = t.wrapT = slot==='logo' ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    t.anisotropy = Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
    this.images[slot]?.dispose(); this.images[slot] = t; this.update(this.settings);
  }
  clearImage(slot) { this.loadVersions[slot] = (this.loadVersions[slot] || 0)+1; this.images[slot]?.dispose(); delete this.images[slot]; this.update(this.settings); }
  async setEnvironment({ id, url, type }) {
    const version = ++this.environmentVersion;
    let texture = this.hdr;
    if(id !== 'studio') {
      const loader = type === 'exr'
        ? new (await import('three/addons/loaders/EXRLoader.js')).EXRLoader()
        : new HDRLoader();
      texture = await loader.loadAsync(url);
      if(this.dead || version !== this.environmentVersion) { texture.dispose(); return false; }
      if(texture.image.width > this.renderer.capabilities.maxTextureSize || texture.image.height > this.renderer.capabilities.maxTextureSize) {
        texture.dispose(); throw new Error('Размер HDRI превышает возможности видеокарты. Используйте версию 1K–4K.');
      }
      texture.mapping = THREE.EquirectangularReflectionMapping;
    }
    if(this.dead || !texture || version !== this.environmentVersion) return false;
    const previous = this.customHDR;
    this.scene.environment = texture;
    this.customHDR = id === 'studio' ? null : texture;
    previous?.dispose();
    return true;
  }
  getCameraPose() {
    return {
      azimuth: THREE.MathUtils.radToDeg(this.controls.getAzimuthalAngle()),
      elevation: 90 - THREE.MathUtils.radToDeg(this.controls.getPolarAngle()),
      distance: this.camera.position.distanceTo(this.controls.target),
      projection: this.camera.isOrthographicCamera ? 'orthographic' : 'perspective',
      zoom: this.camera.zoom,
      orientation: this.camera.quaternion.toArray(),
    };
  }
  saveDefaultView() {
    const position = this.camera.position.clone().sub(this.controls.target);
    localStorage.setItem(cameraStorageKey, JSON.stringify(position.toArray()));
    this.defaultCameraPosition.copy(position);
  }
  resetView() {
    // Flush any remaining damping before applying an exact preset.
    const damping = this.controls.enableDamping;
    this.controls.enableDamping = false; this.controls.update();
    this.camera.position.copy(this.defaultCameraPosition);
    this.camera.zoom = 1;
    this.controls.target.set(0,0,0); this.controls.update();
    this.controls.enableDamping = damping;
    this.resize();
  }
  setProjection(projection) {
    const orthographic = projection === 'orthographic';
    if (orthographic === !!this.camera.isOrthographicCamera) return;
    const previous = this.camera;
    const position = previous.position.clone(), quaternion = previous.quaternion.clone();
    const damping = this.controls.enableDamping;
    this.controls.enableDamping = false; this.controls.update();
    const next = orthographic
      ? new THREE.OrthographicCamera(-1, 1, 1, -1, previous.near, previous.far)
      : new THREE.PerspectiveCamera(this.baseFov, 1, previous.near, previous.far);
    next.position.copy(position); next.quaternion.copy(quaternion); next.up.copy(previous.up);
    next.zoom = previous.zoom;
    this.camera = next; this.controls.object = next;
    this.controls.minZoom = .25; this.controls.maxZoom = 4;
    this.controls.update(); this.controls.enableDamping = damping;
    this.resize();
  }
  setFov(value) {
    this.baseFov = THREE.MathUtils.clamp(value, 15, 75);
    this.resize();
  }
  applyCameraPreset(preset) {
    this.setProjection(preset.projection || 'perspective');
    const damping = this.controls.enableDamping;
    this.controls.enableDamping = false; this.controls.update();
    this.controls.target.set(0, 0, 0);
    this.camera.position.setFromSpherical(new THREE.Spherical(preset.distance,
      THREE.MathUtils.degToRad(90 - preset.elevation), THREE.MathUtils.degToRad(preset.azimuth)));
    this.camera.zoom = preset.zoom ?? 1;
    this.controls.update(); this.controls.enableDamping = damping;
    this.setFov(preset.fov);
  }
  resize() {
    if(this.exporting || this.dead) return;
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if(!w || !h) return;
    this.renderer.setSize(w,h);
    // The canvas itself is square and clipped by the export frame.
    if (this.camera.isPerspectiveCamera) {
      this.camera.aspect = w/h; this.camera.fov = this.baseFov;
    } else {
      const halfHeight = this.camera.position.distanceTo(this.controls.target) * Math.tan(THREE.MathUtils.degToRad(this.baseFov)/2);
      this.camera.top = halfHeight; this.camera.bottom = -halfHeight;
      this.camera.left = -halfHeight*w/h; this.camera.right = halfHeight*w/h;
    }
    this.camera.updateProjectionMatrix();
  }
  async renderPNGBlob(size, transparent) {
    if(size > this.renderer.capabilities.maxTextureSize || size > this.renderer.getContext().getParameter(this.renderer.getContext().MAX_RENDERBUFFER_SIZE)) throw new Error('Этот GPU не поддерживает выбранный размер.');
    const watermarkEnabled = this.watermarkEnabled !== false;
    if (watermarkEnabled) await loadWatermarkFont();
    this.exporting = true;
    const ratio = this.renderer.getPixelRatio(), aspect = this.camera.aspect, fov = this.camera.fov;
    try {
      this.renderer.setPixelRatio(1); this.renderer.setSize(size,size,false);
      if (this.camera.isPerspectiveCamera) { this.camera.aspect=1; this.camera.fov=this.baseFov; }
      this.camera.updateProjectionMatrix();
      this.renderer.setClearColor(transparent?0x000000:0xe9eaed,transparent?0:1);
      this.renderer.render(this.scene,this.camera);
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Не удалось создать изображение для экспорта.');
      ctx.drawImage(this.renderer.domElement, 0, 0);
      if (watermarkEnabled) drawWatermark(ctx, size, size);
      return await new Promise((resolve,reject) => canvas.toBlob(b => b?resolve(b):reject(new Error('Не удалось создать PNG.')), 'image/png'));
    } finally {
      this.renderer.setClearColor(0x000000,0); this.renderer.setPixelRatio(ratio);
      this.camera.aspect=aspect; this.camera.fov=fov; this.camera.updateProjectionMatrix(); this.exporting=false; this.resize();
    }
  }
  async exportPNG(size, transparent) {
    const blob = await this.renderPNGBlob(size, transparent);
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href=url; a.download=`glint-icons-${size}.png`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),5000);
  }
  async renderBatch(files, size, transparent, onImage) {
    const originalLogo = this.images.logo, enabled = this.controls.enabled;
    this.batchProcessing = true; this.controls.enabled = false;
    // Detach without disposing: setImage may dispose only temporary batch logos.
    delete this.images.logo;
    try {
      for (let index = 0; index < files.length; index++) {
        if (this.dead) throw new Error('Сцена закрыта.');
        try {
          await this.setImage('logo', files[index].url);
          const blob = await this.renderPNGBlob(size, transparent);
          await onImage(blob, index);
        } catch (error) { throw new Error(`${files[index].name}: ${error.message || 'изображение повреждено или не поддерживается.'}`); }
      }
    } finally {
      this.images.logo?.dispose(); delete this.images.logo;
      ++this.loadVersions.logo;
      this.batchProcessing = false;
      if (this.dead) originalLogo?.dispose();
      else {
        if (originalLogo) this.images.logo = originalLogo;
        this.controls.enabled = enabled; this.update(this.settings);
        this.renderer.render(this.scene, this.camera);
      }
    }
  }
  dispose() {
    this.dead = true; ++this.environmentVersion; cancelAnimationFrame(this.frame); this.observer.disconnect(); this.controls.dispose();
    this.scene.traverse(o => { if(o.isMesh) {o.geometry.dispose(); (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());} });
    Object.values(this.images).forEach(t=>t.dispose()); this.normal?.dispose(); this.customHDR?.dispose(); this.hdr?.dispose(); this.flakes.dispose(); this.empty.dispose();
    this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
