let resultChart = null;

document.body.classList.add("js-enabled");

const elements = {
    quickForm: document.querySelector("#quickCompileForm"),
    mainForm: document.querySelector("#compileForm"),
    sourceHero: document.querySelector("#sourceCodeHero"),
    sourceMain: document.querySelector("#sourceCode"),
    xStartHero: document.querySelector("#xStartHero"),
    xEndHero: document.querySelector("#xEndHero"),
    xStartMain: document.querySelector("#xStart"),
    xEndMain: document.querySelector("#xEnd"),
    status: document.querySelector("#compileStatus"),
    statusDetail: document.querySelector("#statusDetail"),
    errorBox: document.querySelector("#errorBox"),
    sourceOutput: document.querySelector("#sourceOutput"),
    bnfOutput: document.querySelector("#bnfOutput"),
    cfgOutput: document.querySelector("#cfgOutput"),
    tokenTable: document.querySelector("#tokenTable"),
    astOutput: document.querySelector("#astOutput"),
    semanticOutput: document.querySelector("#semanticOutput"),
    generatedCodeOutput: document.querySelector("#generatedCodeOutput"),
    executionTable: document.querySelector("#executionTable"),
    chartCanvas: document.querySelector("#resultChart"),
    tokenCount: document.querySelector("#tokenCount"),
    executionCount: document.querySelector("#executionCount"),
    rangeInfo: document.querySelector("#rangeInfo"),
    navbar: document.querySelector(".navbar"),
    navToggle: document.querySelector(".nav-toggle"),
    navLinks: document.querySelector(".nav-links"),
};

function initIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function scrollToSection(hash) {
    const target = document.querySelector(hash);
    if (!target) {
        return;
    }

    const navHeight = elements.navbar.getBoundingClientRect().height;
    const targetTop = target.getBoundingClientRect().top + window.scrollY;
    const extraGap = hash === "#fitur" ? 16 : 28;
    window.scrollTo({
        top: Math.max(targetTop - navHeight - extraGap, 0),
        behavior: "smooth",
    });
}

function setActiveNavLink(hash) {
    document.querySelectorAll(".nav-links a").forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === hash);
    });
}

function syncForms(fromHero) {
    const source = fromHero ? elements.sourceHero.value : elements.sourceMain.value;
    const xStart = fromHero ? elements.xStartHero.value : elements.xStartMain.value;
    const xEnd = fromHero ? elements.xEndHero.value : elements.xEndMain.value;

    elements.sourceHero.value = source;
    elements.sourceMain.value = source;
    elements.xStartHero.value = xStart;
    elements.xStartMain.value = xStart;
    elements.xEndHero.value = xEnd;
    elements.xEndMain.value = xEnd;

    return { sourceCode: source, xStart, xEnd };
}

async function compile(fromHero = false, shouldScroll = true) {
    const { sourceCode, xStart, xEnd } = syncForms(fromHero);
    setLoadingState();

    try {
        const response = await fetch("/compile", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                source_code: sourceCode,
                x_start: Number(xStart),
                x_end: Number(xEnd),
            }),
        });

        const payload = await response.json();

        if (!response.ok || !payload.success) {
            throw new Error(payload.error || "Compile gagal");
        }

        renderResult(payload);
        if (shouldScroll) {
            scrollToSection("#demo");
            setActiveNavLink("#demo");
        }
    } catch (error) {
        renderError(error.message);
    }
}

function setLoadingState() {
    elements.status.textContent = "Compiling";
    elements.statusDetail.textContent = "Lexer, parser, semantic analyzer, dan evaluator sedang berjalan.";
    elements.errorBox.hidden = true;
    elements.errorBox.textContent = "";
    document.querySelectorAll(".compile-button").forEach((button) => {
        button.disabled = true;
        button.textContent = "Compiling...";
    });
}

function renderResult(payload) {
    elements.status.textContent = "Sukses";
    elements.statusDetail.textContent = `${payload.execution.length} baris execution berhasil dibuat.`;
    elements.errorBox.hidden = true;
    resetCompileButtons();

    elements.sourceOutput.textContent = payload.source_code;
    elements.bnfOutput.textContent = payload.bnf;
    elements.cfgOutput.textContent = payload.cfg;
    elements.astOutput.textContent = payload.ast;
    elements.semanticOutput.textContent = payload.semantic;
    elements.generatedCodeOutput.textContent = payload.generated_code;

    renderTokens(payload.tokens);
    renderExecution(payload.execution);
    renderChart(payload.execution);
    renderMetrics(payload);
}

function renderError(message) {
    elements.status.textContent = "Error";
    elements.statusDetail.textContent = "Source code belum valid.";
    elements.errorBox.hidden = false;
    elements.errorBox.textContent = message;
    resetCompileButtons();
}

function resetCompileButtons() {
    document.querySelectorAll(".compile-button").forEach((button) => {
        button.disabled = false;
        button.textContent = "Compile";
    });
    initIcons();
}

function renderMetrics(payload) {
    const first = payload.execution[0];
    const last = payload.execution[payload.execution.length - 1];

    elements.tokenCount.textContent = payload.tokens.length;
    elements.executionCount.textContent = payload.execution.length;
    elements.rangeInfo.textContent = first && last ? `${first.x}-${last.x}` : "-";
}

function renderTokens(tokens) {
    elements.tokenTable.replaceChildren();

    tokens.forEach((token) => {
        const row = document.createElement("tr");
        const typeCell = document.createElement("td");
        const valueCell = document.createElement("td");

        typeCell.textContent = token.type;
        valueCell.textContent = token.value;
        row.append(typeCell, valueCell);
        elements.tokenTable.append(row);
    });
}

function renderExecution(execution) {
    elements.executionTable.replaceChildren();

    execution.forEach((item) => {
        const row = document.createElement("tr");
        const xCell = document.createElement("td");
        const yCell = document.createElement("td");

        xCell.textContent = item.x;
        yCell.textContent = item.y;
        row.append(xCell, yCell);
        elements.executionTable.append(row);
    });
}

function renderChart(execution) {
    const labels = execution.map((item) => item.x);
    const values = execution.map((item) => item.y);

    if (resultChart) {
        resultChart.destroy();
    }

    resultChart = new Chart(elements.chartCanvas, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "y vs x",
                    data: values,
                    borderColor: "#7c5cff",
                    backgroundColor: "rgba(168, 85, 247, 0.16)",
                    borderWidth: 3,
                    pointRadius: 4,
                    pointBackgroundColor: "#f8b84e",
                    tension: 0.28,
                    fill: true,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: "#dbeafe",
                        font: {
                            family: "Poppins",
                        },
                    },
                },
            },
            scales: {
                x: {
                    ticks: { color: "#b6c2d3" },
                    title: { display: true, text: "x", color: "#e5f0ff" },
                    grid: { color: "rgba(148, 163, 184, 0.16)" },
                },
                y: {
                    ticks: { color: "#b6c2d3" },
                    title: { display: true, text: "y", color: "#e5f0ff" },
                    grid: { color: "rgba(148, 163, 184, 0.16)" },
                },
            },
        },
    });
}

elements.quickForm.addEventListener("submit", (event) => {
    event.preventDefault();
    compile(true);
});

elements.mainForm.addEventListener("submit", (event) => {
    event.preventDefault();
    compile(false);
});

elements.navToggle.addEventListener("click", () => {
    const isOpen = elements.navLinks.classList.toggle("open");
    elements.navToggle.setAttribute("aria-expanded", String(isOpen));
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
        const hash = link.getAttribute("href");
        if (!hash || hash === "#") {
            return;
        }

        event.preventDefault();
        scrollToSection(hash);
        setActiveNavLink(hash);
        elements.navLinks.classList.remove("open");
        elements.navToggle.setAttribute("aria-expanded", "false");
    });
});

document.querySelectorAll("[data-sample]").forEach((button) => {
    button.addEventListener("click", () => {
        const sample = button.dataset.sample;
        elements.sourceMain.value = sample;
        elements.sourceHero.value = sample;
        compile(false);
    });
});

document.querySelectorAll(".copy-button").forEach((button) => {
    button.addEventListener("click", async () => {
        const target = document.querySelector(`#${button.dataset.copyTarget}`);
        if (!target) {
            return;
        }

        try {
            await navigator.clipboard.writeText(target.textContent);
            button.textContent = "Copied";
            button.classList.add("copied");
            setTimeout(() => {
                button.textContent = "Copy";
                button.classList.remove("copied");
            }, 1200);
        } catch {
            button.textContent = "Gagal";
            setTimeout(() => {
                button.textContent = "Copy";
            }, 1200);
        }
    });
});

const sectionObserver = new IntersectionObserver(
    (entries) => {
        const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) {
            setActiveNavLink(`#${visible.target.id}`);
        }
    },
    {
        rootMargin: "-120px 0px -55% 0px",
        threshold: [0.18, 0.35, 0.55],
    },
);

document.querySelectorAll("header[id], main section[id], footer[id]").forEach((section) => {
    sectionObserver.observe(section);
});

const revealObserver = new IntersectionObserver(
    (entries, observer) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                return;
            }

            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
        });
    },
    {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.12,
    },
);

document
    .querySelectorAll(
        ".feature-card, .workflow div, .input-card, .status-card, .output-card, .docs-grid article, .site-footer",
    )
    .forEach((item, index) => {
        item.classList.add("reveal");
        item.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 55}ms`);
        revealObserver.observe(item);
    });

initIcons();
compile(false, false);
