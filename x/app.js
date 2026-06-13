// basic

let articlesData = [];

document.addEventListener("DOMContentLoaded", async () => {

    if (location.pathname === "/") {
        const params = new URLSearchParams(location.search);

        if (!params.has("a")) {
            location.href = "/crooshfeed/";
            return;
        }
    }

    await loadLayout();
    await loadArticles();

    setupHeader();
    setupSearch();

    if (new URLSearchParams(location.search).has("a")) {
        await loadArticlePage();
    }
    else {
        await loadCategoryPage();
    }

    registerView();

});

// shared

async function loadLayout() {

    const layout = await fetch("/x/layout.html").then(r => r.text());

    const parser = new DOMParser();
    const doc = parser.parseFromString(layout, "text/html");

    const header = document.getElementById("header");
    const footer = document.getElementById("footer");

    if (header) {
        header.innerHTML =
            doc.querySelector("header")?.outerHTML || "";
    }

    if (footer) {
        footer.innerHTML =
            doc.querySelector("footer")?.outerHTML || "";
    }
}

async function loadArticles() {

    const res = await fetch("/x/articles.json");

    const data = await res.json();

    articlesData = data.articles;
}

function getTagsForCategory(category) {

    const tagCounts = new Map();

    articlesData
        .filter(a => a.live === true && a.category === category)
        .forEach(article => {

            (article.tags || []).forEach(tag => {

                tagCounts.set(
                    tag,
                    (tagCounts.get(tag) || 0) + 1
                );

            });

        });

    // convert to array + sort by frequency
    const sortedTags = Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1]) // most used first
        .map(entry => entry[0]);     // extract tag only

    return ["all", ...sortedTags];
}

// header

function setupHeader() {

    document.querySelectorAll(".header-container .label").forEach(label => {

        label.addEventListener("click", () => {

            const category = label.dataset.category;

            const slug = category.replace(/\s+/g, "");

            window.location.href = `/${slug}`;
        });

    });

    document.querySelectorAll(".header-container .arrow").forEach(arrow => {

        arrow.addEventListener("click", (e) => {

            e.stopPropagation();

            const label =
                arrow.parentElement.querySelector(".label");

            const category = label.dataset.category;

            const dropdown =
                document.getElementById("tag-dropdown");

            if (
                !dropdown.classList.contains("hidden") &&
                dropdown.dataset.category === category
            ) {
                dropdown.classList.add("hidden");
                return;
            }

            const tags = getTagsForCategory(category);

            dropdown.innerHTML = tags.map(tag => `
                <div class="tag-item" data-tag="${tag}">
                    ${tag}
                </div>
            `).join("");

            dropdown.dataset.category = category;
            dropdown.classList.remove("hidden");

            const rect = arrow.getBoundingClientRect();

            dropdown.style.left = rect.left + "px";
            dropdown.style.top =
                (rect.bottom + window.scrollY) + "px";
        });

    });

    const searchForm = document.getElementById("search-form");

    if (searchForm) {

        searchForm.addEventListener("submit", (e) => {

            e.preventDefault();

            const query =
                document.getElementById("search-box")
                .value
                .trim();

            if (!query) return;

            window.location.href =
                `/search?s=${encodeURIComponent(query)}`;

        });

    }
}

document.addEventListener("click", (e) => {

    const dropdown = document.getElementById("tag-dropdown");
    if (!dropdown) return;

    const clickedTab = e.target.closest(".header-container .tab");
    const clickedDropdown = e.target.closest("#tag-dropdown");

    const clickedArrow = e.target.closest(".arrow");
    const clickedLabel = e.target.closest(".label");

    const clickedHeader = clickedTab || clickedArrow || clickedLabel;

    if (!clickedDropdown && !clickedHeader) {
        dropdown.classList.add("hidden");
    }
});

// active tab helper

function activateTab(category) {

    const categoryMap = {
        "hot goss": "hotgoss",
        "latest lolz": "latestlolz",
        "trending vids": "trendingvids",
        "crooshfeed": "crooshfeed",
        "merch": "merch"
    };

    const tabId =
        categoryMap[category.toLowerCase()];

    if (!tabId) return;

    const label = document.getElementById(tabId);

    if (!label) return;

    label.classList.add("active");

    const arrow =
        label.parentElement.querySelector(".arrow");

    if (arrow) {
        arrow.classList.add("active");
    }
}

// article page loader

async function loadArticlePage() {

    const advert =
        document.querySelector(".advertisement");

    if (advert && Math.random() < 0.5) {

        advert.src =
            "/x/images/main/sponsored2.png";
    }

    const articleId =
        new URLSearchParams(location.search).get("a");

    if (!articleId) {
        location.href = "/crooshfeed/";
        return;
    }

    const article =
        articlesData.find(x => x.id === articleId);

    if (!article || article.live !== true) {
        location.href = "/crooshfeed/";
        return;
    }

    document.title =
        "Girl Croosh - " + article.title;

    document.getElementById("title").textContent =
        article.title;

    document.getElementById("date").textContent =
        article.date;

    document.getElementById("author").textContent =
        article.author;

    document.getElementById("contents").innerHTML =
        article.contents;

    const linkEl = document.getElementById("link");

    linkEl.textContent = "View on say.itgirl.lol!";
    linkEl.href = article.link;

    let url = article.link;

    if (url && !url.startsWith("http")) {
        url = "https://" + url;
    }

    linkEl.href = url;

    document.getElementById("category").textContent =
        article.category;

    document.getElementById("tags").innerHTML =
        article.tags.map(tag =>
            `<span>${tag}</span>`
        ).join(" | ");

    activateTab(article.category);

    const currentTags = new Set(article.tags || []);

    const relatedArticles = articlesData
        .filter(a =>
            a.live === true &&
            a.id !== article.id
        )
        .map(a => {

            const matchingTags =
                (a.tags || []).filter(tag =>
                    currentTags.has(tag)
                ).length;

            return {
                ...a,
                matchingTags
            };

        })
        .sort((a, b) => {

            // most matching tags first
            if (b.matchingTags !== a.matchingTags) {
                return b.matchingTags - a.matchingTags;
            }

            // then newest date
            return new Date(b.date) - new Date(a.date);

        })
        .slice(0, 4);

        const nextButton = document.querySelector(".next");

        if (nextButton && relatedArticles.length > 0) {

            nextButton.style.cursor = "pointer";

            nextButton.addEventListener("click", () => {
                window.location.href = `/?a=${relatedArticles[0].id}`;
            });

        }

        const nextLink = document.getElementById("next-link");

        if (nextLink && relatedArticles.length > 0) {
            nextLink.href = `/?a=${relatedArticles[0].id}`;
        }

        document.getElementById("related-feed").innerHTML =
        relatedArticles.map(article => `
            <a class="feed-item" href="/?a=${article.id}">
                <div class="feed-title">${article.title}</div>

                <img
                    class="feed-thumb"
                    src="${article.thumbnail}"
                    alt="${article.title}"
                >

                <div class="feed-tagline">
                    ${article.tagline}
                </div>
            </a>
        `).join("");

        await loadViews(article.id);
        await loadLikes(article.id);
        setupLikes(article.id);
}

// category page loader

async function loadCategoryPage() {

    const advert =
        document.querySelector(".advertisement");

    if (advert && Math.random() < 0.5) {

        advert.src =
            "/x/images/main/sponsored2.png";
    }

    if (location.pathname.toLowerCase().includes("/search")) {
        return loadSearchPage();
    }

    const categoryMap = {
        hotgoss: "hot goss",
        latestlolz: "latest lolz",
        trendingvids: "trending vids",
        crooshfeed: "crooshfeed",
        merch: "merch"
    };

    const slug =
        location.pathname.replace(/\//g, "").toLowerCase();

    const category =
        categoryMap[slug];

    if (!category) return;

    activateTab(category);

    const articles = articlesData
        .filter(a =>
            a.live === true &&
            a.category.toLowerCase() === category
        )
        .sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        );

    const feed =
        document.getElementById("feed");

    if (!feed) return;

    feed.innerHTML =
        articles.map(article => `
            <a class="feed-item" href="/?a=${article.id}">
                <div class="feed-title">${article.title}</div>
                <img class="feed-thumb" src="${article.thumbnail}" alt="${article.title}">
                <div class="feed-tagline">${article.tagline}</div>
            </a>
        `).join("");
}

// search

async function loadSearchPage() {

    const query =
        new URLSearchParams(location.search)
            .get("s");

    if (!query) return;

    document.getElementById("search-text")
        .textContent =
        `Results for "${query}"`;

    const search =
        query.toLowerCase();

    const results = articlesData
        .filter(article => {

            if (article.live !== true)
                return false;

            return (
                article.title?.toLowerCase().includes(search) ||
                article.tagline?.toLowerCase().includes(search) ||
                article.contents?.toLowerCase().includes(search) ||
                (article.tags || []).some(tag =>
                    tag.toLowerCase().includes(search)
                )
            );

        })
        .sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        );

    document.getElementById("feed").innerHTML =
        results.length
        ? results.map(article => `
            <a class="feed-item" href="/?a=${article.id}">
                <div class="feed-title">${article.title}</div>

                <img class="feed-thumb"
                     src="${article.thumbnail}"
                     alt="${article.title}">

                <div class="feed-tagline">
                    ${article.tagline}
                </div>
            </a>
        `).join("")
        : "<p>No results found.</p>";
}

function setupSearch() {

    const searchForm =
        document.getElementById("search-form");

    const searchBox =
        document.getElementById("search-box");

    if (!searchForm || !searchBox) return;

    const placeholders = [
        "flyin gosling gifs"
    ];

    if (Math.random() < 0.5) {

        searchBox.placeholder =
            placeholders[
                Math.floor(Math.random() * placeholders.length)
            ];
    }

    searchForm.addEventListener("submit", (e) => {

        e.preventDefault();

        const query = searchBox.value.trim();

        if (!query) return;

        window.location.href =
            `/search/?s=${encodeURIComponent(query)}`;
    });
}

// view count

async function registerView() {

    const url = new URL(window.location);

    let key;

    const articleId =
        url.searchParams.get("a");

    if (articleId) {

        key = articleId;

    } else {

        key = url.pathname;

        if (url.search) {
            key += url.search;
        }
    }

    fetch(
        `https://girlcroosh.silly-7f7.workers.dev/increment/${encodeURIComponent(key)}`
    ).catch(() => {});
}

async function loadViews(articleId) {

    const res =
        await fetch(
            `https://girlcroosh.silly-7f7.workers.dev/value/${articleId}`
        );

    const data =
        await res.json();

    document.getElementById("views")
        .textContent =
        `${data.count} views`;
}

// likes

async function loadLikes(articleId) {

    const res =
        await fetch(
            `https://girlcroosh.silly-7f7.workers.dev/likes/${articleId}`
        );

    const data = await res.json();

    document.getElementById("likes")
        .textContent =
        `${data.count} likes`;
}

function setupLikes(articleId) {

    const button =
        document.getElementById("likes-button");

    if (!button) return;

    button.style.cursor = "pointer";

    button.addEventListener("click", async () => {

        const res =
            await fetch(
                `https://girlcroosh.silly-7f7.workers.dev/like/${articleId}`
            );

        const data =
            await res.json();

        document.getElementById("likes")
            .textContent =
            `${data.count} likes`;

    });

}