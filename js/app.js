(function () {
  "use strict";

  const PAGE_SIZE = 50;

  const subjectSelect = document.getElementById("subject-select");
  const searchInput = document.getElementById("search-input");
  const clearFiltersBtn = document.getElementById("clear-filters");
  const emptyClearBtn = document.getElementById("empty-clear");
  const grid = document.getElementById("grid");
  const emptyState = document.getElementById("empty-state");
  const resultsSummary = document.getElementById("results-summary");
  const totalCount = document.getElementById("total-count");
  const toast = document.getElementById("toast");
  const pagination = document.getElementById("pagination");
  const pagePrev = document.getElementById("page-prev");
  const pageNext = document.getElementById("page-next");
  const pageInfo = document.getElementById("page-info");

  let catalog = { subjects: [], artworks: [] };
  let currentPage = 1;
  let toastTimer = null;

  function applyThumbMetrics(metrics) {
    if (!metrics || !metrics.maxHeight) {
      return;
    }
    document.documentElement.style.setProperty(
      "--card-thumb-image-height",
      metrics.maxHeight + "px"
    );
  }

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

  function getTotalPages(count) {
    return Math.max(1, Math.ceil(count / PAGE_SIZE));
  }

  function clampPage(page, totalPages) {
    return Math.min(Math.max(1, page), totalPages);
  }

  function equalizeCardHeights() {
    const cards = Array.from(grid.querySelectorAll(".card"));
    if (!cards.length) {
      return;
    }
    cards.forEach(function (card) {
      card.style.height = "";
    });
    const maxHeight = Math.max.apply(
      null,
      cards.map(function (card) {
        return card.offsetHeight;
      })
    );
    cards.forEach(function (card) {
      card.style.height = maxHeight + "px";
    });
  }

  function scheduleEqualizeCardHeights() {
    requestAnimationFrame(function () {
      equalizeCardHeights();
    });
  }

  function watchCardImages() {
    const images = Array.from(grid.querySelectorAll(".card-thumb img"));
    if (!images.length) {
      scheduleEqualizeCardHeights();
      return;
    }
    let pending = images.length;
    function done() {
      pending -= 1;
      if (pending <= 0) {
        scheduleEqualizeCardHeights();
      }
    }
    images.forEach(function (img) {
      if (img.complete) {
        done();
      } else {
        img.addEventListener("load", done);
        img.addEventListener("error", done);
      }
    });
  }

  function renderPagination(totalItems, totalPages) {
    const showPagination = totalItems > PAGE_SIZE;
    pagination.classList.toggle("hidden", !showPagination);
    if (!showPagination) {
      return;
    }
    pageInfo.textContent = "Page " + currentPage + " of " + totalPages;
    pagePrev.disabled = currentPage <= 1;
    pageNext.disabled = currentPage >= totalPages;
  }

  function renderGrid(scrollToTop) {
    const filtered = getFilteredArtworks();
    const totalPages = getTotalPages(filtered.length);
    currentPage = clampPage(currentPage, totalPages);

    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(startIndex, startIndex + PAGE_SIZE);

    grid.innerHTML = "";

    pageItems.forEach(function (item) {
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

    if (filtered.length === 0) {
      resultsSummary.textContent = "No artworks found.";
    } else {
      const from = startIndex + 1;
      const to = startIndex + pageItems.length;
      resultsSummary.textContent =
        "Showing " + from + "–" + to + " of " + filtered.length +
        " artworks in " + subjectLabel + queryLabel + ".";
    }

    const isEmpty = filtered.length === 0;
    emptyState.classList.toggle("hidden", !isEmpty);
    grid.classList.toggle("hidden", isEmpty);
    renderPagination(filtered.length, totalPages);

    if (!isEmpty) {
      watchCardImages();
      if (scrollToTop) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }

  function clearFilters() {
    subjectSelect.value = "";
    searchInput.value = "";
    currentPage = 1;
    renderGrid(false);
  }

  function initFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const subject = params.get("subject");
    const q = params.get("q");
    const page = parseInt(params.get("page") || "1", 10);
    if (subject && catalog.subjects.indexOf(subject) !== -1) {
      subjectSelect.value = subject;
    }
    if (q) {
      searchInput.value = q;
    }
    if (!isNaN(page) && page > 0) {
      currentPage = page;
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
    if (currentPage > 1) {
      params.set("page", String(currentPage));
    }
    const next = params.toString();
    const url = next ? "?" + next : window.location.pathname;
    window.history.replaceState(null, "", url);
  }

  function bindEvents() {
    subjectSelect.addEventListener("change", function () {
      currentPage = 1;
      renderGrid(false);
      syncQueryString();
    });

    searchInput.addEventListener("input", function () {
      currentPage = 1;
      renderGrid(false);
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

    pagePrev.addEventListener("click", function () {
      if (currentPage > 1) {
        currentPage -= 1;
        renderGrid(true);
        syncQueryString();
      }
    });

    pageNext.addEventListener("click", function () {
      const totalPages = getTotalPages(getFilteredArtworks().length);
      if (currentPage < totalPages) {
        currentPage += 1;
        renderGrid(true);
        syncQueryString();
      }
    });

    window.addEventListener("resize", scheduleEqualizeCardHeights);
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
      return fetch("data/thumb_metrics.json");
    })
    .then(function (response) {
      if (response && response.ok) {
        return response.json();
      }
      return null;
    })
    .then(function (metrics) {
      applyThumbMetrics(metrics);
      renderGrid(false);
    })
    .catch(function (err) {
      resultsSummary.textContent = "Could not load artwork catalog.";
      console.error(err);
    });
})();
