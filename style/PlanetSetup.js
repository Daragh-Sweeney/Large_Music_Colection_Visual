//  Author: Daragh Sweeney
//  Project: Large Music Data Visualization
//  script.js: this is the main javascript file

/* Now we set up the Particle System for Tracks */
const particles = [];
const lines = [];
const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
const lineMaterial = new THREE.LineBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.5 });


// need to import this function that is used in the main script and also in planet setup
import { selectPlanet } from './script.js';

// Set the colors for each of the genres
const genreColors = {
    'rock': 0xff4500,       // Orange Red
    'pop': 0x00ff00,        // Lime Green
    'classical': 0xffff00,  // Yellow
    'hiphop': 0x00ffff,     // Cyan
    'country': 0xff00ff,    // Magenta
    'latin': 0xffd700,      // Gold
    'edm_dance': 0x8a2be2,  // Blue Violet
    'jazz': 0x00ff7f        // Spring Green
};


/* Function to Create Text box above each planet */
function createTextTexture(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = '48px Arial';
    const textWidth = context.measureText(text).width;
    canvas.width = textWidth;
    canvas.height = 48; // Height based on font size
    context.font = '48px Arial';
    context.fillStyle = 'white';
    context.textBaseline = 'top';
    context.fillText(text, 0, 0);
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
}



async function createPlanets(tracks,scene,welcomeMessage) {

    async function fetchGenres(mp3paths) {
        const urlArray = Array.isArray(mp3paths) ? mp3paths : [mp3paths];
        const queryString = urlArray.map(url => `previewUrl=${encodeURIComponent(url)}`).join('&');
        const response = await fetch(`/getGenre?${queryString}`);
        if (!response.ok) {throw new Error(`HTTP error! status: ${response.status}`);}
        return await response.json();
    }

    const validTracks = tracks.filter(t => t.track.preview_url);
    const previewUrls = validTracks.map(t => t.track.preview_url);

    try {
        const genreInfos = await fetchGenres(previewUrls);

        for (const t of validTracks) {
            const info = genreInfos.find(i => i.url === t.track.preview_url);
            if (!info) continue;

            const { genre,x,z } = info;
            const noise3D = createNoise3D();
            const radius = 12;

            // Create planet geometry
            const geometry = new THREE.SphereGeometry(radius, 200, 200);

            // Determine colors
            const seaColor = new THREE.Color(0x0077be);
            const landColor = new THREE.Color(0x228B22);
            const mountainColor = new THREE.Color(0x8B4513);
            const genreColor = new THREE.Color(genreColors[genre]);

            // Displace vertices to create terrain
            const positionAttribute = geometry.getAttribute('position');
            const colors = [];
            const seaLevel = 0.02;

            for (let i = 0; i < positionAttribute.count; i++) {
                const vertex = new THREE.Vector3();
                vertex.fromBufferAttribute(positionAttribute, i);

                const noiseScale = 0.2;
                const noiseValue = noise3D(vertex.x * noiseScale,vertex.y * (noiseScale/2),vertex.z * noiseScale);
                const displacementScale = 0.15;
                const displacement = Math.pow(Math.abs(noiseValue), 1.5) * displacementScale;
                vertex.normalize().multiplyScalar(radius * (1 + displacement));

                let color;
                if (displacement < seaLevel) {color = seaColor.clone().lerp(genreColor, 0.5);}
                else if (displacement < seaLevel + 0.2) {color = landColor.clone().lerp(genreColor, 0.2);}
                else {const t = (displacement - (seaLevel + 0.2)) / 0.1; color = landColor.clone().lerp(mountainColor, t).lerp(genreColor, 0.2);}
                colors.push(color.r, color.g, color.b);
                positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
            }

            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geometry.computeVertexNormals();

            const material = new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: 0.8,
                metalness: 0.2,
                flatShading: false,
                emissive: new THREE.Color(0x222222),
                emissiveIntensity: 0.5,
                toneMapped: false
            });

            const particle = new THREE.Mesh(geometry, material);
            particle.position.set(x, 0, z);

            scene.add(particle);
            particles.push(particle);

            // Create text label
            const textTexture = createTextTexture(t.track.name);
            const textMaterial = new THREE.SpriteMaterial({ map: textTexture });
            const textSprite = new THREE.Sprite(textMaterial);
            textSprite.scale.set(10, 5, 1);
            textSprite.position.set(0, radius + 2, 0);
            particle.add(textSprite);

            particle.userData = {
                preview_url: t.track.preview_url,
                name: t.track.name,
                artist: t.track.artists[0].name,
                textSprite: textSprite,
                genre: genre
            };
        }


        welcomeMessage.style.display = 'none';

    } catch (error) {
        console.error("Error fetching genres:", error);
    }
}


// Function to Find Closest Particles
function findClosestParticles(particle, count) {
    return particles
        .filter(p => p !== particle)
        .sort((a, b) => particle.position.distanceTo(a.position) - particle.position.distanceTo(b.position))
        .slice(0, count);
}

// Create ShaderMaterial for flashing lines
const flashingLineMaterial = new THREE.ShaderMaterial({
    uniforms: {
        color1: { value: new THREE.Color(0xffffff) }, // White
        color2: { value: new THREE.Color(0xffff00) }, // Yellow
        time: { value: 0 }
    },
    vertexShader: `
        attribute float lineWidth;
        varying float vLineWidth;
        void main() {
            vLineWidth = lineWidth;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float time;
        varying float vLineWidth;
        void main() {
            float alpha = sin(time * 2.0) * 0.5 + 0.5; // Flash between 0 and 1
            vec3 color = mix(color1, color2, alpha);
            gl_FragColor = vec4(color, 1.0);
        }
    `,
    transparent: true,
    linewidth: 5 // Set line width
});

// Function to Draw Lines Between Particles
function drawLines(particle, closestParticles,scene) {
    lines.forEach(line => scene.remove(line));
    lines.length = 0;

    function createLine(p1, p2) {
        const points = [p1.position.clone(), p2.position.clone()];
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(lineGeometry, flashingLineMaterial);
        scene.add(line);
        lines.push(line);
    }

    closestParticles.forEach(closeParticle => {
        createLine(particle, closeParticle);
        const secondClosestParticles = findClosestParticles(closeParticle, 1);
        secondClosestParticles.forEach(secondCloseParticle => {createLine(closeParticle, secondCloseParticle);});
    });
}

// Animation loop for flashing effect
function animateLines() {
    flashingLineMaterial.uniforms.time.value += 0.01; // Adjust the speed of flashing
    requestAnimationFrame(animateLines);
}

function updateParticleSize(newParticle, oldParticle) {

    // Resize the new particle
    gsap.to(newParticle.scale, {duration: 1.5,x: 1.5,y: 1.5,z: 1.5,ease: "power2.out"});

    // If there's an old particle, resize it back to original size
    if (oldParticle && oldParticle !== newParticle) {
        gsap.to(oldParticle.scale, {duration: 1.5,x: 1,y: 1,z: 1,ease: "power2.out"});
    }
}


//
function updateDisplayBox(selectedParticle, connectedParticles, displayBox,playingParticle) {
    let html = `<h3> ${selectedParticle.userData.name}</h3>`;
    html += `<h3>${selectedParticle.userData.artist}</h3>`;
    html += `<h4>Predicted Genre: ${selectedParticle.userData.genre}</h4>`;
    html += '<h3>Connected Songs:</h3>';
    html += '<ul>';
    connectedParticles.forEach((particle, index) => {
            const genreColor = genreColors[particle.userData.genre];
            const colorHex = `#${genreColor.toString(16).padStart(6, '0')}`;  // Convert to hexadecimal color string
            html += `<li data-index="${index}" class="song-entry" style="background-color: ${colorHex};">${particle.userData.name} - ${particle.userData.genre}</li>`;
        });

        html += '</ul>';
        displayBox.innerHTML = html;

    // Add click event listeners to song entries
    document.querySelectorAll('.song-entry').forEach(entry => {
        entry.addEventListener('click', function() {
            const index = this.getAttribute('data-index');
            const particle = connectedParticles[index];
            selectPlanet(particle,playingParticle);
        });
    });
}

export {createPlanets,particles,lines,animateLines,findClosestParticles,drawLines,updateDisplayBox,updateParticleSize};