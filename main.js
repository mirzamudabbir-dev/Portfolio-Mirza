document.addEventListener('DOMContentLoaded', () => {
  initStarsCanvas();
  initScrollAnimations();
  init3DPlanetsScroll();
});

// ----------------------------------------------------
// STARFIELD CANVAS (Flying through space)
// ----------------------------------------------------
function initStarsCanvas() {
  const canvas = document.getElementById('stars-canvas');
  const ctx = canvas.getContext('2d');

  let width, height;
  let stars = [];
  const numStars = 600;
  
  const baseSpeed = 0.5;
  let speed = baseSpeed;
  let targetSpeed = baseSpeed;
  
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }
  
  window.addEventListener('resize', resize);
  resize();

  class Star {
    constructor() { this.reset(); }
    reset() {
      this.x = (Math.random() - 0.5) * 2000;
      this.y = (Math.random() - 0.5) * 2000;
      this.z = Math.random() * 2000;
      this.pz = this.z;
    }
    update() {
      this.z -= speed;
      if (this.z < 1) {
        this.reset();
        this.z = 2000;
        this.pz = this.z;
      }
    }
    draw() {
      const sx = (this.x / this.z) * (width / 2) + width / 2;
      const sy = (this.y / this.z) * (height / 2) + height / 2;
      const px = (this.x / this.pz) * (width / 2) + width / 2;
      const py = (this.y / this.pz) * (height / 2) + height / 2;
      this.pz = this.z;

      if (sx < 0 || sx > width || sy < 0 || sy > height) return;

      const size = Math.max(0.1, (1 - this.z / 2000) * 3);
      const opacity = 1 - this.z / 2000;

      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.lineWidth = size;
      ctx.moveTo(px, py);
      ctx.lineTo(sx, sy);
      ctx.stroke();
    }
  }

  for (let i = 0; i < numStars; i++) {
    stars.push(new Star());
  }

  let lastScrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const deltaY = Math.abs(scrollY - lastScrollY);
    targetSpeed = baseSpeed + (deltaY * 0.5); 
    lastScrollY = scrollY;
  });

  function animate() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, width, height);

    speed += (targetSpeed - speed) * 0.1;
    targetSpeed += (baseSpeed - targetSpeed) * 0.05;

    stars.forEach(star => {
      star.update();
      star.draw();
    });
    requestAnimationFrame(animate);
  }
  animate();
}

// ----------------------------------------------------
// STANDARD FADE IN OBSERVER
// ----------------------------------------------------
function initScrollAnimations() {
  const elements = document.querySelectorAll('.fade-in');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

  elements.forEach(el => observer.observe(el));
}

// ----------------------------------------------------
// 3D PLANETS (EARTH & NEPTUNE) & SCROLLTRIGGER
// ----------------------------------------------------
function init3DPlanetsScroll() {
  if (typeof THREE === 'undefined' || typeof gsap === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  const canvas = document.getElementById('planet-canvas');
  
  // Scene setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  const textureLoader = new THREE.TextureLoader();
  const geometry = new THREE.SphereGeometry(1.5, 64, 64);

  // 1. Earth Mesh & Rayleigh Atmosphere
  const earthTexture = textureLoader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg');
  const earthMat = new THREE.MeshStandardMaterial({ map: earthTexture, roughness: 0.6, metalness: 0.1 });
  const earthMesh = new THREE.Mesh(geometry, earthMat);
  
  const earth = new THREE.Group();
  earth.add(earthMesh);
  
  const vertexShader = `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  
  // Outer halo (BackSide)
  const fragmentShaderHalo = `
    varying vec3 vNormal;
    void main() {
      float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 4.0);
      gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
    }
  `;
  const haloMat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: fragmentShaderHalo,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true
  });
  const earthHalo = new THREE.Mesh(geometry, haloMat);
  earthHalo.scale.set(1.15, 1.15, 1.15);
  earth.add(earthHalo);

  // Inner atmospheric scattering (FrontSide)
  const fragmentShaderAtmosphere = `
    varying vec3 vNormal;
    void main() {
      float intensity = pow(max(0.0, 0.7 - dot(vNormal, vec3(0, 0, 1.0))), 3.0);
      gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
    }
  `;
  const innerAtmosMat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: fragmentShaderAtmosphere,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    transparent: true
  });
  const earthInnerAtmos = new THREE.Mesh(geometry, innerAtmosMat);
  earthInnerAtmos.scale.set(1.02, 1.02, 1.02);
  earth.add(earthInnerAtmos);

  scene.add(earth);

  // 2. Jupiter Mesh (Work Experience)
  const jupiterGroup = new THREE.Group();
  const jupiterTexture = textureLoader.load('assets/jupiter.jpg');
  // Roughness 1 ensures it looks like clouds, not a plastic ball
  const jupiterMat = new THREE.MeshStandardMaterial({ map: jupiterTexture, roughness: 1, metalness: 0 });
  const jupiter = new THREE.Mesh(geometry, jupiterMat);
  jupiterGroup.add(jupiter);
  
  // Jupiter Volumetric Atmosphere (Orange/Brown glow)
  const jupColor = 0xffa060;
  const jupAtmos1 = new THREE.Mesh(new THREE.SphereGeometry(1.52, 64, 64), new THREE.MeshBasicMaterial({ color: jupColor, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending }));
  const jupAtmos2 = new THREE.Mesh(new THREE.SphereGeometry(1.55, 64, 64), new THREE.MeshBasicMaterial({ color: jupColor, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending }));
  const jupAtmos3 = new THREE.Mesh(new THREE.SphereGeometry(1.6, 64, 64), new THREE.MeshBasicMaterial({ color: jupColor, transparent: true, opacity: 0.03, blending: THREE.AdditiveBlending }));
  jupiterGroup.add(jupAtmos1, jupAtmos2, jupAtmos3);

  jupiterGroup.scale.set(0.8, 0.8, 0.8);
  scene.add(jupiterGroup);

  // 3. Neptune Mesh and Atmosphere Group
  const neptuneGroup = new THREE.Group();

  const neptuneTexture = textureLoader.load('assets/neptune.jpg');
  const neptuneMat = new THREE.MeshStandardMaterial({ map: neptuneTexture, roughness: 1, metalness: 0 });
  const neptune = new THREE.Mesh(geometry, neptuneMat);
  neptuneGroup.add(neptune);

  // Neptune Volumetric Atmosphere (Deep Blue/Cyan glow)
  const nepColor = 0x0088ff;
  const nepAtmos1 = new THREE.Mesh(new THREE.SphereGeometry(1.52, 64, 64), new THREE.MeshBasicMaterial({ color: nepColor, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending }));
  const nepAtmos2 = new THREE.Mesh(new THREE.SphereGeometry(1.55, 64, 64), new THREE.MeshBasicMaterial({ color: nepColor, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending }));
  const nepAtmos3 = new THREE.Mesh(new THREE.SphereGeometry(1.6, 64, 64), new THREE.MeshBasicMaterial({ color: nepColor, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending }));
  neptuneGroup.add(nepAtmos1, nepAtmos2, nepAtmos3);

  neptuneGroup.scale.set(0.8, 0.8, 0.8);
  scene.add(neptuneGroup);

  // 4. Mercury Mesh and Atmosphere Group (Student Section)
  const mercuryGroup = new THREE.Group();
  const mercuryTexture = textureLoader.load(typeof mercuryBase64 !== 'undefined' ? mercuryBase64 : 'assets/mercury.jpg');
  const mercuryMat = new THREE.MeshStandardMaterial({ map: mercuryTexture, roughness: 0.9, metalness: 0.1 });
  const mercury = new THREE.Mesh(geometry, mercuryMat);
  mercuryGroup.add(mercury);

  // Mercury Atmosphere (Subtle Gray/White glow)
  const mercColor = 0xffffff;
  const mercAtmos1 = new THREE.Mesh(new THREE.SphereGeometry(1.52, 64, 64), new THREE.MeshBasicMaterial({ color: mercColor, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending }));
  const mercAtmos2 = new THREE.Mesh(new THREE.SphereGeometry(1.55, 64, 64), new THREE.MeshBasicMaterial({ color: mercColor, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending }));
  mercuryGroup.add(mercAtmos1, mercAtmos2);

  mercuryGroup.scale.set(0.8, 0.8, 0.8);
  scene.add(mercuryGroup);

  // 5. Venus Mesh and Atmosphere Group (Skills Section)
  const venusGroup = new THREE.Group();
  const venusTexture = textureLoader.load(typeof venusBase64 !== 'undefined' ? venusBase64 : 'assets/venus.jpg');
  const venusMat = new THREE.MeshStandardMaterial({ map: venusTexture, roughness: 0.8, metalness: 0.2 });
  const venus = new THREE.Mesh(geometry, venusMat);
  venusGroup.add(venus);

  // Venus Atmosphere (Vibrant Yellow/Orange glow)
  const venusColor = 0xffcc44;
  const venusAtmos1 = new THREE.Mesh(new THREE.SphereGeometry(1.52, 64, 64), new THREE.MeshBasicMaterial({ color: venusColor, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending }));
  const venusAtmos2 = new THREE.Mesh(new THREE.SphereGeometry(1.55, 64, 64), new THREE.MeshBasicMaterial({ color: venusColor, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending }));
  const venusAtmos3 = new THREE.Mesh(new THREE.SphereGeometry(1.6, 64, 64), new THREE.MeshBasicMaterial({ color: venusColor, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending }));
  venusGroup.add(venusAtmos1, venusAtmos2, venusAtmos3);

  venusGroup.scale.set(0.8, 0.8, 0.8);
  scene.add(venusGroup);

  // 6. Mars Mesh and Atmosphere Group (Tech Skills Section)
  const marsGroup = new THREE.Group();
  const marsTexture = textureLoader.load(typeof marsBase64 !== 'undefined' ? marsBase64 : 'assets/mars.jpg');
  const marsMat = new THREE.MeshStandardMaterial({ map: marsTexture, roughness: 1.0, metalness: 0.1 });
  const mars = new THREE.Mesh(geometry, marsMat);
  marsGroup.add(mars);

  marsGroup.scale.set(0.8, 0.8, 0.8);
  scene.add(marsGroup);

  // 7. Uranus Mesh (Contact Section)
  const uranusGroup = new THREE.Group();
  const uranusTexture = textureLoader.load(typeof uranusBase64 !== 'undefined' ? uranusBase64 : 'assets/uranus.jpg');
  const uranusMat = new THREE.MeshStandardMaterial({ map: uranusTexture, roughness: 0.6, metalness: 0.1 });
  const uranus = new THREE.Mesh(geometry, uranusMat);
  uranusGroup.add(uranus);
  
  // Uranus Atmosphere (Subtle pale blue/cyan glow)
  const uranusColor = 0xaaddff;
  const uranusAtmos1 = new THREE.Mesh(new THREE.SphereGeometry(1.52, 64, 64), new THREE.MeshBasicMaterial({ color: uranusColor, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending }));
  const uranusAtmos2 = new THREE.Mesh(new THREE.SphereGeometry(1.55, 64, 64), new THREE.MeshBasicMaterial({ color: uranusColor, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending }));
  uranusGroup.add(uranusAtmos1, uranusAtmos2);

  uranusGroup.scale.set(0.8, 0.8, 0.8);
  scene.add(uranusGroup);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Brighter ambient
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(5, 3, 5); // Light from top right
  scene.add(dirLight);
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
  fillLight.position.set(-5, 0, 5); // Fill light from left to remove dark shadows
  scene.add(fillLight);

  // Handle Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Base continuous rotation
  function animatePlanets() {
    requestAnimationFrame(animatePlanets);
    earth.rotation.y += 0.002;
    jupiterGroup.rotation.y += 0.002;
    neptuneGroup.rotation.y += 0.002;
    mercuryGroup.rotation.y += 0.002;
    venusGroup.rotation.y += 0.002;
    marsGroup.rotation.y += 0.002;
    uranusGroup.rotation.y += 0.002;
    renderer.render(scene, camera);
  }
  animatePlanets();

  // ----------------------------------------------------
  // HERO TIMELINE (EARTH)
  // ----------------------------------------------------
  gsap.set(earth.position, { x: 0, y: 0 }); // Starts center
  gsap.set('.hero-wrapper', { scale: 0, opacity: 0 }); // Text starts hidden

  const heroTl = gsap.timeline({
    scrollTrigger: {
      trigger: "#hero",
      start: "top top",
      end: "bottom bottom",
      scrub: 1,
    }
  });

  // Earth moves straight up
  heroTl.to(earth.position, { y: 5, ease: "power1.inOut", duration: 1 }, 0)
        .to('.hero-wrapper', { scale: 1, opacity: 1, duration: 0.8, ease: "power2.out" }, "-=0.8");

  // ----------------------------------------------------
  // STUDENT TIMELINE (MERCURY)
  // ----------------------------------------------------
  gsap.set(mercuryGroup.position, { x: -5, y: -5 }); 
  gsap.set('.student-title', { opacity: 0, y: -50 });
  gsap.set('.student-desc', { opacity: 0, scale: 0 });

  const studentTl = gsap.timeline({
    scrollTrigger: {
      trigger: "#student",
      start: "top top",
      end: "bottom bottom",
      scrub: 1,
    }
  });

  studentTl.to(mercuryGroup.position, { x: 0, y: 0, ease: "power1.inOut", duration: 1 })
           .to('.student-title', { opacity: 1, y: 0, duration: 1 })
           .to('.student-desc', { opacity: 1, scale: 1, duration: 1 })
           .to(['.student-title', '.student-desc'], { opacity: 0, y: -50, duration: 1 })
           .to(mercuryGroup.position, { x: 5, y: 5, ease: "power2.inOut", duration: 1 })
           .to(mercuryGroup.scale, { x: 0, y: 0, z: 0, ease: "power2.inOut", duration: 1 }, "<")
           .to({}, { duration: 1 });

  // ----------------------------------------------------
  // SKILLS TIMELINE (VENUS)
  // ----------------------------------------------------
  gsap.set(venusGroup.position, { x: -5, y: -5 }); 
  gsap.set('.skills-title', { opacity: 0, y: -50 });
  gsap.set('.skills-item', { opacity: 0, scale: 0, height: 0, marginBottom: 0, overflow: 'hidden' });

  const skillsTl = gsap.timeline({
    scrollTrigger: {
      trigger: "#skills",
      start: "top top",
      end: "bottom bottom",
      scrub: 1,
    }
  });

  skillsTl.to(venusGroup.position, { x: 0, y: 0, ease: "power1.inOut", duration: 1 })
          .to('.skills-title', { opacity: 1, y: 0, duration: 1 });
          
  const skillItems = gsap.utils.toArray('.skills-item');
  skillItems.forEach((item) => {
    skillsTl.to(item, { opacity: 1, scale: 1, height: 'auto', marginBottom: 24, ease: "power2.out", duration: 1 });
  });

  skillsTl.to('.skills-title', { opacity: 0, y: -50, duration: 1 })
          .to(skillItems, { opacity: 0, scale: 0, height: 0, marginBottom: 0, duration: 1 }, "<")
          .to(venusGroup.position, { x: 5, y: 5, ease: "power2.inOut", duration: 1 })
          .to(venusGroup.scale, { x: 0, y: 0, z: 0, ease: "power2.inOut", duration: 1 }, "<")
          .to({}, { duration: 1 });

  // ----------------------------------------------------
  // TECH SKILLS TIMELINE (MARS)
  // ----------------------------------------------------
  gsap.set(marsGroup.position, { x: -5, y: -5 }); 
  gsap.set('.tech-title', { opacity: 0, y: -50 });
  gsap.set('.tech-item', { opacity: 0, scale: 0, height: 0, marginBottom: 0, overflow: 'hidden' });

  const techSkillsTl = gsap.timeline({
    scrollTrigger: {
      trigger: "#tech-skills",
      start: "top top",
      end: "bottom bottom",
      scrub: 1,
    }
  });

  techSkillsTl.to(marsGroup.position, { x: 0, y: 0, ease: "power1.inOut", duration: 1 })
              .to('.tech-title', { opacity: 1, y: 0, duration: 1 });
          
  const techItems = gsap.utils.toArray('.tech-item');
  techItems.forEach((item) => {
    techSkillsTl.to(item, { opacity: 1, scale: 1, height: 'auto', marginBottom: 24, ease: "power2.out", duration: 1 });
  });

  techSkillsTl.to('.tech-title', { opacity: 0, y: -50, duration: 1 })
              .to(techItems, { opacity: 0, scale: 0, height: 0, marginBottom: 0, duration: 1 }, "<")
              .to(marsGroup.position, { x: 5, y: 5, ease: "power2.inOut", duration: 1 })
              .to(marsGroup.scale, { x: 0, y: 0, z: 0, ease: "power2.inOut", duration: 1 }, "<")
              .to({}, { duration: 1 });

  // ----------------------------------------------------
  // EXPERIENCE TIMELINE (JUPITER)
  // ----------------------------------------------------
  gsap.set(jupiterGroup.position, { x: -5, y: -5 }); 
  gsap.set('.experience-title', { opacity: 0, y: -50 });
  gsap.set('.experience-item', { opacity: 0, scale: 0, height: 0, marginBottom: 0, overflow: 'hidden' });

  const expTl = gsap.timeline({
    scrollTrigger: {
      trigger: "#experience",
      start: "top top",
      end: "bottom bottom",
      scrub: 1,
    }
  });

  expTl.to(jupiterGroup.position, { x: 0, y: 0, ease: "power1.inOut", duration: 1 })
       .to('.experience-title', { opacity: 1, y: 0, duration: 1 });

  const expItems = gsap.utils.toArray('.experience-item');
  expItems.forEach((item) => {
    expTl.to(item, { opacity: 1, scale: 1, height: 'auto', marginBottom: 24, ease: "power2.out", duration: 1 });
  });

  expTl.to('.experience-title', { opacity: 0, y: -50, duration: 1 })
       .to(expItems, { opacity: 0, scale: 0, height: 0, marginBottom: 0, duration: 1 }, "<")
       .to(jupiterGroup.position, { x: 5, y: 5, ease: "power2.inOut", duration: 1 })
       .to(jupiterGroup.scale, { x: 0, y: 0, z: 0, ease: "power2.inOut", duration: 1 }, "<")
       .to({}, { duration: 1 });

  // ----------------------------------------------------
  // WORK TIMELINE (NEPTUNE)
  // ----------------------------------------------------
  gsap.set(neptuneGroup.position, { x: -5, y: -5 }); 
  gsap.set('.work-title', { opacity: 0, y: -50 });
  gsap.set('.project-item', { opacity: 0, scale: 0, height: 0, marginBottom: 0, overflow: 'hidden' });

  const workTl = gsap.timeline({
    scrollTrigger: {
      trigger: "#work",
      start: "top top",
      end: "bottom bottom",
      scrub: 1,
    }
  });

  workTl.to(neptuneGroup.position, { x: 0, y: 0, ease: "power1.inOut", duration: 1 })
        .to('.work-title', { opacity: 1, y: 0, duration: 1 });

  const workItems = gsap.utils.toArray('.project-item');
  workItems.forEach((item) => {
    workTl.to(item, { opacity: 1, scale: 1, height: 'auto', marginBottom: 24, ease: "power2.out", duration: 1 });
  });

  workTl.to('.work-title', { opacity: 0, y: -50, duration: 1 })
        .to(workItems, { opacity: 0, scale: 0, height: 0, marginBottom: 0, duration: 1 }, "<")
        .to(neptuneGroup.position, { x: 5, y: 5, ease: "power2.inOut", duration: 1 })
        .to(neptuneGroup.scale, { x: 0, y: 0, z: 0, ease: "power2.inOut", duration: 1 }, "<")
        .to({}, { duration: 1 });

  // ----------------------------------------------------
  // CONTACT TIMELINE (URANUS)
  // ----------------------------------------------------
  gsap.set(uranusGroup.position, { x: -5, y: -5 }); 
  gsap.set('.contact-title', { opacity: 0, y: -50 });
  gsap.set('.contact-link', { opacity: 0, y: 50 });

  const contactTl = gsap.timeline({
    scrollTrigger: {
      trigger: "#contact",
      start: "top top",
      end: "bottom bottom",
      scrub: 1,
    }
  });

  contactTl.to(uranusGroup.position, { x: 0, y: 0, ease: "power1.inOut", duration: 1 })
           .to('.contact-title', { opacity: 1, y: 0, duration: 1 });

  const contactLinks = gsap.utils.toArray('.contact-link');
  contactTl.to(contactLinks, { opacity: 1, y: 0, stagger: 0.25, duration: 1, ease: "power2.out" })
           .to({}, { duration: 1 });
}
