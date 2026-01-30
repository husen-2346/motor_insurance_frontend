document.addEventListener("DOMContentLoaded", () => {
    initHeaderShadow();
    initHeroCTA();
    initExpandableCards();
    initFormSubmission(); // ✅ NEW: Form submission handler
});

/* =========================
   HEADER SHADOW ON SCROLL
========================= */
function initHeaderShadow() {
    const header = document.querySelector(".site-header");
    if (!header) return;

    window.addEventListener("scroll", () => {
        header.classList.toggle("header-shadow", window.scrollY > 50);
    });
}

/* =========================
   HERO CTA BEHAVIOR
========================= */
function initHeroCTA() {
    const cta = document.querySelector(".btn-cta");
    if (!cta) return;

    cta.addEventListener("click", () => {
        cta.classList.add("btn-loading");
        setTimeout(() => cta.classList.remove("btn-loading"), 500);
    });
}

/* =========================
   CLICK TO EXPAND INFO CARDS
========================= */
function initExpandableCards() {
    const cards = document.querySelectorAll(".info-card");

    cards.forEach(card => {
        const info = card.dataset.info;
        if (!info) return;

        const infoEl = document.createElement("div");
        infoEl.className = "extra-info";
        infoEl.textContent = info;
        card.appendChild(infoEl);

        card.addEventListener("click", () => {
            cards.forEach(c => {
                if (c !== card) c.classList.remove("active");
            });
            card.classList.toggle("active");
        });
    });
}

/* =========================
   ✅ FORM SUBMISSION HANDLER
========================= */
function initFormSubmission() {
    const form = document.getElementById("insuranceForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("📝 Form submission started...");

        // Get form data
        const formData = new FormData(form);

        // Convert to object and handle field name mapping
        const data = {
            name: formData.get("name"),
            phone: formData.get("phone"),
            email: formData.get("email"),
            vehicle_type: formData.get("vehicle_type"),
            make: formData.get("make"),
            model: formData.get("model"),
            year: formData.get("year"),
            registration_number: formData.get("registration") // ✅ Map 'registration' to 'registration_number'
        };

        console.log("📤 Sending data:", data);

        // Disable submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";

        try {
            const response = await fetch("https://vehical-insurance-backend.onrender.com/apply", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            console.log("📥 Server response:", result);

            if (response.ok && result.success) {
                // Success
                alert("✅ Application submitted successfully!\n\nThank you for applying. Our team will review your application soon.");
                form.reset();
            } else {
                // Server returned error
                alert(`❌ Failed to submit application.\n\n${result.message || "Please try again."}`);
            }
        } catch (error) {
            console.error("❌ Submission error:", error);
            alert("❌ Failed to submit application. Please try again.");
        } finally {
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}