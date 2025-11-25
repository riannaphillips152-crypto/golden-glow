let joyInstance; 
let capture; // Variable for webcam

// --- Color Palettes ---
const palette1 = {
    bg: '#FFF8E1', 
    bouncerColors: ['#FFD70080', '#FFA50070', '#FFEB3B70', '#FFC10770'],
};

const palette2 = {
    bg: '#FFFDE7', 
    bouncerColors: ['#FFECB370', '#FF8F0070', '#FFE08270', '#FFD18070'],
};

// --- UI Logic ---
function toggleInfo() {
    const infoBox = document.getElementById('interaction-instructions');
    const icon = document.getElementById('toggle-icon');
    
    // Toggle the class
    infoBox.classList.toggle('collapsed');

    // Update icon text
    if (infoBox.classList.contains('collapsed')) {
        icon.innerText = "+";
    } else {
        icon.innerText = "−"; // minus sign
    }
}

// --- MAIN SETUP & DRAW ---

function setup() {
    createCanvas(windowWidth, windowHeight); 
    
    // --- FIX: Performance Optimization ---
    pixelDensity(1); 
    p5.disableFriendlyErrors = true; 
    
    // --- VIDEO CAPTURE SETUP ---
    capture = createCapture(VIDEO);
    capture.size(320, 240); // Request low-res for performance
    capture.hide(); // Hide the HTML element, we will draw it on canvas
    
    // Attach the event listener to the whole box via JS
    const infoBox = document.getElementById('interaction-instructions');
    if (infoBox) {
        infoBox.addEventListener('click', toggleInfo);
    }
    
    joyInstance = new Joy();
    joyInstance.setup();
}

function draw() {
    joyInstance.draw();
    
    // --- DRAW VIDEO CAPTURE ---
    if (capture && capture.loadedmetadata) {
        let vidWidth = 230; // Same visual width as the text box (200px + padding)
        let vidHeight = (capture.height / capture.width) * vidWidth; // Maintain aspect ratio
        
        let x = 20; // Left margin
        let y = height - vidHeight - 20; // Bottom margin
        
        push();
        // Draw the video
        image(capture, x, y, vidWidth, vidHeight);
        
        // can add a border to match the text box style
        noFill();
        stroke(255, 255, 255, 100);
        strokeWeight(1);
        rect(x, y, vidWidth, vidHeight);
        pop();
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    joyInstance.onResize();
    background(joyInstance.backgroundColor); 
}

function mousePressed(event) {
    // Prevent canvas burst if clicking inside the interaction box
    if (event && event.target.closest('#interaction-instructions')) return;
    
    joyInstance.mousePressed(); 
}

class Joy {
    constructor() {
        this.bouncers = [];
        this.backgroundColor = color(palette1.bg); 
        this.currentPalette = palette1; 

        this.bouncersSpawnRate = 1; 
        this.currentSpeedMultiplier = 1; 
        this.currentBounciness = 1; 
        this.clickBurstCounter = 0; 
    }

    setup() {
        background(this.backgroundColor);
        for (let i = 0; i < 40; i++) { 
            this.bouncers.push(new Bouncer(random(width), random(height), this.currentPalette.bouncerColors));
        }
    }

    draw() {
        // Fade effect for trails
        noStroke(); 
        fill(red(this.backgroundColor), green(this.backgroundColor), blue(this.backgroundColor), 25); 
        rect(0, 0, width, height);

        this.currentSpeedMultiplier = map(mouseY, height, 0, 0.5, 3.0, true); 
        this.bouncersSpawnRate = floor(map(mouseY, height, 0, 0, 2, true)); 
        this.currentBounciness = map(mouseX, 0, width, 0.5, 2.0, true); 

        // normal spawning
        if (frameCount % 5 === 0) { 
            for (let i = 0; i < this.bouncersSpawnRate; i++) {
                this.bouncers.push(new Bouncer(random(width), random(height), this.currentPalette.bouncerColors));
            }
        }

        // --- BURST OPTIMIZATION ---
        if (this.clickBurstCounter > 0) {
            for (let i = 0; i < 4; i++) { 
                let newBouncer = new Bouncer(random(width), random(height), this.currentPalette.bouncerColors);
                newBouncer.applyBurstEffect(this.currentSpeedMultiplier);
                this.bouncers.push(newBouncer);
            }
            this.clickBurstCounter--;
        }

        // --- CAP OPTIMIZATION ---
        // Reduced cap to 100 for smoother performance- started to lag with vid capture
        if (this.bouncers.length > 100) {
            this.bouncers.splice(0, this.bouncers.length - 100);
        }

        for (let i = this.bouncers.length - 1; i >= 0; i--) {
            let b = this.bouncers[i];
            b.update(this.currentSpeedMultiplier, this.currentBounciness);
            b.display();

            if (b.life <= 0 || b.radius < 1) { 
                this.bouncers.splice(i, 1);
            }
        }
    }

    onResize() {
        this.bouncers = [];
        for (let i = 0; i < 60; i++) {
            this.bouncers.push(new Bouncer(random(width), random(height), this.currentPalette.bouncerColors));
        }
        background(this.backgroundColor); 
    }

    mousePressed() {
        if (this.currentPalette === palette1) {
            this.currentPalette = palette2;
        } else {
            this.currentPalette = palette1;
        }
        this.backgroundColor = color(this.currentPalette.bg); 
        background(this.backgroundColor); 

        this.clickBurstCounter = 5; 
    }
}

class Bouncer {
    constructor(x, y, colors) {
        this.x = x;
        this.y = y;
        this.vx = random(-2, 2); 
        this.vy = random(-2, 2); 
        this.radius = random(10, 40); 
        this.color = color(random(colors)); 
        this.life = 255; 
    }

    update(speedMultiplier, bounciness) {
        this.x += this.vx * speedMultiplier;
        this.y += this.vy * speedMultiplier;
        this.vx *= 0.995;
        this.vy *= 0.995;

        if (this.x - this.radius < 0 || this.x + this.radius > width) {
            this.vx *= -1 * bounciness; 
            this.x = constrain(this.x, this.radius, width - this.radius); 
        }
        if (this.y - this.radius < 0 || this.y + this.radius > height) {
            this.vy *= -1 * bounciness; 
            this.y = constrain(this.y, this.radius, height - this.radius); 
        }

        this.radius *= 0.995; 
        this.life -= 1.5; 
        this.life = constrain(this.life, 0, 255);
    }

    display() {
        let alphaValue = map(this.life, 0, 255, 0, alpha(this.color));
        fill(red(this.color), green(this.color), blue(this.color), alphaValue);
        noStroke();
        ellipse(this.x, this.y, this.radius * 2);
    }

    applyBurstEffect(speedMult) {
        this.vx = random(-5, 5) * speedMult;
        this.vy = random(-5, 5) * speedMult;
        this.radius = random(20, 60); 
        this.life = 255; 
    }
}
