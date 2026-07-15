// Interactive background animations - multiple modes available
// Change ANIMATION_MODE to switch: "particles", "waves", "constellation"
const ANIMATION_MODE = "constellation";

const canvas = document.getElementById("bgCanvas");
if (canvas) {
    const ctx = canvas.getContext("2d");
    let w, h, mouse = { x: -100, y: -100 };
    let particles = [];

    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("mousemove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });
    document.addEventListener("mouseleave", () => { mouse.x = -100; mouse.y = -100; });

    // Constellation mode
    function initConstellation() {
        particles = [];
        const count = Math.min(60, Math.floor((w * h) / 18000));
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                r: Math.random() * 2 + 1
            });
        }
    }

    function drawConstellation() {
        ctx.clearRect(0, 0, w, h);
        const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#58a6ff";
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > w) p.vx *= -1;
            if (p.y < 0 || p.y > h) p.vy *= -1;
            // Mouse attraction
            const dx = mouse.x - p.x, dy = mouse.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 200) {
                p.x += dx * 0.005;
                p.y += dy * 0.005;
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = primary;
            ctx.fill();
        });
        // Draw connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = primary;
                    ctx.globalAlpha = 1 - dist / 120;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            }
        }
        // Mouse connections
        particles.forEach(p => {
            const dx = mouse.x - p.x, dy = mouse.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.strokeStyle = primary;
                ctx.globalAlpha = (1 - dist / 150) * 0.6;
                ctx.lineWidth = 0.8;
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        });
        requestAnimationFrame(drawConstellation);
    }

    initConstellation();
    drawConstellation();
}
