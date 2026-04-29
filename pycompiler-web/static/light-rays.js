import { Renderer, Program, Triangle, Mesh } from "https://esm.sh/ogl@1.0.11";

const DEFAULTS = {
    raysOrigin: "top-center",
    raysColor: "#00ffff",
    raysSpeed: 1,
    lightSpread: 0.85,
    rayLength: 1.3,
    pulsating: false,
    fadeDistance: 1.05,
    saturation: 0.9,
    followMouse: true,
    mouseInfluence: 0.08,
    noiseAmount: 0.08,
    distortion: 0.035,
};

const VERTEX_SHADER = `
attribute vec2 position;
varying vec2 vUv;

void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `
precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform vec2 rayPos;
uniform vec2 rayDir;
uniform vec3 raysColor;
uniform float raysSpeed;
uniform float lightSpread;
uniform float rayLength;
uniform float pulsating;
uniform float fadeDistance;
uniform float saturation;
uniform vec2 mousePos;
uniform float mouseInfluence;
uniform float noiseAmount;
uniform float distortion;

varying vec2 vUv;

float noise(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed) {
    vec2 sourceToCoord = coord - raySource;
    vec2 dirNorm = normalize(sourceToCoord);
    float cosAngle = dot(dirNorm, rayRefDirection);
    float distortedAngle = cosAngle + distortion * sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;
    float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(lightSpread, 0.001));
    float distance = length(sourceToCoord);
    float maxDistance = iResolution.x * rayLength;
    float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);
    float fadeFalloff = clamp((iResolution.x * fadeDistance - distance) / (iResolution.x * fadeDistance), 0.5, 1.0);
    float pulse = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;
    float baseStrength = clamp(
        (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
        (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
        0.0,
        1.0
    );

    return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * pulse;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
    vec2 finalRayDir = rayDir;

    if (mouseInfluence > 0.0) {
        vec2 mouseScreenPos = mousePos * iResolution.xy;
        vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
        finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
    }

    vec4 rays1 = vec4(1.0) * rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349, 1.5 * raysSpeed);
    vec4 rays2 = vec4(1.0) * rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234, 1.1 * raysSpeed);

    fragColor = rays1 * 0.5 + rays2 * 0.4;

    if (noiseAmount > 0.0) {
        float n = noise(coord * 0.01 + iTime * 0.1);
        fragColor.rgb *= (1.0 - noiseAmount + noiseAmount * n);
    }

    float brightness = 1.0 - (coord.y / iResolution.y);
    fragColor.x *= 0.1 + brightness * 0.8;
    fragColor.y *= 0.3 + brightness * 0.6;
    fragColor.z *= 0.5 + brightness * 0.5;

    if (saturation != 1.0) {
        float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
        fragColor.rgb = mix(vec3(gray), fragColor.rgb, saturation);
    }

    fragColor.rgb *= raysColor;
}

void main() {
    vec4 color;
    mainImage(color, gl_FragCoord.xy);
    gl_FragColor = color;
}`;

function hexToRgb(hex) {
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return match
        ? [
              parseInt(match[1], 16) / 255,
              parseInt(match[2], 16) / 255,
              parseInt(match[3], 16) / 255,
          ]
        : [1, 1, 1];
}

function getAnchorAndDir(origin, width, height) {
    const outside = 0.2;

    switch (origin) {
        case "top-left":
            return { anchor: [0, -outside * height], dir: [0, 1] };
        case "top-right":
            return { anchor: [width, -outside * height], dir: [0, 1] };
        case "left":
            return { anchor: [-outside * width, 0.5 * height], dir: [1, 0] };
        case "right":
            return { anchor: [(1 + outside) * width, 0.5 * height], dir: [-1, 0] };
        case "bottom-left":
            return { anchor: [0, (1 + outside) * height], dir: [0, -1] };
        case "bottom-center":
            return { anchor: [0.5 * width, (1 + outside) * height], dir: [0, -1] };
        case "bottom-right":
            return { anchor: [width, (1 + outside) * height], dir: [0, -1] };
        default:
            return { anchor: [0.5 * width, -outside * height], dir: [0, 1] };
    }
}

function readNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function readBoolean(value, fallback) {
    if (value === undefined) {
        return fallback;
    }

    return value === "true";
}

function readOptions(container) {
    const dataset = container.dataset;

    return {
        raysOrigin: dataset.raysOrigin || DEFAULTS.raysOrigin,
        raysColor: dataset.raysColor || DEFAULTS.raysColor,
        raysSpeed: readNumber(dataset.raysSpeed, DEFAULTS.raysSpeed),
        lightSpread: readNumber(dataset.lightSpread, DEFAULTS.lightSpread),
        rayLength: readNumber(dataset.rayLength, DEFAULTS.rayLength),
        pulsating: readBoolean(dataset.pulsating, DEFAULTS.pulsating),
        fadeDistance: readNumber(dataset.fadeDistance, DEFAULTS.fadeDistance),
        saturation: readNumber(dataset.saturation, DEFAULTS.saturation),
        followMouse: readBoolean(dataset.followMouse, DEFAULTS.followMouse),
        mouseInfluence: readNumber(dataset.mouseInfluence, DEFAULTS.mouseInfluence),
        noiseAmount: readNumber(dataset.noiseAmount, DEFAULTS.noiseAmount),
        distortion: readNumber(dataset.distortion, DEFAULTS.distortion),
    };
}

function createLightRays(container, options) {
    let destroyed = false;
    let animationId = null;
    let resizeObserver = null;

    const mouse = { x: 0.5, y: 0.5 };
    const smoothMouse = { x: 0.5, y: 0.5 };
    const renderer = new Renderer({
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        alpha: true,
    });

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";

    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    container.appendChild(gl.canvas);

    const uniforms = {
        iTime: { value: 0 },
        iResolution: { value: [1, 1] },
        rayPos: { value: [0, 0] },
        rayDir: { value: [0, 1] },
        raysColor: { value: hexToRgb(options.raysColor) },
        raysSpeed: { value: options.raysSpeed },
        lightSpread: { value: options.lightSpread },
        rayLength: { value: options.rayLength },
        pulsating: { value: options.pulsating ? 1.0 : 0.0 },
        fadeDistance: { value: options.fadeDistance },
        saturation: { value: options.saturation },
        mousePos: { value: [0.5, 0.5] },
        mouseInfluence: { value: options.mouseInfluence },
        noiseAmount: { value: options.noiseAmount },
        distortion: { value: options.distortion },
    };

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
        vertex: VERTEX_SHADER,
        fragment: FRAGMENT_SHADER,
        uniforms,
    });
    const mesh = new Mesh(gl, { geometry, program });

    function updatePlacement() {
        if (destroyed) {
            return;
        }

        renderer.dpr = Math.min(window.devicePixelRatio || 1, 2);

        const widthCss = Math.max(container.clientWidth, 1);
        const heightCss = Math.max(container.clientHeight, 1);
        renderer.setSize(widthCss, heightCss);

        const width = widthCss * renderer.dpr;
        const height = heightCss * renderer.dpr;
        const placement = getAnchorAndDir(options.raysOrigin, width, height);

        uniforms.iResolution.value = [width, height];
        uniforms.rayPos.value = placement.anchor;
        uniforms.rayDir.value = placement.dir;
    }

    function handleMouseMove(event) {
        const rect = container.getBoundingClientRect();

        if (!rect.width || !rect.height) {
            return;
        }

        mouse.x = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
        mouse.y = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1);
    }

    function loop(time) {
        if (destroyed) {
            return;
        }

        uniforms.iTime.value = time * 0.001;

        if (options.followMouse && options.mouseInfluence > 0) {
            const smoothing = 0.92;
            smoothMouse.x = smoothMouse.x * smoothing + mouse.x * (1 - smoothing);
            smoothMouse.y = smoothMouse.y * smoothing + mouse.y * (1 - smoothing);
            uniforms.mousePos.value = [smoothMouse.x, smoothMouse.y];
        }

        renderer.render({ scene: mesh });
        animationId = window.requestAnimationFrame(loop);
    }

    window.addEventListener("resize", updatePlacement);

    if (window.ResizeObserver) {
        resizeObserver = new ResizeObserver(updatePlacement);
        resizeObserver.observe(container);
    }

    if (options.followMouse) {
        window.addEventListener("mousemove", handleMouseMove);
    }

    updatePlacement();
    animationId = window.requestAnimationFrame(loop);

    return () => {
        destroyed = true;

        if (animationId) {
            window.cancelAnimationFrame(animationId);
        }

        window.removeEventListener("resize", updatePlacement);
        window.removeEventListener("mousemove", handleMouseMove);

        if (resizeObserver) {
            resizeObserver.disconnect();
        }

        try {
            const loseContext = gl.getExtension("WEBGL_lose_context");

            if (loseContext) {
                loseContext.loseContext();
            }

            if (gl.canvas.parentNode) {
                gl.canvas.parentNode.removeChild(gl.canvas);
            }
        } catch (error) {
            console.warn("LightRays cleanup failed:", error);
        }
    };
}

function initLightRays(container) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    const options = readOptions(container);
    let stop = null;

    const start = () => {
        if (stop) {
            return;
        }

        try {
            stop = createLightRays(container, options);
        } catch (error) {
            console.warn("LightRays initialization failed:", error);
            stop = null;
        }
    };

    const pause = () => {
        if (!stop) {
            return;
        }

        stop();
        stop = null;
    };

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    start();
                    return;
                }

                pause();
            },
            { threshold: 0.02 },
        );

        observer.observe(container);
        window.addEventListener("pagehide", () => {
            observer.disconnect();
            pause();
        });
        return;
    }

    start();
    window.addEventListener("pagehide", pause);
}

const container = document.querySelector("#lightRays");

if (container) {
    initLightRays(container);
}
