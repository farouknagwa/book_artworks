(function () {
  "use strict";

  const subjectSelect = document.getElementById("subject-select");
  const searchInput = document.getElementById("search-input");
  const clearFiltersBtn = document.getElementById("clear-filters");
  const emptyClearBtn = document.getElementById("empty-clear");
  const grid = document.getElementById("grid");
  const emptyState = document.getElementById("empty-state");
  const resultsSummary = document.getElementById("results-summary");
  const totalCount = document.getElementById("total-count");
  const toast = document.getElementById("toast");

  let catalog = { subjects: [], artworks: [] };
  let toastTimer = null;

  function formatSubjectLabel(subject) {
    return subject.replace(/_/g, " ");
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove("hidden");
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("show");
      setTimeout(function () {
        toast.classList.add("hidden");
      }, 200);
    }, 2200);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied: " + text);
    } catch (err) {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
      showToast("Copied: " + text);
    }
  }

  function populateSubjects() {
    catalog.subjects.forEach(function (subject) {
      const option = document.createElement("option");
      option.value = subject;
      option.textContent = formatSubjectLabel(subject);
      subjectSelect.appendChild(option);
    });
  }

  function getFilteredArtworks() {
    const subject = subjectSelect.value;
    const query = searchInput.value.trim().toLowerCase();

    return catalog.artworks.filter(function (item) {
      if (subject && item.subject !== subject) {
        return false;
      }
      if (query && item.name.toLowerCase().indexOf(query) === -1) {
        return false;
      }
      return true;
    });
  }

  function renderGrid() {
    const filtered = getFilteredArtworks();
    grid.innerHTML = "";

    filtered.forEach(function (item) {
      const card = document.createElement("article");
      card.className = "card";
      card.setAttribute("role", "listitem");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", item.name);

      card.innerHTML =
        '<div class="card-inner">' +
          '<div class="card-thumb">' +
            '<img src="' + item.thumb + '" alt="" loading="lazy" decoding="async">' +
          "</div>" +
          '<div class="card-body">' +
            '<p class="card-name">' + item.name + "</p>" +
            '<p class="card-subject">' + formatSubjectLabel(item.subject) + "</p>" +
            '<p class="card-hint">Click to copy name</p>' +
          "</div>" +
        "</div>";

      function handleActivate() {
        copyText(item.name);
      }

      card.addEventListener("click", handleActivate);
      card.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleActivate();
        }
      });

      grid.appendChild(card);
    });

    const subjectLabel = subjectSelect.value
      ? formatSubjectLabel(subjectSelect.value)
      : "all subjects";
    const queryLabel = searchInput.value.trim()
      ? ' matching "' + searchInput.value.trim() + '"'
      : "";

    resultsSummary.textContent =
      "Showing " + filtered.length + " of " + catalog.artworks.length +
      " artworks in " + subjectLabel + queryLabel + ".";

    const isEmpty = filtered.length === 0;
    emptyState.classList.toggle("hidden", !isEmpty);
    grid.classList.toggle("hidden", isEmpty);
  }

  function clearFilters() {
    subjectSelect.value = "";
    searchInput.value = "";
    renderGrid();
  }

  function initFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const subject = params.get("subject");
    const q = params.get("q");
    if (subject && catalog.subjects.indexOf(subject) !== -1) {
      subjectSelect.value = subject;
    }
    if (q) {
      searchInput.value = q;
    }
  }

  function syncQueryString() {
    const params = new URLSearchParams();
    if (subjectSelect.value) {
      params.set("subject", subjectSelect.value);
    }
    if (searchInput.value.trim()) {
      params.set("q", searchInput.value.trim());
    }
    const next = params.toString();
    const url = next ? "?" + next : window.location.pathname;
    window.history.replaceState(null, "", url);
  }

  function bindEvents() {
    subjectSelect.addEventListener("change", function () {
      renderGrid();
      syncQueryString();
    });

    searchInput.addEventListener("input", function () {
      renderGrid();
      syncQueryString();
    });

    clearFiltersBtn.addEventListener("click", function () {
      clearFilters();
      syncQueryString();
    });

    emptyClearBtn.addEventListener("click", function () {
      clearFilters();
      syncQueryString();
    });
  }

  fetch("data/catalog.json")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Failed to load catalog");
      }
      return response.json();
    })
    .then(function (data) {
      catalog = data;
      totalCount.textContent = catalog.artworks.length + " artworks";
      populateSubjects();
      initFromQuery();
      bindEvents();
      renderGrid();
    })
    .catch(function (err) {
      resultsSummary.textContent = "Could not load artwork catalog.";
      console.error(err);
    });
})();
