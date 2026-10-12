/**
 * Avid shop: UI logic.
 * Product grid, product popup, cart drawer, checkout validation,
 * mobile menu, quick-contact button, newsletter and scroll reveal.
 * Requires js/products.js to be loaded first (defines window.PRODUCTS).
 */
(function () {
  "use strict";

  const STORAGE_KEY = "avid-cart";
  const MAX_QTY = 99;
  const TOAST_MS = 3500;

  const products = window.PRODUCTS || [];
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Number(n).toLocaleString("fa-IR");
  const findProduct = (id) => products.find((p) => String(p.id) === String(id));
  const clamp = (n) => Math.max(1, Math.min(MAX_QTY, n));

  /* ---------- State ---------- */

  let cart = loadCart();
  let modalId = null;
  let toastTimer = null;
  const picks = {}; // quantity chosen on each card before adding
  products.forEach((p) => { picks[p.id] = 1; });

  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (err) {
      return {};
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (err) {
      /* storage unavailable: the cart simply lives in memory */
    }
  }

  /* ---------- Rendering ---------- */

  function stepper(attr, id, qty, plus, minus) {
    return (
      '<div class="step" ' + attr + '="' + id + '">' +
        '<button data-a="' + plus + '" aria-label="بیشتر">+</button>' +
        "<b>" + fmt(qty) + "</b>" +
        '<button data-a="' + minus + '" aria-label="کمتر">−</button>' +
      "</div>"
    );
  }

  function productCard(p) {
    const tag = p.badge ? '<span class="tag">' + p.badge + "</span>" : "";
    return (
      '<article class="card rv">' +
        '<button class="pic" data-detail="' + p.id + '" aria-label="جزئیات ' + p.name + '">' +
          '<img src="' + p.img + '" alt="' + p.name + '" loading="lazy">' + tag +
        "</button>" +
        '<div class="info">' +
          "<h3>" + p.name + "</h3>" +
          "<p>" + p.desc + "</p>" +
          '<button class="more" data-detail="' + p.id + '">جزئیات محصول</button>' +
          '<div class="buy">' +
            '<div class="price">' + fmt(p.price) + " <small>" + p.unit + "</small></div>" +
            stepper("data-id", p.id, picks[p.id], "plus", "minus") +
          "</div>" +
          '<button class="add" data-add="' + p.id + '">افزودن به سبد</button>' +
        "</div>" +
      "</article>"
    );
  }

  function renderProducts() {
    $("grid").innerHTML = products.map(productCard).join("");
    observeReveal();
  }

  function renderCart() {
    let qty = 0;
    let sum = 0;

    const rows = Object.keys(cart).map((id) => {
      const p = findProduct(id);
      qty += cart[id];
      sum += cart[id] * p.price;
      return (
        '<div class="row2">' +
          "<div><h4>" + p.name + "</h4>" +
          "<small>" + fmt(p.price) + " " + p.unit + "</small><br>" +
          '<button class="rm" data-rm="' + id + '">حذف</button></div>' +
          stepper("data-cid", id, cart[id], "cplus", "cminus") +
        "</div>"
      );
    });

    $("items").innerHTML = rows.join("") || '<div class="empty">سبد خرید شما خالی است.</div>';
    $("count").textContent = fmt(qty);
    $("barCount").textContent = fmt(qty);
    $("total").textContent = fmt(sum) + " تومان";
    $("barTotal").textContent = fmt(sum) + " تومان";
    $("go").disabled = qty === 0;
    $("foot").style.display = "";
    document.body.classList.toggle("has-cart", qty > 0);
  }

  function bumpCounter() {
    const el = $("count");
    el.classList.remove("bump");
    void el.offsetWidth; // restart the animation
    el.classList.add("bump");
  }

  /* ---------- Drawer, modal, toast ---------- */

  function setDrawer(open) {
    $("drawer").classList.toggle("on", open);
    $("shade").classList.toggle("on", open);
    $("drawer").setAttribute("aria-hidden", String(!open));
    if (open) $("close").focus();
  }

  function openModal(id) {
    const p = findProduct(id);
    if (!p) return;
    modalId = id;
    $("mImg").src = p.img;
    $("mImg").alt = p.name;
    $("mTitle").textContent = p.name;
    $("mDesc").textContent = p.desc;
    $("mPrice").innerHTML = fmt(p.price) + " <small>" + p.unit + "</small>";
    $("mDetails").innerHTML = Object.keys(p.details || {})
      .map((k) => "<dt>" + k + "</dt><dd>" + p.details[k] + "</dd>")
      .join("");
    $("modal").classList.add("on");
    $("modal").setAttribute("aria-hidden", "false");
    $("mClose").focus();
  }

  function closeModal() {
    $("modal").classList.remove("on");
    $("modal").setAttribute("aria-hidden", "true");
  }

  function showToast(message) {
    $("toastMsg").textContent = message;
    $("toast").classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("toast").classList.remove("on"), TOAST_MS);
  }

  /* ---------- Scroll reveal ---------- */

  let observer = null;

  function observeReveal() {
    const targets = document.querySelectorAll(".rv:not(.in)");

    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("in"));
      return;
    }

    observer = observer || new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    targets.forEach((el) => observer.observe(el));
  }

  /* ---------- Cart actions ---------- */

  function addToCart(id, qty) {
    cart[id] = Math.min(MAX_QTY, (cart[id] || 0) + qty);
    picks[id] = 1;
    saveCart();
    renderProducts();
    renderCart();
    bumpCounter();
    showToast("«" + findProduct(id).name + "» به سبد اضافه شد");
  }

  function handleStepper(action, stepEl) {
    const id = stepEl.dataset.id || stepEl.dataset.cid;

    if (action === "plus") { picks[id] = clamp(picks[id] + 1); renderProducts(); }
    if (action === "minus") { picks[id] = clamp(picks[id] - 1); renderProducts(); }
    if (action === "cplus") { cart[id] = clamp(cart[id] + 1); saveCart(); renderCart(); }
    if (action === "cminus") {
      cart[id] -= 1;
      if (cart[id] < 1) delete cart[id];
      saveCart();
      renderCart();
    }
  }

  /* ---------- Checkout validation ---------- */

  function toLatinDigits(str) {
    return str
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
  }

  function setError(field, message) {
    $(field).classList.toggle("bad", Boolean(message));
    $("e-" + field).textContent = message || "";
    return !message;
  }

  function validateOrder() {
    const phone = toLatinDigits($("phone").value.replace(/\s/g, ""));
    const results = [
      setError("name", $("name").value.trim().length < 3 ? "نام و نام خانوادگی را وارد کنید." : ""),
      setError("phone", /^(\+98|0)?9\d{9}$/.test(phone) ? "" : "شماره موبایل معتبر نیست، مثل ۰۹۱۲۰۰۰۰۰۰۰."),
      setError("addr", $("addr").value.trim().length < 8 ? "آدرس تحویل را کامل‌تر بنویسید." : "")
    ];
    return results.every(Boolean);
  }

  function submitOrder() {
    if (!validateOrder()) return;

    // TODO: send `cart`, the form values and the chosen payment method to the backend here.
    cart = {};
    saveCart();
    renderCart();
    $("items").innerHTML =
      '<div class="ok"><b>سفارش شما ثبت شد</b>به‌زودی برای هماهنگی با شما تماس می‌گیریم.</div>';
    $("foot").style.display = "none";
  }

  /* ---------- Events ---------- */

  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, a, [data-a]") || e.target;

    if (t.dataset.a) handleStepper(t.dataset.a, t.closest(".step"));
    if (t.dataset.add) addToCart(t.dataset.add, picks[t.dataset.add]);
    if (t.dataset.detail) openModal(t.dataset.detail);
    if (t.dataset.rm) { delete cart[t.dataset.rm]; saveCart(); renderCart(); }

    if (!e.target.closest("#fab")) $("fab").classList.remove("on");
    if (e.target === $("modal")) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    setDrawer(false);
    closeModal();
  });

  $("open").addEventListener("click", () => setDrawer(true));
  $("cartbar").addEventListener("click", () => setDrawer(true));
  $("toastOpen").addEventListener("click", () => { $("toast").classList.remove("on"); setDrawer(true); });
  $("close").addEventListener("click", () => setDrawer(false));
  $("shade").addEventListener("click", () => setDrawer(false));
  $("mClose").addEventListener("click", closeModal);
  $("mAdd").addEventListener("click", () => { addToCart(modalId, 1); closeModal(); });
  $("go").addEventListener("click", submitOrder);
  ["name", "phone", "addr"].forEach((id) => $(id).addEventListener("input", () => setError(id, "")));

  /* Mobile menu */
  function setMenu(open) {
    document.body.classList.toggle("nav-open", open);
    $("menu").setAttribute("aria-expanded", String(open));
  }
  $("menu").addEventListener("click", () => setMenu(!document.body.classList.contains("nav-open")));
  $("nav").addEventListener("click", (e) => { if (e.target.tagName === "A") setMenu(false); });

  /* Quick contact button */
  $("fabBtn").addEventListener("click", () => {
    const on = $("fab").classList.toggle("on");
    $("fabBtn").setAttribute("aria-expanded", String(on));
  });

  /* Newsletter (front-end only) */
  $("nlgo").addEventListener("click", () => {
    if (!$("nl").value.trim()) { $("nl").focus(); return; }
    // TODO: send the value to the backend / mailing service here.
    $("newsForm").innerHTML = '<p class="news-ok">عضویت شما ثبت شد. ممنون!</p>';
  });

  /* ---------- Init ---------- */

  renderProducts();
  renderCart();
  observeReveal();
})();
