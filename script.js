const STORAGE_KEY = "swiftdrop_client_v1";
const SMS_API_BASE = localStorage.getItem("swiftdrop_sms_api") || "https://api.swiftdrop.ma";
const defaultState = {
  profile: { fullName: "", phone: "", phoneVerified: false, verifiedAt: null, addressType: "", addressData: {}, extraRiderInfo: "" },
  orders: [],
  ratings: [],
  favorites: [],
  notifications: [],
  settings: { language: "العربية" },
  adminConfig: { etaMinutes: 28 },
  pendingOtp: null,
};
const POIS = [
  {
    id: "mcd_tmr",
    name: "McDonald's تمارة",
    type: "restaurant",
    lat: 33.9196,
    lng: -6.9208,
    open: true,
    phone: "0537000000",
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600",
    promo: "خصم 10%",
    menu: {
      Burger: [
        { id: "m1", name: "بيغ ماك", price: 48, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400" },
        { id: "m2", name: "ماك تشيكن", price: 36, image: "https://images.unsplash.com/photo-1596662951482-0c4ba74a6df6?w=400" },
      ],
    },
  },
  {
    id: "kfc_rbt",
    name: "KFC الرباط",
    type: "restaurant",
    lat: 34.0204,
    lng: -6.8416,
    open: false,
    closedUntil: "غداً 10:00",
    phone: "0537111111",
    image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600",
    promo: "عرض عائلي",
    menu: {
      Sandwich: [
        { id: "k1", name: "زنجر", price: 42, image: "https://images.unsplash.com/photo-1606755962773-0efc782d6f2f?w=400" },
      ],
    },
  },
  {
    id: "bim_tmr",
    name: "BIM تمارة",
    type: "shop",
    lat: 33.9271,
    lng: -6.9068,
    open: true,
    phone: "0537222222",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600",
    promo: "توصيل مجاني",
    menu: {
      "مواد يومية": [
        { id: "b1", name: "حليب", price: 8, image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400" },
      ],
    },
  },
  {
    id: "mini_mkt",
    name: "Mini Market",
    type: "shop",
    lat: 33.9343,
    lng: -6.9172,
    open: true,
    phone: "0537333333",
    image: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600",
    menu: {
      Snacks: [{ id: "s1", name: "شيبس", price: 6, image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400" }],
    },
  },
];

const state = loadState();
let map;
let userMarker;
let userLatLng = null;
let accuracy = null;
let poiMarkers = [];
let selectedCategory = "all";
let currentView = "homeView";
let placeCart = {};
let wizard = { step: 1, pickup: null, dropoff: null, kind: "", name: "", details: "", weight: 1, addressType: "villa", addressData: {} };
let drawerCategory = "restaurant";
let mapSearchTerm = "";

const el = {
  app: document.getElementById("app"),
  splash: document.getElementById("splash"),
  map: document.getElementById("map"),
  gpsBanner: document.getElementById("gpsBanner"),
  nearbyList: document.getElementById("nearbyList"),
  placeSheet: document.getElementById("placeSheet"),
  wizardSheet: document.getElementById("wizardSheet"),
  toast: document.getElementById("toast"),
  trackingWidget: document.getElementById("trackingWidget"),
  categoryBar: document.getElementById("categoryBar"),
  exploreDrawer: document.getElementById("exploreDrawer"),
  drawerHandle: document.getElementById("drawerHandle"),
  drawerCats: document.getElementById("drawerCats"),
  drawerItems: document.getElementById("drawerItems"),
  mapSearchInput: document.getElementById("mapSearchInput"),
  drawerCloseBtn: document.getElementById("drawerCloseBtn"),
  notifPanel: document.getElementById("notifPanel"),
  notifList: document.getElementById("notifList"),
};

window.toast = toast;

init();

function init() {
  setupSplashFallback();
  initMap();
  bindUi();
  renderProfileForm();
  renderOrders();
  renderTrackingWidget();
  requestLocation();
  renderPois();
  renderNearby();
  renderDrawer();
  bindDrawerGesture();
  renderNotifications();
}

function setupSplashFallback() {
  const close = () => {
    el.splash.classList.add("hidden");
    el.app.classList.remove("hidden");
    setTimeout(() => map?.invalidateSize(), 60);
  };
  setTimeout(close, 700);
  window.addEventListener("load", () => setTimeout(close, 100));
}

function initMap() {
  map = L.map("map", { zoomControl: false, minZoom: 10, maxZoom: 14 }).setView([33.9716, -6.8498], 11);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    maxZoom: 14,
    attribution: "© OpenStreetMap / CARTO",
  }).addTo(map);

  map.on("movestart", () => el.categoryBar.classList.add("hidden-fade"));
  map.on("moveend", () => el.categoryBar.classList.remove("hidden-fade"));
}

function bindUi() {
  document.getElementById("notifBtn")?.addEventListener("click", () => {
    el.notifPanel.classList.toggle("hidden");
    renderNotifications();
  });
  document.getElementById("clearNotif")?.addEventListener("click", () => {
    state.notifications = [];
    saveState();
    renderNotifications();
  });

  document.getElementById("supportBtn").addEventListener("click", () => {
    const msg = encodeURIComponent("سلام، بغيت مساعدة فـ SwiftDrop.");
    window.open(`https://wa.me/212675150040?text=${msg}`, "_blank");
  });

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentView = btn.dataset.view;
      document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
      document.getElementById(currentView).classList.add("active");
      if (currentView !== "homeView") el.trackingWidget.classList.add("hidden");
      else renderTrackingWidget();
      setTimeout(() => map.invalidateSize(), 60);
    });
  });

  document.getElementById("locateBtn").addEventListener("click", () => {
    if (userLatLng) map.setView(userLatLng, 14);
    else requestLocation();
  });


  el.mapSearchInput?.addEventListener("input", (e) => {
    mapSearchTerm = String(e.target.value || "").trim().toLowerCase();
    renderPois();
    renderNearby();
    renderDrawer();
  });

  el.drawerCloseBtn?.addEventListener("click", () => {
    el.exploreDrawer?.classList.remove("expanded");
  });

  document.querySelectorAll(".cat-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.category === "special") return toast("خدمة التوصيل الخاصة ستكون متوفرة قريباً.");
      selectedCategory = btn.dataset.category;
      document.querySelectorAll(".cat-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderPois();
      renderNearby();
    });
  });
}

function requestLocation() {
  if (!navigator.geolocation) return showBanner("فعّل تحديد الموقع (GPS) باش يبانوا ليك الأماكن القريبة.");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLatLng = [pos.coords.latitude, pos.coords.longitude];
      accuracy = pos.coords.accuracy;
      map.setView(userLatLng, 14);
      setUserMarker();
      if (accuracy > 150) showBanner("الموقع غير دقيق", true);
      else hideBanner();
      renderNearby();
    },
    () => showBanner("فعّل تحديد الموقع (GPS) باش يبانوا ليك الأماكن القريبة."),
    { enableHighAccuracy: true, timeout: 8000 }
  );

  navigator.geolocation.watchPosition(
    (pos) => {
      userLatLng = [pos.coords.latitude, pos.coords.longitude];
      accuracy = pos.coords.accuracy;
      setUserMarker();
      if (accuracy > 150) showBanner("الموقع غير دقيق", true);
      renderNearby();
    },
    () => {
      if (hasActiveOrder()) showBanner("لقد فقدناك", true);
    }
  );
}

function setUserMarker() {
  const icon = L.divIcon({ className: "", html: `<div class="user-dot"></div>`, iconSize: [20, 20] });
  if (!userMarker) userMarker = L.marker(userLatLng, { icon }).addTo(map);
  else userMarker.setLatLng(userLatLng);
}

function filteredPois() {
  let list = POIS;
  if (selectedCategory === "restaurants") list = list.filter((p) => p.type === "restaurant");
  if (selectedCategory === "shops") list = list.filter((p) => p.type === "shop");
  if (mapSearchTerm) list = list.filter((p) => p.name.toLowerCase().includes(mapSearchTerm));
  return list;
}

function markerHtml(p) {
  const color = p.type === "restaurant" ? "#dc2626" : "#16a34a";
  return `<div class="poi-marker"><div class="poi-pin" style="background:${color}"></div><div class="poi-label">${p.name}</div></div>`;
}

function renderPois() {
  poiMarkers.forEach((m) => map.removeLayer(m));
  poiMarkers = [];
  filteredPois().forEach((p) => {
    const marker = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: "", html: markerHtml(p), iconSize: [120, 30], iconAnchor: [60, 15] }) }).addTo(map);
    marker.on("click", () => openPlaceSheet(p));
    poiMarkers.push(marker);
  });
}

function renderNearby() {
  const items = filteredPois().map((p) => ({ ...p, distance: userLatLng ? km(userLatLng, [p.lat, p.lng]) : null }));
  items.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
  const active = state.orders.find((o) => ["processing", "at_shop", "courier", "review"].includes(o.status));
  if (!items.length) {
    el.nearbyList.innerHTML = `<article class="near-card" style="min-width:100%"><div><h4>لا توجد نتائج</h4><p>جرّب اسم مطعم أو محل آخر.</p></div></article>`;
    return;
  }
  el.nearbyList.innerHTML = items
    .map((p) => {
      const closedClass = p.open ? "" : "closed-item";
      const act = active?.placeId === p.id ? "active-order" : "";
      return `<article class="near-card ${closedClass} ${act}" data-id="${p.id}">
        <img src="${p.image}" alt="${p.name}">
        <div><div class="row"><h4>${p.name}</h4><button class="fav-btn ${isFavorite(p.id) ? "on" : ""}" data-fav="${p.id}">${isFavorite(p.id) ? "♥" : "♡"}</button></div>
          ${p.promo ? `<span class="promo-badge">${p.promo}</span>` : ""}
          <p>${p.distance ? `km ${p.distance.toFixed(1)}` : "--"}</p>
          <p class="${p.open ? "" : "closed"}">${p.open ? "مفتوح" : "مغلق"}</p></div>
      </article>`;
    })
    .join("");

  el.nearbyList.querySelectorAll(".fav-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(btn.dataset.fav);
      renderNearby();
      renderDrawer();
    });
  });

  el.nearbyList.querySelectorAll(".near-card").forEach((card) => {
    card.addEventListener("click", () => {
      const place = POIS.find((p) => p.id === card.dataset.id);
      if (!place.open) return toast(`هذا المحل معلق حاليا، سيكون مفتوحا من ${place.closedUntil || "..."}`);
      openPlaceSheet(place);
      map.setView([place.lat, place.lng], 15);
    });
  });
}

function renderDrawer() {
  const categories = [
    { id: "restaurant", label: "مطاعم" },
    { id: "shop", label: "متاجر" },
    { id: "electronics", label: "أجهزة إلكترونية" },
    { id: "other", label: "أشياء أخرى" },
  ];
  el.drawerCats.innerHTML = categories
    .map((c) => `<button class="drawer-cat ${drawerCategory === c.id ? "active" : ""}" data-cat="${c.id}">${c.label}</button>`)
    .join("");

  const base = filteredPois().filter((p) => p.type === drawerCategory).map((p) => ({ name: p.name, image: p.image, placeId: p.id }));
  const extra = {
    electronics: [
      { name: "Electro Store", image: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=700" },
      { name: "Smart Gadgets", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=700" },
    ],
    other: [
      { name: "هدايا ومناسبات", image: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=700" },
      { name: "مستلزمات البيت", image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=700" },
    ],
  };
  const items = base.length ? base : (extra[drawerCategory] || []);
  el.drawerItems.innerHTML = items.map((it) => `<article class="drawer-card" data-place="${it.placeId || ""}"><img src="${it.image}" alt="${it.name}"><p>${it.name}</p><button class="fav-btn drawer-fav ${isFavorite(it.placeId) ? "on" : ""}" data-fav="${it.placeId || ""}">${isFavorite(it.placeId) ? "♥" : "♡"}</button></article>`).join("");

  el.drawerCats.querySelectorAll(".drawer-cat").forEach((btn) => {
    btn.onclick = () => {
      drawerCategory = btn.dataset.cat;
      renderDrawer();
    };
  });
  el.drawerItems.querySelectorAll(".drawer-fav").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      if (!btn.dataset.fav) return;
      toggleFavorite(btn.dataset.fav);
      renderNearby();
      renderDrawer();
    };
  });

  el.drawerItems.querySelectorAll(".drawer-card").forEach((card) => {
    card.onclick = () => {
      const place = POIS.find((p) => p.id === card.dataset.place);
      if (place) {
        map.setView([place.lat, place.lng], 15);
        openPlaceSheet(place);
      }
    };
  });
}

function bindDrawerGesture() {
  let startY = null;
  const drawer = el.exploreDrawer;
  if (!drawer) return;
  const start = (y) => (startY = y);
  const end = (y) => {
    if (startY == null) return;
    const diff = y - startY;
    if (diff < -22) drawer.classList.add("expanded");
    if (diff > 28) drawer.classList.remove("expanded");
    startY = null;
  };
  el.drawerHandle?.addEventListener("touchstart", (e) => start(e.touches[0].clientY), { passive: true });
  el.drawerHandle?.addEventListener("touchend", (e) => end(e.changedTouches[0].clientY), { passive: true });
  el.drawerHandle?.addEventListener("mousedown", (e) => start(e.clientY));
  window.addEventListener("mouseup", (e) => end(e.clientY));
}

function openPlaceSheet(place) {
  placeCart = placeCart[place.id] ? { [place.id]: placeCart[place.id] } : {};
  const avgRating = ratingAvg(place.id);
  el.placeSheet.classList.remove("hidden");
  el.placeSheet.innerHTML = `
    <button class="sheet-close" onclick="document.getElementById('placeSheet').classList.add('hidden')">✕</button>
    <img class="sheet-hero" src="${place.image}" alt="${place.name}">
    <div class="sheet-content">
      <div class="row">
        <div>
          <h3>${place.name}</h3>
          <div class="${place.open ? "badge-open" : "badge-closed"}">${place.open ? "مفتوح" : "مغلق"}</div>
          <div>★ ${avgRating.toFixed(1)}</div>
        </div>
        <div class="actions">
          <button onclick="window.open('tel:${place.phone}','_self')">اتصال</button>
          <button onclick="window.open('https://wa.me/212675150040?text='+encodeURIComponent('سلام ${place.name}'),'_blank')">WhatsApp</button>
        </div>
      </div>
      ${Object.entries(place.menu)
        .map(
          ([cat, list]) => `
            <h4>${cat}</h4>
            <div class="products">
              ${list
                .map(
                  (item) => `<div class="p-item">
                    <img src="${item.image}" alt="${item.name}" onclick='openLightbox("${item.image}")'>
                    <div><strong>${item.name}</strong></div>
                    <span class="price-tag">${item.price} د.م</span>
                    <button class="plus-btn" onclick='addToCart("${place.id}",${JSON.stringify(item)})'>+</button>
                  </div>`
                )
                .join("")}
            </div>`
        )
        .join("")}
      <div id="cartArea">${renderCartArea(place)}</div>
    </div>
  `;
}

function addToCart(placeId, item) {
  if (!placeCart[placeId]) placeCart[placeId] = [];
  placeCart[placeId].push(item);
  const place = POIS.find((p) => p.id === placeId);
  document.getElementById("cartArea").innerHTML = renderCartArea(place);
}
window.addToCart = addToCart;
window.openLightbox = (img) => {
  const box = document.createElement("div");
  box.className = "lightbox";
  box.innerHTML = `<div><img src="${img}"><div style="text-align:center"><button class="mini-btn" onclick="this.closest('.lightbox').remove()">إغلاق</button></div></div>`;
  document.body.appendChild(box);
};

function renderCartArea(place) {
  const items = placeCart[place.id] || [];
  if (!items.length) return "";
  const subtotal = items.reduce((a, b) => a + b.price, 0);
  const del = 10 + Math.max(0, ((userLatLng ? km(userLatLng, [place.lat, place.lng]) : 0) - 1));
  return `<div class="cart-bar">
    <div class="row"><strong>ثمن الطلب: ${subtotal.toFixed(0)} د.م</strong><span>ثمن التوصيل: ${del.toFixed(0)} د.م <button class="mini-btn" onclick="toast('ثمن التوصيل 10 دراهم، يرتفع 1 درهم لكل كيلومتر، وهذه الزيادة كاملة تذهب لعامل التوصيل.')">i</button></span></div>
    <div class="row"><span>المجموع: ${(subtotal + del).toFixed(0)} د.م</span><button onclick="confirmOrder('${place.id}')">تأكيد الطلب</button></div>
  </div>`;
}

function hasActiveOrder() {
  return state.orders.some((o) => ["processing", "at_shop", "courier", "review"].includes(o.status));
}

function confirmOrder(placeId) {
  if (hasActiveOrder()) return toast("لديك طلب جارٍ، لا يمكن إنشاء طلب جديد الآن.");
  if (!state.profile.phoneVerified) {
    toast("يجب تأكيد رقم الهاتف أولاً من صفحة الملف الشخصي.");
    document.querySelector('.nav-btn[data-view="profileView"]')?.click();
    return;
  }
  const place = POIS.find((p) => p.id === placeId);
  showProfileConfirm((profileData) => {
    const items = placeCart[placeId] || [];
    if (!items.length) return;
    const order = {
      id: crypto.randomUUID(),
      type: "store",
      placeId,
      placeName: place.name,
      items,
      total: items.reduce((a, b) => a + b.price, 0),
      status: "processing",
      createdAt: Date.now(),
      profileSnapshot: profileData,
    };
    state.orders.unshift(order);
    saveState();
    el.placeSheet.classList.add("hidden");
    renderOrders();
    renderNearby();
    renderTrackingWidget();
    pushNotification(`تم إنشاء طلب جديد من ${place.name}`);
    toast("جاري البحث عن موصل…");
  });
}
window.confirmOrder = confirmOrder;

function showProfileConfirm(onDone) {
  const p = state.profile;
  el.wizardSheet.classList.remove("hidden");
  el.wizardSheet.innerHTML = `<div class="sheet-content">
    <button class="sheet-close" onclick="document.getElementById('wizardSheet').classList.add('hidden')">✕</button>
    <h3>تأكيد المعلومات</h3>
    <form id="confirmForm" class="form">
      <label>كيفاش بغيتي نعيطو عليك؟<input name="fullName" required value="${p.fullName || ""}"></label>
      <label>رقم الهاتف (10 أرقام)<input name="phone" pattern="\\d{10}" required value="${p.phone || ""}"></label>
      ${addressFields(p.addressType || "villa", p.addressData || {}, true)}
      <label>معلومات إضافية لعامل التوصيل<textarea name="extraRiderInfo">${p.extraRiderInfo || ""}</textarea></label>
      <button>متابعة</button>
    </form>
  </div>`;
  const form = document.getElementById("confirmForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = collectProfileForm(form);
    if (!/^\d{10}$/.test(data.phone)) return toast("رقم الهاتف غير صالح");
    state.profile = data;
    saveState();
    el.wizardSheet.classList.add("hidden");
    onDone(data);
  });
}

function addressFields(type, data, includePicker) {
  return `
    ${
      includePicker
        ? `<label>نوع العنوان<select name="addressType"><option value="villa" ${type === "villa" ? "selected" : ""}>فيلا</option><option value="residence" ${type === "residence" ? "selected" : ""}>مجمع سكني</option><option value="office" ${type === "office" ? "selected" : ""}>مكتب</option></select></label>`
        : ""
    }
    <label>تفاصيل العنوان<textarea name="addressDetails" required>${JSON.stringify(data)}</textarea></label>
  `;
}

function collectProfileForm(form) {
  const fd = new FormData(form);
  let parsed = {};
  try { parsed = JSON.parse(fd.get("addressDetails") || "{}"); } catch { parsed = { raw: fd.get("addressDetails") }; }
  return {
    fullName: fd.get("fullName")?.trim(),
    phone: fd.get("phone")?.trim(),
    addressType: fd.get("addressType") || "villa",
    addressData: parsed,
    extraRiderInfo: fd.get("extraRiderInfo")?.trim() || "",
  };
}

function openSpecialWizard() {
  if (hasActiveOrder()) return toast("لا يمكن بدء طلب جديد أثناء وجود طلب جارٍ.");
  wizard = { step: 1, pickup: null, dropoff: null, kind: "restaurant", name: "", details: "", weight: 1, addressType: "villa", addressData: {} };
  el.wizardSheet.classList.remove("hidden");
  renderWizard();
}

function renderWizard() {
  const s = wizard.step;
  if (s === 1) {
    el.wizardSheet.innerHTML = `<div class="sheet-content"><button class="sheet-close" onclick="closeWizard()">✕</button><h3>من أين تريد أن يأتي الطلب؟</h3><p>اضغط على الخريطة لاختيار نقطة الاستلام.</p><button class="primary-btn" onclick="wizardNextPickup()">تأكيد</button></div>`;
    map.once("click", (e) => {
      wizard.pickup = e.latlng;
      toast("تم تحديد نقطة الاستلام");
    });
  }
  if (s === 2) {
    el.wizardSheet.innerHTML = `<div class="sheet-content"><button class="sheet-close" onclick="closeWizard()">✕</button>
      <h3>تفاصيل الطلب</h3>
      <form id="wiz2" class="form">
        <label>هل هذا مطعم أو محل أو شيء آخر؟
          <select name="kind"><option value="restaurant">مطعم</option><option value="shop">محل</option><option value="other">شيء آخر</option></select>
        </label>
        <label>اسم المكان<input name="name" required></label>
        <label>شنو طلب ديالك؟<textarea name="details" required></textarea></label>
        <label>الوزن التقديري (kg)<input name="weight" type="number" max="10" min="0.1" step="0.1" required value="1"></label>
        <button>التالي</button>
      </form></div>`;
    document.getElementById("wiz2").onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      wizard.kind = fd.get("kind"); wizard.name = fd.get("name"); wizard.details = fd.get("details"); wizard.weight = Number(fd.get("weight"));
      if (wizard.weight > 10) return toast("الحد الأقصى للوزن هو 10kg");
      wizard.step = 3; renderWizard();
    };
  }
  if (s === 3) {
    el.wizardSheet.innerHTML = `<div class="sheet-content"><button class="sheet-close" onclick="closeWizard()">✕</button><h3>فين بغيتيه يوصل؟</h3><p>اضغط على الخريطة لاختيار نقطة التوصيل.</p><button class="primary-btn" onclick="wizardNextDropoff()">تأكيد</button></div>`;
    map.once("click", (e) => {
      wizard.dropoff = e.latlng;
      toast("تم تحديد نقطة التوصيل");
    });
  }
  if (s === 4) {
    el.wizardSheet.innerHTML = `<div class="sheet-content"><button class="sheet-close" onclick="closeWizard()">✕</button>
    <h3>تفاصيل العنوان</h3>
    <form id="wiz4" class="form">
      ${addressFields("villa", {}, true)}
      <button>إرسال الطلب</button>
    </form></div>`;
    document.getElementById("wiz4").onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      wizard.addressType = fd.get("addressType");
      try { wizard.addressData = JSON.parse(fd.get("addressDetails")); } catch { wizard.addressData = { raw: fd.get("addressDetails") }; }
      createSpecialOrder();
    };
  }
  if (s === 5) {
    el.wizardSheet.innerHTML = `<div class="sheet-content"><button class="sheet-close" onclick="closeWizard()">✕</button><h3>طلبك تحت مراجعة</h3><p>تم إنشاء الطلب بنجاح.</p></div>`;
  }
}

function wizardNextPickup() {
  if (!wizard.pickup) return toast("يرجى تحديد نقطة الاستلام على الخريطة");
  wizard.step = 2; renderWizard();
}
window.wizardNextPickup = wizardNextPickup;

function wizardNextDropoff() {
  if (!wizard.dropoff) return toast("يرجى تحديد نقطة التوصيل على الخريطة");
  const d = km([wizard.pickup.lat, wizard.pickup.lng], [wizard.dropoff.lat, wizard.dropoff.lng]);
  if (d > 15) return toast("المسافة تتجاوز 15km، لا يمكن المتابعة.");
  wizard.step = 4; renderWizard();
}
window.wizardNextDropoff = wizardNextDropoff;
window.closeWizard = () => el.wizardSheet.classList.add("hidden");

function createSpecialOrder() {
  const order = {
    id: crypto.randomUUID(),
    type: "special",
    placeName: wizard.name,
    pickup: wizard.pickup,
    dropoff: wizard.dropoff,
    weight: wizard.weight,
    details: wizard.details,
    status: "review",
    createdAt: Date.now(),
    profileSnapshot: state.profile,
    addressType: wizard.addressType,
    addressData: wizard.addressData,
  };
  state.orders.unshift(order);
  saveState();
  wizard.step = 5;
  renderWizard();
  renderOrders();
  renderTrackingWidget();
  toast("جاري البحث عن موصل…");
}

function renderTrackingWidget() {
  if (currentView !== "homeView") return;
  const active = state.orders.find((o) => ["processing", "at_shop", "courier", "review"].includes(o.status));
  if (!active) return el.trackingWidget.classList.add("hidden");
  const etaMin = Number(state.adminConfig?.etaMinutes ?? 28);
  const progress = Math.min(100, Math.max(10, Math.round(((40 - Math.min(40, etaMin)) / 40) * 100)));
  const stepIdx = active.status === "processing" || active.status === "review" ? 1 : active.status === "at_shop" ? 2 : 3;
  el.trackingWidget.classList.remove("hidden");
  el.trackingWidget.innerHTML = `
    <div class="tracking-top">
      <div>
        <strong>متابعة الطلب</strong>
        <div style="font-size:.78rem;color:#64748b">الوقت المتوقع للوصول</div>
      </div>
      <div class="eta-circle" style="--deg:${Math.round((progress / 100) * 360)}deg" data-min="${etaMin}"></div>
    </div>
    <div class="track-steps">
      <div class="step-dot ${stepIdx >= 1 ? "active" : ""}">جاري معالجة الطلب</div>
      <div class="step-dot ${stepIdx >= 2 ? "active" : ""}">المحل</div>
      <div class="step-dot ${stepIdx >= 3 ? "active" : ""}">عامل التوصيل</div>
    </div>
    <div class="track-line"></div>`;
}

function renderOrders() {
  const c = document.getElementById("ordersList");
  if (!state.orders.length) return (c.innerHTML = "<p>لا توجد طلبات بعد.</p>");
  c.innerHTML = state.orders
    .map((o) => {
      const canRate = o.status === "delivered" && Date.now() - (o.deliveredAt || 0) > 30 * 60 * 1000;
      return `<article class="near-card" style="margin-bottom:8px;min-width:100%">
        <div><h4>${o.type === "special" ? "توصيل خاص" : o.placeName}</h4><p>${statusLabel(o.status)}</p></div>
        <div>${canRate && !o.rated ? `<button class='mini-btn' onclick='rateOrder("${o.id}")'>تقييم</button>` : ""}</div>
      </article>`;
    })
    .join("");
}

window.rateOrder = (id) => {
  const val = prompt("التقييم من 1 إلى 5");
  if (!val) return;
  const n = Number(val);
  if (n < 1 || n > 5) return toast("قيمة غير صالحة");
  const reason = prompt("سبب التقييم (اختياري)") || "";
  const ord = state.orders.find((o) => o.id === id);
  ord.rated = true;
  state.ratings.push({ placeId: ord.placeId, stars: n, reason, at: Date.now() });
  saveState();
  renderOrders();
};

function statusLabel(s) {
  return {
    processing: "جاري المعالجة",
    at_shop: "في المحل",
    courier: "مع عامل التوصيل",
    review: "تحت مراجعة",
    delivered: "تم التوصيل",
  }[s] || s;
}

function renderProfileForm() {
  const form = document.getElementById("profileForm");
  const p = state.profile;
  const firstLetter = (p.fullName?.trim()?.[0] || "ا").toUpperCase();
  const language = state.settings?.language || "العربية";
  const phoneValid = /^\d{10}$/.test(p.phone || "");
  const verified = phoneValid && p.phoneVerified ? "مؤكد" : "غير مؤكد";
  form.innerHTML = `
    <section class="profile-hero">
      <div class="profile-cover"></div>
      <div class="profile-avatar-wrap">
        <div class="profile-avatar">${firstLetter}</div>
      </div>
      <div class="profile-head-text">
        <strong>${p.fullName || "عميل SwiftDrop"}</strong>
        <p class="profile-sub">${p.phone || "أضف رقم هاتفك لتأكيد الحساب"}</p>
      </div>
    </section>

    <section class="verify-card ${verified === "مؤكد" ? "ok" : "pending"}">
      <div>
        <strong>تأكيد رقم الهاتف</strong>
        <p>الحالة: ${verified}</p>
        <p class="verify-hint">${verified === "مؤكد" ? "تم التحقق بنجاح" : "يمكنك التحقق الآن برسالة نصية"}</p>
      </div>
      <button type="button" class="mini-btn" onclick="startPhoneVerification()">${verified === "مؤكد" ? "تم التحقق" : "تحقق برسالة"}</button>
    </section>

    <label>الاسم الكامل<input name="fullName" required value="${p.fullName || ""}"></label>
    <label>رقم الهاتف<input name="phone" pattern="\\d{10}" required value="${p.phone || ""}"></label>
    ${addressFields(p.addressType || "villa", p.addressData || {}, true)}
    <label>معلومات إضافية لعامل التوصيل<textarea name="extraRiderInfo">${p.extraRiderInfo || ""}</textarea></label>
    <label>اللغة
      <select name="language">
        <option value="العربية" ${language === "العربية" ? "selected" : ""}>العربية</option>
        <option value="Français" ${language === "Français" ? "selected" : ""}>Français</option>
      </select>
    </label>
    <button>حفظ المعلومات</button>`;

  form.onsubmit = (e) => {
    e.preventDefault();
    const data = collectProfileForm(form);
    if (!/^\d{10}$/.test(data.phone)) return toast("رقم الهاتف يجب أن يكون 10 أرقام");
    const previousPhone = state.profile.phone || "";
    state.profile = { ...state.profile, ...data };
    if (data.phone !== previousPhone) {
      state.profile.phoneVerified = false;
      state.profile.verifiedAt = null;
    }
    state.settings = {
      language: new FormData(form).get("language") || "العربية",
    };
    saveState();
    renderProfileForm();
    toast("تم حفظ الملف الشخصي بنجاح");
  };

  const menu = document.createElement("section");
  menu.className = "profile-menu";
  menu.innerHTML = `
    <button type="button" class="profile-menu-item" data-action="history">سجل الطلبات <span>›</span></button>
    <button type="button" class="profile-menu-item" data-action="faq">الأسئلة الشائعة <span>›</span></button>
    <button type="button" class="profile-menu-item" data-action="privacy">بيانات تسجيل الدخول <span>›</span></button>
    <button type="button" class="profile-menu-item" data-action="addresses">إدارة العناوين <span>›</span></button>
    <button type="button" class="profile-menu-item" data-action="support">تواصل مع الدعم <span>›</span></button>
    <button type="button" class="profile-menu-item" data-action="about">لمحة عن التطبيق <span>›</span></button>
    <button type="button" class="profile-menu-item" data-action="logout">تسجيل الخروج <span>›</span></button>
    <button type="button" class="profile-menu-item danger" data-action="delete">حذف الحساب <span>›</span></button>
  `;
  form.appendChild(menu);

  menu.querySelectorAll(".profile-menu-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      if (action === "history") return toast(`إجمالي الطلبات: ${state.orders.length}`);
      if (action === "faq") return toast("الأسئلة الشائعة ستكون متاحة في التحديث القادم.");
      if (action === "privacy") return toast("بيانات تسجيل الدخول محمية محلياً في هذا النموذج.");
      if (action === "addresses") return toast("إدارة عناوين متعددة ستتوفر قريباً.");
      if (action === "support") return window.open("https://wa.me/212675150040?text=" + encodeURIComponent("سلام، بغيت مساعدة فـ SwiftDrop."), "_blank");
      if (action === "about") return toast("SwiftDrop - نسخة العميل التجريبية.");
      if (action === "logout") return toast("تم تسجيل الخروج (نموذج أولي).");
      if (action === "delete") return toast("حذف الحساب سيتوفر بعد ربط صفحة الإدارة.");
    });
  });
}


function startPhoneVerification() {
  const phone = state.profile.phone?.trim() || "";
  if (!/^\d{10}$/.test(phone)) return toast("أدخل رقم هاتف صحيح (10 أرقام) ثم احفظ المعلومات.");
  if (state.profile.phoneVerified) return toast("رقم الهاتف مؤكد بالفعل.");
  openOtpSheet(phone);
}
window.startPhoneVerification = startPhoneVerification;

function openOtpSheet(phone) {
  el.wizardSheet.classList.remove("hidden");
  const cooldown = Math.max(0, Math.ceil(((state.pendingOtp?.cooldownUntil || 0) - Date.now()) / 1000));
  el.wizardSheet.innerHTML = `<div class="sheet-content">
    <button class="sheet-close" onclick="document.getElementById('wizardSheet').classList.add('hidden')">✕</button>
    <h3>تأكيد رقم الهاتف</h3>
    <p>سوف نرسل رمز SMS إلى ${phone}</p>
    <form id="otpForm" class="form">
      <label>رمز التحقق (6 أرقام)<input name="otp" pattern="\\d{6}" placeholder="123456"></label>
      <div class="row">
        <button type="button" class="mini-btn" id="sendOtpBtn">${cooldown ? `إعادة الإرسال بعد ${cooldown}s` : "إرسال الرمز"}</button>
        <button>تأكيد</button>
      </div>
    </form>
  </div>`;

  const sendBtn = document.getElementById("sendOtpBtn");
  const setCooldownLabel = () => {
    const left = Math.max(0, Math.ceil(((state.pendingOtp?.cooldownUntil || 0) - Date.now()) / 1000));
    sendBtn.disabled = left > 0;
    sendBtn.textContent = left ? `إعادة الإرسال بعد ${left}s` : "إرسال الرمز";
  };
  setCooldownLabel();
  const timer = setInterval(setCooldownLabel, 1000);
  el.wizardSheet.addEventListener("transitionend", () => {
    if (el.wizardSheet.classList.contains("hidden")) clearInterval(timer);
  }, { once: true });

  sendBtn.onclick = async () => {
    const left = Math.max(0, Math.ceil(((state.pendingOtp?.cooldownUntil || 0) - Date.now()) / 1000));
    if (left > 0) return toast(`انتظر ${left} ثانية قبل إعادة الإرسال`);
    const res = await sendOtpApi(phone);
    if (!res.ok) return toast(res.message || "تعذر إرسال الرمز حالياً");
    state.pendingOtp = { phone, requestId: res.requestId || null, cooldownUntil: Date.now() + 30_000, expiresAt: Date.now() + 5 * 60_000 };
    saveState();
    setCooldownLabel();
    toast("تم إرسال رمز التحقق بنجاح");
  };

  document.getElementById("otpForm").onsubmit = async (e) => {
    e.preventDefault();
    const otp = new FormData(e.target).get("otp")?.toString().trim();
    if (!/^\d{6}$/.test(otp || "")) return toast("الرمز يجب أن يكون 6 أرقام");
    const pending = state.pendingOtp;
    if (!pending || pending.phone !== phone) return toast("أرسل الرمز أولاً");
    if (Date.now() > pending.expiresAt) return toast("انتهت صلاحية الرمز، أعد الإرسال");
    const verify = await verifyOtpApi(phone, otp, pending.requestId);
    if (!verify.ok) return toast(verify.message || "رمز غير صحيح");
    state.profile.phoneVerified = true;
    state.profile.verifiedAt = Date.now();
    state.pendingOtp = null;
    saveState();
    el.wizardSheet.classList.add("hidden");
    renderProfileForm();
    pushNotification("تم تأكيد رقم الهاتف بنجاح");
  toast("تم تأكيد رقم الهاتف بنجاح ✅");
  };
}

async function sendOtpApi(phone) {
  try {
    const r = await fetch(`${SMS_API_BASE}/otp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    if (!r.ok) return { ok: false, message: "فشل إرسال الرسالة النصية" };
    const data = await r.json().catch(() => ({}));
    return { ok: true, requestId: data.requestId };
  } catch {
    return { ok: false, message: "خدمة SMS غير متاحة الآن (تحتاج ربط backend)." };
  }
}

async function verifyOtpApi(phone, code, requestId) {
  try {
    const r = await fetch(`${SMS_API_BASE}/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code, requestId }),
    });
    if (!r.ok) return { ok: false, message: "الرمز غير صحيح أو منتهي" };
    return { ok: true };
  } catch {
    return { ok: false, message: "تعذر التحقق حالياً، تحقق من backend." };
  }
}


function isFavorite(id) {
  return !!id && state.favorites.includes(id);
}

function toggleFavorite(id) {
  if (!id) return;
  if (state.favorites.includes(id)) {
    state.favorites = state.favorites.filter((x) => x !== id);
    pushNotification("تمت إزالة عنصر من المفضلة");
  } else {
    state.favorites.push(id);
    pushNotification("تمت إضافة عنصر إلى المفضلة");
  }
  saveState();
}
window.toggleFavorite = toggleFavorite;

function pushNotification(message) {
  state.notifications.unshift({ id: crypto.randomUUID(), message, at: Date.now() });
  state.notifications = state.notifications.slice(0, 15);
  saveState();
  renderNotifications();
}

function renderNotifications() {
  const countEl = document.getElementById("notifCount");
  if (!el.notifList) return;
  const list = state.notifications || [];
  if (!list.length) {
    el.notifList.innerHTML = "<p class='notif-empty'>لا توجد إشعارات بعد.</p>";
    countEl?.classList.add("hidden");
  } else {
    el.notifList.innerHTML = list.map((n) => `<article class='notif-item'><p>${n.message}</p><small>${new Date(n.at).toLocaleTimeString('fr-MA')}</small></article>`).join("");
    if (countEl) { countEl.textContent = String(list.length); countEl.classList.remove("hidden"); }
  }
}

function ratingAvg(placeId) {
  const arr = state.ratings.filter((r) => r.placeId === placeId);
  if (!arr.length) return 4.5;
  return arr.reduce((a, b) => a + b.stars, 0) / arr.length;
}

function km(a, b) {
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function showBanner(msg, warn = false) {
  el.gpsBanner.textContent = msg;
  el.gpsBanner.classList.remove("hidden", "warn");
  if (warn) el.gpsBanner.classList.add("warn");
}
function hideBanner() { el.gpsBanner.classList.add("hidden"); }

function toast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.remove("hidden");
  setTimeout(() => el.toast.classList.add("hidden"), 2500);
}

function loadState() {
  try {
    return { ...defaultState, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
