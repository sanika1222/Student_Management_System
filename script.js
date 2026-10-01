document.addEventListener("DOMContentLoaded", () => {
    const registrationForm = document.getElementById("studentRegistrationForm");
    const primaryKeyField = document.getElementById("studentPrimaryKey");
    const nameField = document.getElementById("studentName");
    const rollField = document.getElementById("studentRoll");
    const ageField = document.getElementById("studentAge");
    const courseField = document.getElementById("studentCourse");
    const emailField = document.getElementById("studentEmail");
    
    const formPanelTitle = document.getElementById("formPanelTitle");
    const saveButton = document.getElementById("saveButton");
    const abortButton = document.getElementById("abortButton");
    const directoryTableBody = document.getElementById("directoryTableBody");
    const noDataPlaceholder = document.getElementById("noDataPlaceholder");
    const statusAlert = document.getElementById("statusAlert");

    // Fetch stored table entries on startup
    refreshDirectory();

    // Handle Form submission
    registrationForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        // 1. Structural Form Input Validation
        const nameVal = nameField.value.trim();
        const rollVal = rollField.value.trim();
        const ageVal = ageField.value.trim();
        const courseVal = courseField.value.trim();
        const emailVal = emailField.value.trim();

        if (!nameVal || !rollVal || !ageVal || !courseVal || !emailVal) {
            triggerNotification("Operation failed: Important fields cannot be empty.", false);
            return;
        }

        const numericAge = parseInt(ageVal, 10);
        if (isNaN(numericAge) || numericAge <= 0 || numericAge > 130) {
            triggerNotification("Operation failed: Please specify a valid logical age counter.", false);
            return;
        }

        // Email address structural expression check
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(emailVal)) {
            triggerNotification("Operation failed: Please enter a correct email syntax structure.", false);
            return;
        }

        // 2. Prepare transactional payload
        const payload = {
            name: nameVal,
            roll_number: rollVal,
            age: numericAge,
            course: courseVal,
            email: emailVal
        };

        const targetId = primaryKeyField.value;
        const apiPath = targetId ? `/api/students/${targetId}` : "/api/students";
        const HTTPMethod = targetId ? "PUT" : "POST";

        // 3. Dispatch to FastAPI server instance
        try {
            const response = await fetch(apiPath, {
                method: HTTPMethod,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const parsedBody = await response.json();

            if (response.ok) {
                triggerNotification(parsedBody.message || "Database updated successfully.", true);
                clearInputForm();
                refreshDirectory();
            } else {
                // Display specific FastAPI validation or constraint failure message
                const message = (parsedBody.detail && typeof parsedBody.detail === 'string') 
                    ? parsedBody.detail 
                    : "Failed to persist database record changes.";
                triggerNotification(message, false);
            }
        } catch (error) {
            triggerNotification("Network connection failure: Cannot access server application layer.", false);
        }
    });

    // Read Operations: Display target dataset
    async function refreshDirectory() {
        try {
            const response = await fetch("/api/students");
            if (!response.ok) throw new Error("Fetch dataset request declined.");
            
            const entries = await response.json();
            directoryTableBody.innerHTML = "";

            if (entries.length === 0) {
                noDataPlaceholder.style.display = "block";
                return;
            }

            noDataPlaceholder.style.display = "none";
            entries.forEach(row => {
                const htmlRow = document.createElement("tr");
                htmlRow.innerHTML = `
                    <td><strong>${escapeHTML(row.roll_number)}</strong></td>
                    <td>${escapeHTML(row.name)}</td>
                    <td>${row.age}</td>
                    <td>${escapeHTML(row.course)}</td>
                    <td>${escapeHTML(row.email)}</td>
                    <td class="actions-cell">
                        <button class="btn-action-edit" type="button" id="edit-btn-${row.id}">Edit</button>
                        <button class="btn-action-delete" type="button" id="delete-btn-${row.id}">Delete</button>
                    </td>
                `;
                directoryTableBody.appendChild(htmlRow);

                // Attach dynamic events securely
                document.getElementById(`edit-btn-${row.id}`).addEventListener("click", () => populateFormForUpdate(row));
                document.getElementById(`delete-btn-${row.id}`).addEventListener("click", () => executeRecordDeletion(row.id));
            });
        } catch (err) {
            console.error("Directory loading process failure: ", err);
        }
    }

    // Populate Fields for an Update operation
    function populateFormForUpdate(row) {
        formPanelTitle.innerText = "Modify Student Info";
        primaryKeyField.value = row.id;
        nameField.value = row.name;
        rollField.value = row.roll_number;
        ageField.value = row.age;
        courseField.value = row.course;
        emailField.value = row.email;

        saveButton.innerText = "Apply Changes";
        abortButton.style.display = "inline-block";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Delete Operation
    async function executeRecordDeletion(id) {
        if (!confirm("Are you sure you want to delete this student record?")) return;

        try {
            const response = await fetch(`/api/students/${id}`, { method: "DELETE" });
            const result = await response.json();

            if (response.ok) {
                triggerNotification(result.message, true);
                if (primaryKeyField.value == id) clearInputForm();
                refreshDirectory();
            } else {
                triggerNotification(result.detail || "Unable to clear target data engine entry.", false);
            }
        } catch (error) {
            triggerNotification("Network connection failure: Cannot run deletion API.", false);
        }
    }

    // Cancel / Clear handling triggers
    abortButton.addEventListener("click", clearInputForm);

    function clearInputForm() {
        formPanelTitle.innerText = "Register Student";
        primaryKeyField.value = "";
        registrationForm.reset();
        saveButton.innerText = "Save Record";
        abortButton.style.display = "none";
    }

    // Notification handling system
    function triggerNotification(text, successMode) {
        statusAlert.innerText = text;
        statusAlert.className = `alert ${successMode ? 'alert-success' : 'alert-error'}`;
        statusAlert.style.display = "block";
        
        // Hide standard notification alert automatically after 5 seconds
        setTimeout(() => {
            statusAlert.style.display = "none";
        }, 5000);
    }

    // Prevent basic cross-site scripting (XSS) injections within layout nodes
    function escapeHTML(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
});
