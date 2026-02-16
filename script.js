const appState = {
  map: null,
  userMarker: null,
  userLocation: null,
  markers: [],
  places: [],
  category: "restaurants",
  cart: [],
  currentPlace: null,
  orderInProgress: false,
  deliveryBase: 10,
  deliveryPerKm: 1,
};

const elements = {
  splash: document.getElementById("splash"),
  map: document.getElementById("map"),
  gpsBanner: document.getElementById("gpsBanner"),
  locateBtn: document.getElementById("locateBtn"),
  categoryOverlay: document.getElementById("categoryOverlay"),
  placesStrip: document.getElementById("placesStrip"),
  placesTrack: document.getElementById("placesTrack"),
  toast: document.getElementById("toast"),
  restaurantSheet: document.getElementById("restaurantSheet"),
  closeSheet: document.getElementById("closeSheet"),
  sheetImage: document.getElementById("sheetImage"),
  sheetName: document.getElementById("sheetName"),
  callBtn: document.getElementById("callBtn"),
  waBtn: document.getElementById("waBtn"),
  menuContainer: document.getElementById("menuContainer"),
  cartBanner: document.getElementById("cartBanner"),
  itemsTotal: document.getElementById("itemsTotal"),
  deliveryTotal: document.getElementById("deliveryTotal"),
  finalTotal: document.getElementById("finalTotal"),
  confirmOrder: document.getElementById("confirmOrder"),
  deliveryInfo: document.getElementById("deliveryInfo"),
  orderModal: document.getElementById("orderModal"),
  orderForm: document.getElementById("orderForm"),
  closeOrderModal: document.getElementById("closeOrderModal"),
  closedAlert: document.getElementById("closedAlert"),
  closeClosedAlert: document.getElementById("closeClosedAlert"),
  orderStatus: document.getElementById("orderStatus"),
  supportBtn: document.getElementById("supportBtn"),
  openSettings: document.getElementById("openSettings"),
  settingsSheet: document.getElementById("settingsSheet"),
  closeSettings: document.getElementById("closeSettings"),
  locationLabel: document.getElementById("locationLabel"),
};

const FALLBACK_PLACES = {
  restaurants: [
    {
      id: "mc-temara",
      name: "McDonald's Témara",
      lat: 33.9304,
      lng: -6.9068,
      type: "restaurant",
      image: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=200&q=80",
      open: true,
    },
    {
      id: "kfc-rabat",
      name: "KFC Rabat",
      lat: 34.0155,
      lng: -6.8326,
      type: "restaurant",
      image: "https://images.unsplash.com/photo-1521305916504-4a1121188589?auto=format&fit=crop&w=200&q=80",
      open: true,
    },
    {
      id: "pizzahut-rabat",
      name: "Pizza Hut Rabat",
      lat: 34.0078,
      lng: -6.8321,
      type: "restaurant",
      image: "https://images.unsplash.com/photo-1548365328-9f5476f8e5bd?auto=format&fit=crop&w=200&q=80",
      open: false,
    },
  ],
  shops: [
    {
      id: "bim-temara",
      name: "BIM Témara",
      lat: 33.9247,
      lng: -6.9079,
      type: "shop",
      image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80",
      open: true,
    },
    {
      id: "marjane-hayriad",
      name: "Marjane Hay Riad",
      lat: 34.0022,
      lng: -6.8613,
      type: "shop",
      image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80",
      open: false,
    },
  ],
};

const MENU_SECTIONS = [
  {
    title: "Pizza",
    items: [
      {
        name: "Pizza Margherita",
        price: 45,
        image: "https://images.unsplash.com/photo-1548365328-9f5476f8e5bd?auto=format&fit=crop&w=200&q=80",
      },
      {
        name: "Pizza Pepperoni",
        price: 55,
        image: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=200&q=80",
      },
    ],
  },
  {
    title: "Burgers",
    items: [
      {
        name: "Classic Burger",
        price: 38,
        image: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=200&q=80",
      },
      {
        name: "Chicken Burger",
        price: 40,
        image: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=200&q=80",
      },
    ],
  },
  {
    title: "Boissons",
    items: [
      {
        name: "Jus frais",
        price: 18,
        image: "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=200&q=80",
      },
      {
        name: "Soda",
        price: 12,
        image: "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=200&q=80",
      },
    ],
  },
];

const CATEGORY_CONFIG = {
  restaurants: {
    query: "[out:json][timeout:15];(node[amenity~'restaurant|fast_food|cafe'](around:4500,33.93,-6.90););out;",
    fallback: FALLBACK_PLACES.restaurants,
  },
  shops: {
    query:
      "[out:json][timeout:15];(node[shop~'supermarket|convenience|mall|bakery|grocery'](around:4500,33.93,-6.90););out;",
    fallback: FALLBACK_PLACES.shops,
  },
};

const distanceBetween = (a, b) => {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(h));
};

const showToast = (message) => {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  setTimeout(() => elements.toast.classList.remove("show"), 2400);
};

const toggleOverlayVisibility = (hidden) => {
  elements.categoryOverlay.classList.toggle("hidden", hidden);
  elements.placesStrip.classList.toggle("hidden", hidden);
};

const initMap = () => {
  appState.map = L.map("map", {
    zoomControl: false,
    preferCanvas: true,
    zoomAnimation: true,
    fadeAnimation: true,
    markerZoomAnimation: true,
    inertia: true,
    inertiaDeceleration: 2800,
  }).setView([33.93, -6.9], 12.5);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    maxZoom: 19,
    updateWhenZooming: false,
    keepBuffer: 4,
  }).addTo(appState.map);

  appState.map.on("movestart", () => toggleOverlayVisibility(true));
  appState.map.on("moveend", () => toggleOverlayVisibility(false));

  requestLocation();
};

const requestLocation = () => {
  if (!navigator.geolocation) {
    elements.gpsBanner.classList.add("show");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      appState.userLocation = { lat: latitude, lng: longitude };
      elements.gpsBanner.classList.remove("show");
      elements.locationLabel.textContent = "Position actuelle";
      appState.map.flyTo([latitude, longitude], 13, {
        animate: true,
        duration: 0.75,
      });

      if (appState.userMarker) {
        appState.userMarker.setLatLng([latitude, longitude]);
      } else {
        appState.userMarker = L.marker([latitude, longitude], {
          icon: L.divIcon({
            className: "user-location-marker",
            html: '<div class="user-dot"></div><div class="user-pulse"></div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
        }).addTo(appState.map);
      }

      renderPlacesStrip();
    },
    () => {
      elements.gpsBanner.classList.add("show");
    },
    { enableHighAccuracy: true, timeout: 6000 }
  );
};

const createMarker = (place) => {
  const marker = L.circleMarker([place.lat, place.lng], {
    radius: 9,
    color: place.open ? "#ff7a00" : "#9ca3af",
    fillColor: place.open ? "#ffb067" : "#cbd5f5",
    fillOpacity: place.open ? 0.9 : 0.4,
  }).addTo(appState.map);

  marker.bindTooltip(
    `${place.name}${place.open ? "" : " · Fermé / مغلق"}`,
    { direction: "top", offset: [0, -8] }
  );
  marker.on("click", () => handlePlaceClick(place));
  return marker;
};

const clearMarkers = () => {
  appState.markers.forEach((marker) => marker.remove());
  appState.markers = [];
};

const renderMarkers = () => {
  clearMarkers();
  appState.places.forEach((place) => {
    const marker = createMarker(place);
    appState.markers.push(marker);
  });

  if (appState.places.length > 1) {
    const bounds = L.latLngBounds(appState.places.map((p) => [p.lat, p.lng]));
    appState.map.flyToBounds(bounds.pad(0.2), {
      duration: 0.7,
      maxZoom: 14,
    });
  }
};

const renderPlacesStrip = () => {
  if (!appState.places.length) return;
  const origin = appState.userLocation || { lat: 33.93, lng: -6.9 };
  const sorted = [...appState.places].sort(
    (a, b) => distanceBetween(origin, a) - distanceBetween(origin, b)
  );
  elements.placesTrack.innerHTML = "";
  sorted.forEach((place) => {
    const item = document.createElement("div");
    item.className = "place-item";
    item.innerHTML = `
      <div class="place-avatar">
        <img src="${place.image}" alt="${place.name}" />
      </div>
      <div>${place.name}</div>
      ${place.open ? "" : "<small>Fermé / مغلق</small>"}
    `;
    item.addEventListener("click", () => handlePlaceClick(place));
    elements.placesTrack.appendChild(item);
  });
};

const loadPlaces = async (category) => {
  appState.category = category;
  let places = [];

  if (category === "delivery") {
    showToast("ستكون متوفرة قريباً");
    return;
  }

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: CATEGORY_CONFIG[category].query,
    });
    if (!response.ok) throw new Error("overpass failed");
    const data = await response.json();
    places = data.elements.slice(0, 6).map((element, index) => ({
      id: `${category}-${element.id}`,
      name: element.tags.name || `${category} ${index + 1}`,
      lat: element.lat,
      lng: element.lon,
      type: category === "restaurants" ? "restaurant" : "shop",
      image: category === "restaurants"
        ? "https://images.unsplash.com/photo-1548365328-9f5476f8e5bd?auto=format&fit=crop&w=200&q=80"
        : "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80",
      open: index % 3 !== 0,
    }));
  } catch (error) {
    places = CATEGORY_CONFIG[category].fallback;
  }

  appState.places = places;
  renderMarkers();
  renderPlacesStrip();
};

const handlePlaceClick = (place) => {
  appState.currentPlace = place;
  if (!place.open) {
    showToast("Ce magasin est suspendu pour le moment — bientôt ouvert.");
    elements.closedAlert.classList.add("show");
    return;
  }
  openRestaurantSheet(place);
};

const openRestaurantSheet = (place) => {
  elements.sheetImage.src = place.image;
  elements.sheetName.textContent = place.name;
  elements.callBtn.href = "tel:+212675150040";
  elements.waBtn.href = `https://wa.me/212675150040?text=${encodeURIComponent(
    `Salam, je veux commander chez ${place.name}.`
  )}`;

  elements.menuContainer.innerHTML = "";
  MENU_SECTIONS.forEach((section) => {
    const sectionEl = document.createElement("div");
    sectionEl.className = "menu-section";
    sectionEl.innerHTML = `<h4>${section.title}</h4>`;
    const grid = document.createElement("div");
    grid.className = "menu-grid";
    section.items.forEach((item) => {
      const itemEl = document.createElement("div");
      itemEl.className = "menu-item";
      itemEl.innerHTML = `
        <img src="${item.image}" alt="${item.name}" />
        <div>
          <strong>${item.name}</strong>
          <div>${item.price} MAD</div>
        </div>
        <button type="button">+</button>
      `;
      itemEl.querySelector("button").addEventListener("click", () => addToCart(item));
      grid.appendChild(itemEl);
    });
    sectionEl.appendChild(grid);
    elements.menuContainer.appendChild(sectionEl);
  });

  elements.restaurantSheet.classList.add("open");
};

const closeRestaurantSheet = () => {
  elements.restaurantSheet.classList.remove("open");
};

const addToCart = (item) => {
  appState.cart.push(item);
  updateCartSummary();
  elements.cartBanner.classList.add("show");
};

const updateCartSummary = () => {
  const itemsTotal = appState.cart.reduce((sum, item) => sum + item.price, 0);
  const distance = appState.userLocation && appState.currentPlace
    ? distanceBetween(appState.userLocation, appState.currentPlace)
    : 2.5;
  const delivery = Math.round(appState.deliveryBase + distance * appState.deliveryPerKm);
  const finalTotal = itemsTotal + delivery;

  elements.itemsTotal.textContent = `${itemsTotal} MAD`;
  elements.deliveryTotal.textContent = `${delivery} MAD`;
  elements.finalTotal.textContent = `${finalTotal} MAD`;
};

const openOrderModal = () => {
  elements.orderModal.classList.add("show");
};

const closeOrderModal = () => {
  elements.orderModal.classList.remove("show");
};

const showOrderStatus = (visible) => {
  elements.orderStatus.classList.toggle("show", visible);
};

const setActiveView = (view) => {
  document.querySelectorAll(".view").forEach((section) => section.classList.remove("active"));
  document.getElementById(`view-${view}`).classList.add("active");
  document.querySelectorAll(".nav-item").forEach((btn) => btn.classList.remove("active"));
  document.querySelector(`.nav-item[data-view="${view}"]`).classList.add("active");
  showOrderStatus(view === "home" && appState.orderInProgress);
};

const resetOrderState = () => {
  appState.cart = [];
  updateCartSummary();
  elements.cartBanner.classList.remove("show");
};

const bindEvents = () => {
  document.querySelectorAll(".category-card").forEach((card) => {
    card.addEventListener("click", () => loadPlaces(card.dataset.category));
  });

  elements.locateBtn.addEventListener("click", requestLocation);
  elements.closeSheet.addEventListener("click", closeRestaurantSheet);
  elements.closeClosedAlert.addEventListener("click", () => elements.closedAlert.classList.remove("show"));
  elements.closeOrderModal.addEventListener("click", closeOrderModal);
  elements.deliveryInfo.addEventListener("click", () => {
    showToast("La livraison coûte 10 MAD, augmente de 1 MAD par km. Ce montant va entièrement au livreur.");
  });
  elements.confirmOrder.addEventListener("click", () => {
    if (!appState.userLocation) {
      showToast("Vous devez activer votre localisation pour finaliser la commande.");
      elements.gpsBanner.classList.add("show");
      return;
    }
    openOrderModal();
  });

  elements.orderForm.addEventListener("submit", (event) => {
    event.preventDefault();
    appState.orderInProgress = true;
    showToast("Commande confirmée !");
    closeOrderModal();
    closeRestaurantSheet();
    resetOrderState();
    showOrderStatus(true);
  });

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => setActiveView(btn.dataset.view));
  });

  elements.supportBtn.addEventListener("click", () => {
    const message = encodeURIComponent("Salam, j’ai besoin d’aide.");
    window.open(`https://wa.me/212675150040?text=${message}`, "_blank");
  });

  elements.openSettings.addEventListener("click", () => elements.settingsSheet.classList.add("show"));
  elements.closeSettings.addEventListener("click", () => elements.settingsSheet.classList.remove("show"));
};

initMap();
loadPlaces("restaurants");
bindEvents();
