// Config and Initialization
// Update Firebase imports
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  doc,
  query,
  where,
  serverTimestamp,
  updateDoc,
  orderBy,
} from "firebase/firestore";
import dotenv from "dotenv";

// Constants and Configuration
const CONFIG = {
  firebase: {
    apiKey:
      process.env.FIREBASE_API_KEY || "AIzaSyA9zpMXYhN82wBiny75T3Rf32U7l55CEu0",
    authDomain:
      process.env.FIREBASE_AUTH_DOMAIN || "deebee-shop.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "deebee-shop",
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET || "deebee-shop.appspot.com",
    messagingSenderId:
      process.env.FIREBASE_MESSAGING_SENDER_ID || "388424027848",
    appId:
      process.env.FIREBASE_APP_ID ||
      "1:388424027848:web:16a9062a542dd2d0101ffd",
  },
  pagination: {
    itemsPerPage: 6,
    currentPage: 1,
  },
};

// Initialize Firebase
initializeApp(CONFIG.firebase);
const db = getFirestore();
const auth = getAuth();

// State Management
const state = {
  currentPage: 1,
  totalPages: 1,
  cart: [],
};

// Utility Functions
const utils = {
  formatTotal: (amount) => {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  },

  hyphenateTitle: (title) => {
    return title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  },

  getUrlParameter: (name) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  },

  generateOrderID: () => {
    return Math.random().toString(36).substr(2, 7).toUpperCase();
  },

  showToast: (elementId = "cartToast", message = "") => {
    const toastElement = document.getElementById(elementId);
    if (!toastElement) {
      console.error(`Toast element with id '${elementId}' not found`);
      return;
    }

    // If a message is provided, update the toast body
    if (message) {
      const toastBody = toastElement.querySelector(".toast-body");
      if (toastBody) {
        toastBody.textContent = message;
      }
    }

    const toast = new bootstrap.Toast(toastElement);
    toast.show();
  },
};

class RecentlyViewedManager {
  constructor(userId) {
    if (!userId) {
      throw new Error("UserId is required for RecentlyViewedManager");
    }
    this.userId = userId;
    this.recentlyViewedRef = collection(db, "RecentlyViewed");
  }

  async addToRecentlyViewed(productCode) {
    try {
      const docRef = doc(this.recentlyViewedRef, this.userId);
      const docSnap = await getDoc(docRef);

      const newProduct = {
        productCode,
        viewedAt: new Date().toISOString(), // Use ISO string instead of serverTimestamp
      };

      if (docSnap.exists()) {
        const data = docSnap.data();

        // Get current products or initialize empty array
        let products = data.products || [];

        // Remove this product if it exists already
        products = products.filter((p) => p.productCode !== productCode);

        // Add new product to the beginning
        products.unshift(newProduct);

        // Keep only last 10 products
        products = products.slice(0, 10);

        await updateDoc(docRef, { products });
        console.log("Updated recently viewed document");
      } else {
        // Create new document
        await setDoc(docRef, {
          whoViewed: this.userId,
          products: [newProduct],
        });
        console.log("Created new recently viewed document");
      }
    } catch (error) {
      console.error("Error in addToRecentlyViewed:", error);
      throw error;
    }
  }

  async getRecentlyViewed() {
    try {
      const docRef = doc(this.recentlyViewedRef, this.userId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.log("No recently viewed document exists");
        return [];
      }

      const data = docSnap.data();

      if (!data.products || !Array.isArray(data.products)) {
        return [];
      }

      return data.products
        .sort((a, b) => {
          // Direct comparison of ISO date strings
          return new Date(b.viewedAt) - new Date(a.viewedAt);
        })
        .slice(0, 4)
        .map((item) => item.productCode);
    } catch (error) {
      console.error("Error in getRecentlyViewed:", error);
      return [];
    }
  }

  async displayRecentlyViewed() {
    try {
      const recentProductCodes = await this.getRecentlyViewed();

      if (recentProductCodes.length === 0) {
        console.log("No recent products found"); // Debug log
        $("#recentlyViewedSection").hide();
        return;
      }

      const productManager = new ProductManager(db);
      const products = await Promise.all(
        recentProductCodes.map((code) => productManager.getProductByCode(code))
      );

      const validProducts = products.filter((p) => p !== null);

      if (validProducts.length === 0) {
        $("#recentlyViewedSection").hide();
        return;
      }

      const recentlyViewedHTML = validProducts
        .map(
          (product) => `
              <div class="col-lg-3 col-md-4 col-sm-6 mt-4">
                  <div class="product-item">
                      <div class="product-img">
                          <a href="single-product.html?code=${
                            product.productCode
                          }">
                              <img class="primary-img img-fluid" 
                                   src="${product.main_image}" 
                                   alt="${product.name}"
                                   style="width: 100%; height: 200px; object-fit: contain;">
                          </a>
                      </div>
                      <div class="product-content">
                          <h5 class="title">
                              <a href="single-product.html?code=${
                                product.productCode
                              }" 
                                 style="font-size: 14px; display: -webkit-box; 
                                        -webkit-line-clamp: 2; 
                                        -webkit-box-orient: vertical; 
                                        overflow: hidden; 
                                        text-overflow: ellipsis;">
                                  ${product.name}
                              </a>
                          </h5>
                          <div class="price-box">
                              <span class="regular-price">GH₵ ${utils.formatTotal(
                                product.salePrice || product.regularPrice
                              )}</span>
                          </div>
                      </div>
                  </div>
              </div>
          `
        )
        .join("");

      $("#recentlyViewedProducts").html(recentlyViewedHTML);
      $("#recentlyViewedSection").show();
    } catch (error) {
      console.error("Error displaying recently viewed products:", error);
      $("#recentlyViewedSection").hide();
    }
  }
}

class CartManager {
  constructor() {
    this.cart = JSON.parse(localStorage.getItem("cart")) || [];
  }
  isInCart(productId) {
    return this.cart.find((item) => item.prod_id === productId);
  }

  clearCart() {
    this.cart = [];
    this.saveCart();
  }
  // Add this method to get item quantity
  getItemQuantity(productId) {
    const item = this.isInCart(productId);
    return item ? item.quantity : 0;
  }
  addItem(product) {
    const productId = product.prod_id || product.code; // Use code as fallback
    if (!productId) {
      console.error("No valid product ID found:", product);
      return;
    }
    const existingProductIndex = this.cart.findIndex(
      (item) => item.prod_id === productId || item.code === productId
    );

    if (existingProductIndex !== -1) {
      this.cart[existingProductIndex].quantity += 1;
    } else {
      this.cart.push({ ...product, prod_id: productId, quantity: 1 });
    }

    this.saveCart();
    utils.showToast();
    // Add this line to refresh the product list UI
    this.updateProductButtons();
  }
  // Add this method to update product buttons
  updateProductButtons() {
    this.cart.forEach((item) => {
      const productBtn = $(`.cartBtn[data-prod-id="${item.prod_id}"]`);
      if (productBtn.length) {
        const quantityHtml = `
                  <div class="d-flex align-items-center justify-content-center">
                      <a class="btn btn-primary btn-sm decreaseBtn" data-dic="${item.prod_id}">-</a>
                      <span class="mx-2" id="itemQty">${item.quantity}</span>
                      <a class="btn btn-primary btn-sm increaseBtn" data-dic="${item.prod_id}">+</a>
                  </div>`;
        productBtn.replaceWith(quantityHtml);
      }
    });
  }

  updateQuantity(productId, action) {
    console.log("CartManager updateQuantity STARTED:", { productId, action });

    // Validate inputs
    if (!productId || !action) {
      console.error("Invalid inputs:", { productId, action });
      return;
    }

    // Find product in cart
    const productIndex = this.cart.findIndex(
      (item) => item.prod_id === productId || item.code === productId
    );

    console.log("Product index:", productIndex, "Current cart:", this.cart);

    if (productIndex === -1) {
      console.error("Product not found in cart");
      return;
    }

    // Update quantity
    if (action === "increase") {
      this.cart[productIndex].quantity += 1;
      console.log("Increased quantity to:", this.cart[productIndex].quantity);
    } else if (action === "decrease") {
      if (this.cart[productIndex].quantity > 1) {
        this.cart[productIndex].quantity -= 1;
        console.log("Decreased quantity to:", this.cart[productIndex].quantity);
      } else {
        // Handle removal
        const productContainer = $(
          `.decreaseBtn[data-dic="${productId}"]`
        ).closest(".d-flex");
        if (productContainer.length) {
          const item = this.cart[productIndex];
          const addToCartBtn = `
                    <a class="btn btn-primary mt-2 cartBtn" 
                        data-prod-id="${productId}"
                        data-code="${item.code}"
                        data-name="${item.title}"
                        data-price="${item.price}"
                        data-imageurl="${item.imageUrl}">
                        Add to Cart
                    </a>`;
          productContainer.replaceWith(addToCartBtn);
        }
        this.cart.splice(productIndex, 1);
        console.log("Removed item from cart");
      }
    }

    // Update UI
    const quantitySpan = $(`.itemQty-${productId}`);
    if (quantitySpan.length && this.cart[productIndex]) {
      quantitySpan.text(this.cart[productIndex].quantity);
      console.log("Updated quantity display");
    }

    // Save changes
    this.saveCart();
    utils.showToast();

    // Update cart page if we're on it
    if (window.location.pathname.includes("cart.html")) {
      this.displayCartPage();
    }
  }

  removeItem(index) {
    this.cart.splice(index, 1);
    this.saveCart();
  }

  getTotal() {
    return this.cart.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  }

  getCount() {
    return this.cart.reduce((count, item) => count + item.quantity, 0);
  }

  saveCart() {
    localStorage.setItem("cart", JSON.stringify(this.cart));
    this.updateUI();
  }

  updateUI() {
    // Update cart count badge
    $("#cartCount").html(this.getCount());

    // Update cart modal
    const cartList = $("#cartList").empty();
    this.cart.forEach((item, index) => {
      cartList.append(this.generateCartItemHTML(item, index));
    });

    // Add cart total
    cartList.append(this.generateCartTotalHTML());
  }

  generateCartItemHTML(item, index) {
    return `
        <div class="cart-product-wrapper mb-4 pb-4 border-bottom">
          <div class="single-cart-product">
            <div class="cart-product-thumb">
              <a href="single-product.html?code=${item.code}">
                <img src="${item.imageUrl}" alt="${item.title}" />
              </a>
            </div>
            <div class="cart-product-content">
              <h3 class="title">
                <a href="single-product.html?code=${item.code}">${
      item.title
    }</a>
              </h3>
              <div class="product-quty-price">
                <span class="cart-quantity">${
                  item.quantity
                }<strong> × </strong></span>
                <span class="price">
                  <span class="new">GH₵ ${utils.formatTotal(item.price)}</span>
                </span>
              </div>
            </div>
          </div>
          <div class="cart-product-remove" data-index="${index}">
            <a href="#"><i class="pe-7s-close"></i></a>
          </div>
        </div>`;
  }

  generateCartTotalHTML() {
    return `
        <div class="cart-product-total mb-4 pb-4 border-bottom">
          <span class="value">Total</span>
          <span class="price">GH₵ ${utils.formatTotal(this.getTotal())}</span>
        </div>
        <div class="cart-product-btn mt-4">
          <a href="cart.html" class="btn btn-light btn-hover-primary w-100">
            <i class="fa fa-shopping-cart"></i> View cart
          </a>
          <a href="checkout.html" class="btn btn-light btn-hover-primary w-100 mt-4">
            <i class="fa fa-share"></i> Checkout
          </a>
        </div>`;
  }

  displayCartPage() {
    const cartList = $("#cartListMain");
    const cartCount = $("h5:contains('Cart')");
    const subtotalSpan = $("#subtotalMain");
    if (this.cart.length === 0) {
      cartList.html(`
              <div class="text-center py-4">
                  <h4>Your cart is empty</h4>
                  <a href="shop.html" class="btn btn-primary mt-3">Continue Shopping</a>
              </div>
          `);
      cartCount.text("Cart (0)");
      subtotalSpan.text("GH₵ 0.00");
      return;
    }
    // Update cart count
    cartCount.text(`Cart (${this.getCount()})`);

    // Generate cart items HTML
    let cartHTML = "";
    this.cart.forEach((item, index) => {
      cartHTML += this.generateCartPageItemHTML(item, index);
    });

    cartList.html(cartHTML);
    // Update subtotal
    subtotalSpan.text(`GH₵ ${utils.formatTotal(this.getTotal())}`);

    // Setup cart page event listeners
    this.setupCartPageListeners();
  }

  generateCartPageItemHTML(item, index) {
    return `
      <div class="cart-item mb-4 pb-4 border-bottom" data-index="${index}">
          <div class="row align-items-center">
              <div class="col-md-2">
                  <img src="${item.imageUrl}" alt="${
      item.title
    }" class="img-fluid">
              </div>
              <div class="col-md-4">
                  <h6 class="mb-0">${item.title}</h6>
                  <small class="text-muted">Product Code: ${item.code}</small>
              </div>
              <div class="col-md-2">
                  <span class="price fs-6">GH₵ ${utils.formatTotal(
                    item.price
                  )}</span>
              </div>
              <div class="col-md-2">
                  <div class="d-flex align-items-center justify-content-center">
                      <a class="btn btn-sm btn-outline-secondary decreaseBtn" data-dic="${
                        item.prod_id || item.code
                      }">-</a>
                      <span class="mx-2 itemQty-${item.prod_id || item.code}">${
      item.quantity
    }</span>
                      <a class="btn btn-sm btn-outline-secondary increaseBtn" data-dic="${
                        item.prod_id || item.code
                      }">+</a>
                  </div>
              </div>
              <div class="col-md-2">
                  <div class="d-flex align-items-center">
                     
                      <button class="btn btn-sm btn-danger removeBtn p-1" data-index="${index}">
                          <i class="pe-7s-trash"></i>
                      </button>
                  </div>
              </div>
          </div>
      </div>`;
  }

  setupCartPageListeners() {
    // Remove item button
    $(".removeBtn").click((e) => {
      const index = $(e.currentTarget).data("index");
      this.cart.splice(index, 1);
      this.saveCart();
      this.displayCartPage();
    });

    // Quantity buttons
    $(".decreaseBtn, .increaseBtn").click((e) => {
      const productId = $(e.currentTarget).data("dic");
      const action = $(e.currentTarget).hasClass("decreaseBtn")
        ? "decrease"
        : "increase";
      this.updateQuantity(productId, action);
      this.displayCartPage();
    });
  }
}
class CheckoutManager {
  constructor(cartManager) {
    this.cartManager = cartManager;
    this.auth = getAuth();
    this.setupAuthListener();
  }

  setupAuthListener() {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
      if (user && window.location.pathname.includes("checkout.html")) {
        this.displayCheckoutPage();
      }
    });
  }

  async displayCheckoutPage() {
    await this.displayUserAddress();
    this.displayOrderSummary();
    this.setupCheckoutListeners();
  }

  async displayUserAddress() {
    if (!this.currentUser) {
      // If no user is logged in, hide address and show login message
      console.log("No user logged in"); // Debug log
      $("#isNewUserText").show();
      $(".card-head, .card-body").hide();
      return;
    }

    try {
      console.log("Fetching address for user:", this.currentUser.uid); // Debug log
      // Get user's address from Firebase
      const addressSnapshot = await getDocs(
        collection(db, "User", this.currentUser.uid, "Addresses")
      );
      console.log("Address snapshot:", addressSnapshot); // Debug log
      if (addressSnapshot.empty) {
        console.log("No address found for user");
        return;
      }

      // Hide login message and show address
      $("#isNewUserText").hide();
      $(".card-head, .card-body").show();

      // Get the first address (assuming one address per user for now)
      const addressData = addressSnapshot.docs[0].data();

      // Display user details
      $("#checkOutUsername").text(addressData.fullname);
      $("#checkOutaddress").text(addressData.address || "");
      $("#checkOutlocation").text(addressData.city || "");
      $("#checkOutphone").text(addressData.phoneNumber || "");
    } catch (error) {
      console.error("Error fetching user address:", error);
    }
  }

  displayOrderSummary() {
    const cart = this.cartManager.cart;
    const itemCount = this.cartManager.getCount();
    const subtotal = this.cartManager.getTotal();
    const deliveryFee = 20.0; // You can make this dynamic based on location
    const total = subtotal + deliveryFee;

    // Update summary
    $("#itemCount").text(`(${itemCount} items)`);
    $("#subtotalMain").text(`GH₵ ${utils.formatTotal(subtotal)}`);
    $("#deliveryFee").text(`GH₵ ${utils.formatTotal(deliveryFee)}`);
    $("#total").text(`GH₵ ${utils.formatTotal(total)}`);
  }

  setupCheckoutListeners() {
    $("#CheckoutBtn").off("click");
    $("#CheckoutBtn").on("click", async (e) => {
      e.preventDefault();
      // Disable button and show loading state
      const $button = $(e.currentTarget);
      $button.prop("disabled", true);
      $button.html(
        '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...'
      );

      try {
        await this.processOrder();
      } catch (error) {
        console.error("Error in checkout:", error);
        utils.showToast(
          "errorToast",
          "Failed to process order. Please try again."
        );

        // Re-enable button on error
        $button.prop("disabled", false);
        $button.html("Place Order");
      }
    });
  }

  async processOrder() {
    if (!this.currentUser) {
      window.location.href = "login.html";
      return;
    }

    if (this.cartManager.cart.length === 0) {
      utils.showToast("error", "Your cart is empty!");
      return;
    }

    try {
      // Get user's address
      const addressSnapshot = await getDocs(
        collection(db, "User", this.currentUser.uid, "Addresses")
      );

      if (addressSnapshot.empty) {
        utils.showToast("error", "Please add a delivery address first");
        return;
      }

      const addressData = addressSnapshot.docs[0].data();

      const orderData = {
        userId: this.currentUser.uid,
        items: this.cartManager.cart,
        total: this.cartManager.getTotal(),
        deliveryFee: 20.0,
        status: "pending",
        orderDate: serverTimestamp(),
        shippingAddress: {
          fullName: addressData.fullname,
          address: addressData.address,
          location: addressData.city,
          phone: addressData.phoneNumber,
        },
      };

      // Add to orders collection in Firebase
      const ordersRef = collection(db, "Orders");
      await addDoc(ordersRef, orderData);

      // Show success message
      utils.showToast("orderToast");

      // Clear cart
      this.cartManager.clearCart();

      // Redirect to order confirmation after a short delay
      setTimeout(() => {
        window.location.href = "account.html";
      }, 2000);
    } catch (error) {
      console.error("Error processing order:", error);
      utils.showToast("error", "Failed to process order. Please try again.");
    }
  }
}

class AccountManager {
  constructor() {
    this.auth = getAuth();
    this.currentUser = this.auth.currentUser;
    this.setupAuthListener();
    this.setupLogoutListener();
  }

  setupAuthListener() {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
      if (user && window.location.pathname.includes("account.html")) {
        console.log("User logged in:", user.uid); // Debug log
        this.loadOrders();
      }
    });
  }

  setupLogoutListener() {
    const logoutBtn = document.getElementById("LogoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        // Disable button and show loading state
        const $button = $(e.currentTarget);
        $button.prop("disabled", true);
        $button.html(
          '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging out...'
        );

        try {
          await this.logout();
        } catch (error) {
          console.error("Logout error:", error);
          utils.showToast("errorToast", "Failed to logout. Please try again.");

          // Reset button state on error
          $button.prop("disabled", false);
          $button.html('<i class="fa fa-sign-out"></i> Logout');
        }
      });
    }
  }

  async logout() {
    try {
      await signOut(this.auth);

      // Clear any local storage data
      localStorage.removeItem("cart");
      // Add any other local storage items you want to clear

      // Show success message
      utils.showToast("successToast", "Logged out successfully!");

      // Redirect to home page after short delay
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1000);
    } catch (error) {
      console.error("Error during logout:", error);
      throw error;
    }
  }

  async loadOrders() {
    try {
      console.log("Loading orders for user:", this.currentUser.uid); // Debug log
      const ordersRef = collection(db, "Orders");
      const q = query(
        ordersRef,
        where("userId", "==", this.currentUser.uid),
        orderBy("orderDate", "desc")
      );

      const querySnapshot = await getDocs(q);
      console.log("Orders snapshot:", querySnapshot.size); // Debug log
      const ordersTableBody = $("#ordersTableBody");
      ordersTableBody.empty();

      if (querySnapshot.empty) {
        console.log("No orders found"); // Debug log
        ordersTableBody.html(`
                  <tr>
                      <td colspan="8" class="text-center">No orders found</td>
                  </tr>
              `);
        return;
      }

      querySnapshot.forEach((doc) => {
        const order = doc.data();
        console.log("Order data:", order); // Debug log
        order.items.forEach((item, index) => {
          const date = order.orderDate
            ? new Date(order.orderDate.toDate()).toLocaleDateString()
            : "N/A";

          const row = `
                      <tr>
                          <td>${index + 1}</td>
                          <td>
                              <img src="${item.imageUrl}" alt="${
            item.title
          }" style="width: 50px; height: 50px; object-fit: cover;">
                          </td>
                          <td>${doc.id}</td>
                          <td>${date}</td>
                          <td>${item.quantity}</td>
                          <td>
                              <span class="badge ${this.getStatusBadgeClass(
                                order.status
                              )}">
                                  ${order.status}
                              </span>
                          </td>
                          <td>GH₵ ${utils.formatTotal(
                            item.price * item.quantity
                          )}</td>
                          <td>
                              <button class="btn btn-sm btn-primary view-order" 
                                  data-bs-toggle="modal" 
                                  data-bs-target="#orderDetailsModal"
                                  data-order-id="${doc.id}">
                                  View
                              </button>
                          </td>
                      </tr>
                  `;
          ordersTableBody.append(row);
        });
      });

      this.setupOrderViewListeners();
    } catch (error) {
      console.error("Error loading orders:", error);
      $("#ordersTableBody").html(`
              <tr>
                  <td colspan="8" class="text-center text-danger">Error loading orders</td>
              </tr>
          `);
    }
  }

  getStatusBadgeClass(status) {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-warning";
      case "processing":
        return "bg-info";
      case "shipped":
        return "bg-primary";
      case "delivered":
        return "bg-success";
      case "cancelled":
        return "bg-danger";
      default:
        return "bg-secondary";
    }
  }

  setupOrderViewListeners() {
    $(".view-order")
      .off("click")
      .on("click", async (e) => {
        const orderId = $(e.currentTarget).data("order-id");
        await this.showOrderDetails(orderId);
      });
  }

  async showOrderDetails(orderId) {
    try {
      const orderDoc = await getDoc(doc(db, "Orders", orderId));
      if (!orderDoc.exists()) {
        utils.showToast("errorToast", "Order not found");
        return;
      }

      const order = orderDoc.data();
      const date = order.orderDate
        ? new Date(order.orderDate.toDate()).toLocaleDateString()
        : "N/A";

      // Generate tracking timeline HTML
      const trackingHtml = this.generateTrackingTimeline(order.status);

      let itemsHtml = order.items
        .map(
          (item) => `
              <div class="d-flex justify-content-between mb-2">
                  <div>
                      <img src="${item.imageUrl}" alt="${
            item.title
          }" style="width: 50px; height: 50px; object-fit: cover;">
                      <span class="ms-2">${item.title}</span>
                  </div>
                  <div>
                      <span>${item.quantity} x GH₵ ${utils.formatTotal(
            item.price
          )}</span>
                  </div>
              </div>
          `
        )
        .join("");

      const modalContent = `
              <div class="modal-body">
                <h6>Order ID: ${orderId}</h6>
                <p>Date: ${date}</p>
                
                <!-- Tracking Timeline -->
                <div class="tracking-section mb-4">
                    <h6 class="mb-3">Order Status</h6>
                    ${trackingHtml}
                </div>
                
                <h6 class="mt-4">Items</h6>
                ${itemsHtml}
                
                <hr>
                <div class="d-flex justify-content-between">
                    <span>Subtotal:</span>
                    <span>GH₵ ${utils.formatTotal(order.total)}</span>
                </div>
                <div class="d-flex justify-content-between">
                    <span>Delivery Fee:</span>
                    <span>GH₵ ${utils.formatTotal(order.deliveryFee)}</span>
                </div>
                <div class="d-flex justify-content-between fw-bold mt-2">
                    <span>Total:</span>
                    <span>GH₵ ${utils.formatTotal(
                      order.total + order.deliveryFee
                    )}</span>
                </div>
                
                <h6 class="mt-4">Delivery Address</h6>
                <p class="mb-1">${order.shippingAddress.fullName}</p>
                <p class="mb-1">${order.shippingAddress.address}</p>
                <p class="mb-1">${order.shippingAddress.location}</p>
                <p>${order.shippingAddress.phone}</p>
                   <!-- Action Buttons -->
                    <div class="mt-4 d-flex gap-2">
                        <button class="btn btn-primary flex-grow-1 reorder-btn" data-order-id="${orderId}">
                            <i class="pe-7s-refresh-2"></i> Reorder Items
                        </button>
                        <button class="btn btn-secondary flex-grow-1 download-invoice-btn" data-order-id="${orderId}">
                            <i class="pe-7s-download"></i> Download Invoice
                        </button>
                    </div>
            </div>
          `;

      $("#orderDetailsModalContent").html(modalContent);
      // Setup reorder button listener
      this.setupReorderListener(order);
      this.setupInvoiceListener(order, orderId);
    } catch (error) {
      console.error("Error showing order details:", error);
      utils.showToast("errorToast", "Error loading order details");
    }
  }

  setupReorderListener(order) {
    $(".reorder-btn")
      .off("click")
      .on("click", async (e) => {
        e.preventDefault();
        const $button = $(e.currentTarget);

        // Disable button and show loading state
        $button.prop("disabled", true);
        $button.html(
          '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Adding to Cart...'
        );

        try {
          await this.reorderItems(order.items);

          // Show success message
          utils.showToast("successToast", "Items added to cart successfully!");

          // Close the modal
          const modal = bootstrap.Modal.getInstance(
            document.getElementById("orderDetailsModal")
          );
          modal.hide();

          // Redirect to cart page
          setTimeout(() => {
            window.location.href = "cart.html";
          }, 1000);
        } catch (error) {
          console.error("Error reordering items:", error);
          utils.showToast("errorToast", "Failed to add items to cart");

          // Reset button state
          $button.prop("disabled", false);
          $button.html('<i class="pe-7s-refresh-2"></i> Reorder Items');
        }
      });
  }
  setupInvoiceListener(order, orderId) {
    $(".download-invoice-btn")
      .off("click")
      .on("click", async (e) => {
        e.preventDefault();
        const $button = $(e.currentTarget);

        try {
          // Disable button and show loading state
          $button.prop("disabled", true);
          $button.html(
            '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...'
          );

          const success = await this.generateInvoice(order, orderId);

          if (success) {
            utils.showToast("successToast", "Invoice downloaded successfully!");
          } else {
            throw new Error("Failed to generate invoice");
          }
        } catch (error) {
          console.error("Error generating invoice:", error);
          utils.showToast("errorToast", "Failed to generate invoice");
        } finally {
          // Reset button state
          $button.prop("disabled", false);
          $button.html('<i class="pe-7s-download"></i> Download Invoice');
        }
      });
  }
  async reorderItems(items) {
    // Get cart manager instance
    const cartManager = new CartManager();

    // Clear existing cart if you want to replace it
    // Comment out the next line if you want to add to existing cart instead
    cartManager.clearCart();

    // Add each item to cart
    items.forEach((item) => {
      const productData = {
        prod_id: item.prod_id,
        code: item.code,
        title: item.title,
        price: item.price,
        imageUrl: item.imageUrl,
        quantity: item.quantity,
      };

      cartManager.addItem(productData);
    });
  }
  async generateInvoice(order, orderId) {
    try {
      // Create new jsPDF instance
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      // Load and add logo
      try {
        const img = new Image();
        img.src = "assets/images/logo/logo.png"; // Make sure this path is correct

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const imageData = canvas.toDataURL("image/png");

        doc.addImage(imageData, "PNG", 10, 10, 50, 20);
      } catch (error) {
        console.error("Error loading logo:", error);
      }

      // Add header
      doc.setFontSize(20);
      doc.text("INVOICE", 105, 20, { align: "center" });

      // Add invoice details
      doc.setFontSize(10);
      const invoiceDetails = [
        `Invoice No: ${orderId}`,
        `Date: ${
          order.orderDate
            ? new Date(order.orderDate.toDate()).toLocaleDateString()
            : "N/A"
        }`,
        `Status: ${order.status}`,
        "\nBilling Address:",
        `${order.shippingAddress.fullName}`,
        `${order.shippingAddress.address}`,
        `${order.shippingAddress.location}`,
        `Phone: ${order.shippingAddress.phone}`,
      ];
      doc.text(invoiceDetails, 15, 40);

      // Create items table
      const tableColumn = ["#", "Item", "Price", "Qty", "Total"];
      const tableRows = order.items.map((item, index) => [
        index + 1,
        item.title,
        `GH₵ ${utils.formatTotal(item.price)}`,
        item.quantity,
        `GH₵ ${utils.formatTotal(item.price * item.quantity)}`,
      ]);

      // Add items table
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 90,
        theme: "grid",
        styles: {
          fontSize: 8,
        },
        headStyles: {
          fillColor: [51, 51, 51],
        },
      });

      // Add summary
      const finalY = doc.lastAutoTable.finalY + 10;
      const summaryText = [
        `Subtotal: GH₵ ${utils.formatTotal(order.total)}`,
        `Delivery Fee: GH₵ ${utils.formatTotal(order.deliveryFee)}`,
        `Total Amount: GH₵ ${utils.formatTotal(
          order.total + order.deliveryFee
        )}`,
      ];
      doc.text(summaryText, 150, finalY, { align: "right" });

      // Add footer
      doc.setFontSize(8);
      const footerText = [
        "Thank you for your business!",
        "For any queries, please contact our support team.",
        "Email: support@deebee.com | Phone: +233 XX XXX XXXX",
      ];
      doc.text(footerText, 105, 280, { align: "center" });

      // Save the PDF - using a try-catch specifically for the save operation
      try {
        doc.save(`Invoice_${orderId}.pdf`);
        console.log("PDF saved successfully"); // Debug log
        return true;
      } catch (saveError) {
        console.error("Error saving PDF:", saveError);
        throw saveError;
      }
    } catch (error) {
      console.error("Error generating invoice:", error);
      throw error;
    }
  }

  generateTrackingTimeline(currentStatus) {
    const stages = [
      { status: "pending", icon: "pe-7s-cart", label: "Order Placed" },
      { status: "processing", icon: "pe-7s-config", label: "Processing" },
      { status: "shipped", icon: "pe-7s-car", label: "Shipped" },
      { status: "delivered", icon: "pe-7s-home", label: "Delivered" },
    ];

    let hasReachedCurrent = false;

    return `
        <div class="tracking-timeline">
            ${stages
              .map((stage) => {
                const isActive = !hasReachedCurrent;
                if (stage.status === currentStatus.toLowerCase()) {
                  hasReachedCurrent = true;
                }

                return `
                    <div class="tracking-step ${isActive ? "active" : ""}">
                        <div class="tracking-icon">
                            <i class="${stage.icon}"></i>
                        </div>
                        <div class="tracking-label">${stage.label}</div>
                        <div class="tracking-date">
                            ${
                              isActive ? this.getTrackingDate(stage.status) : ""
                            }
                        </div>
                    </div>
                `;
              })
              .join("")}
        </div>
    `;
  }
  getTrackingDate(status) {
    // You can replace this with actual dates from your order data
    const date = new Date();
    return date.toLocaleDateString();
  }
}
// Main Application Logic
class ShopApp {
  constructor() {
    this.cartManager = new CartManager();
    this.checkoutManager = new CheckoutManager(this.cartManager);
    this.accountManager = new AccountManager();
    this.productManager = new ProductManager(db);
    this.recentlyViewedManager = null;
    this.setupAuthStateObserver();
    this.initializeEventListeners();
    this.loadInitialData();
    this.initializeCartPage();
    this.initializePages();
  }

  setupAuthStateObserver() {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // Initialize RecentlyViewedManager with user ID
        this.recentlyViewedManager = new RecentlyViewedManager(user.uid);

        // If on product page, handle recently viewed
        if (window.location.pathname.includes("single-product.html")) {
          const productCode = utils.getUrlParameter("code");
          if (productCode) {
            this.recentlyViewedManager
              .addToRecentlyViewed(productCode)
              .then(() => {
                console.log("Successfully added to recently viewed");
                return this.recentlyViewedManager.displayRecentlyViewed();
              })
              .catch((error) => {
                console.error("Error in recently viewed flow:", error);
              });
          }
        }
      } else {
        console.log("User not logged in, clearing RecentlyViewedManager");
        this.recentlyViewedManager = null;
      }
    });
  }

  async setupProductPage() {
    const productCode = utils.getUrlParameter("code");
    console.log("Product code from URL:", productCode); // Debug log

    if (!productCode) {
      console.log("No product code found in URL");
      return;
    }

    try {
      // Make sure ProductManager exists
      if (!this.productManager) {
        this.productManager = new ProductManager(db);
      }

      const product = await this.productManager.getProductByCode(productCode);
      console.log("Retrieved product:", product); // Debug log

      if (!product) {
        console.error("Product not found");
        return;
      }

      // Display product details first
      this.displayProductDetails(product);

      // Add to recently viewed if user is logged in
      if (this.recentlyViewedManager) {
        await this.recentlyViewedManager.addToRecentlyViewed(productCode);

        // Wait a moment for the database to update
        setTimeout(() => {
          this.recentlyViewedManager.displayRecentlyViewed();
        }, 1000);
      } else {
        console.log("User not logged in - skipping recently viewed"); // Debug log
      }
    } catch (error) {
      console.error("Error setting up product page:", error);
    }
  }

  async getProductByCode(productCode) {
    try {
      const q = query(
        this.productsRef,
        where("productCode", "==", productCode)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log("No product found with code:", productCode);
        return null;
      }

      return snapshot.docs[0].data();
    } catch (err) {
      console.error("Error getting product by code:", err);
      throw err;
    }
  }
  initializePages() {
    const path = window.location.pathname;

    if (path.includes("cart.html")) {
      this.cartManager.displayCartPage();
    } else if (path.includes("checkout.html")) {
      this.checkoutManager.displayCheckoutPage();
      console.log("On checkout page"); // Debug
    }
  }

  initializeEventListeners() {
    document.addEventListener("DOMContentLoaded", () => {
      $(document).ready(() => {
        this.setupPageSpecificLogic();
        this.setupAuthStateObserver();
        this.setupSearchListener();
        this.setupPaginationListener();
        this.setupCartListeners();
        this.loadProducts();
      });
    });
  }

  initializeCartPage() {
    if (window.location.pathname.includes("cart.html")) {
      this.cartManager.displayCartPage();
    }
  }

  loadInitialData() {
    this.updateCartCount();
    this.loadProducts();
    this.displayCartItems();
  }

  updateCartCount() {
    const cartCount = this.cartManager.getCount();
    $("#cartCount").html(cartCount);
  }

  async loadProducts() {
    try {
      const path = window.location.pathname;
      if (path === "/shop.html") {
        this.setupShopPage();
      } else {
        await this.loadFeaturedProducts();
      }
    } catch (err) {
      console.error("Error loading products:", err);
      $("#productList").html(
        '<div class="alert alert-danger">Failed to load products. Please try again later.</div>'
      );
    }
  }
  async loadBrandProducts(brandName) {
    try {
      const result = await this.productManager.getProductsByBrand(brandName);
      if (result.total < 1) {
        $("#allProductsList").html(
          '<div class="alert alert-danger">No products found for this brand.</div>'
        );
        return;
      }
      this.renderProducts(result.products);
    } catch (err) {
      console.error("Error loading brand products:", err);
      $("#allProductsList").html(
        '<div class="alert alert-danger">Error loading products. Please try again later.</div>'
      );
    }
  }
  async loadCategoryProducts(category) {
    try {
      const result = await this.productManager.getProductsByCategory(category);
      if (result.total < 1) {
        $("#allProductsList").html(
          '<div class="alert alert-danger">No products found in this category.</div>'
        );
        return;
      }
      this.renderProducts(result.products);
    } catch (err) {
      console.error("Error loading category products:", err);
      $("#allProductsList").html(
        '<div class="alert alert-danger">Error loading products. Please try again later.</div>'
      );
    }
  }
  displayCartItems() {
    this.cartManager.updateUI();
  }
  setupCategoryListeners() {
    $(".category-menu").on("click", ".category-link", (e) => {
      e.preventDefault();
      const category = $(e.currentTarget).data("category");

      if (category) {
        const newUrl = `shop.html?category=${category}`;
        window.history.pushState({ category }, "", newUrl);
        this.loadCategoryProducts(category);
      }
    });

    // Handle browser back/forward buttons
    window.onpopstate = (event) => {
      const category = utils.getUrlParameter("category");
      const brand = utils.getUrlParameter("brand");

      if (category) {
        this.loadCategoryProducts(category);
      } else if (brand) {
        this.loadBrandProducts(brand);
      } else {
        this.loadProducts();
      }
    };
  }

  setupSearchListener() {
    $("#mainShopSearch").on("input", (e) => {
      const searchQuery = e.target.value;
      this.searchProducts(searchQuery);
    });
  }

  setupPaginationListener() {
    $(document).on("click", "#pagination a", (e) => {
      e.preventDefault();
      const page = parseInt($(e.target).data("page"), 10);
      if (!isNaN(page) && page >= 1 && page <= state.totalPages) {
        this.goToPage(page);
      }
    });
  }

  async searchProducts(query) {
    if (this.productManager) {
      const products = await this.productManager.getAllProducts();
      const filteredProducts = products.filter((product) =>
        product.name.toLowerCase().includes(query.toLowerCase())
      );
      this.renderProducts(filteredProducts);
    }
  }

  async loadFeaturedProducts() {
    try {
      const productManager = new ProductManager(db);
      const products = await productManager.getOnSaleProducts();
      // Implement your featured products display logic here
    } catch (err) {
      console.error("Error loading featured products:", err);
    }
  }

  //   setupProductNavigation() {
  //     $("#allProductsList").on("click", ".product-link", (e) => {
  //         e.preventDefault();
  //         const productData = $(e.currentTarget).data("product");

  //         if (productData) {
  //             this.productManager.saveProductData(productData);
  //             window.location.href = e.currentTarget.href;
  //         } else {
  //             console.error("No product data found");
  //         }
  //     });
  // }
  setupProductNavigation() {
    $("#allProductsList").on("click", ".product-link", (e) => {
      // We don't need to prevent default anymore
      // e.preventDefault();

      const $link = $(e.currentTarget);
      const productCode = $link.data("product-code");

      if (productCode) {
        // Instead of saving product data, we can just navigate to the static page
        // The product details will be loaded on that page
        console.log(`Navigating to product: ${productCode}`);
        // Navigation happens automatically now
      } else {
        console.error("No product code found on link");
      }
    });
  }

  async loadProducts() {
    try {
      const path = window.location.pathname;
      if (path.includes("/shop.html")) {
        const products = await this.productManager.getAllProducts();
        this.renderProducts(products);
      } else {
        await this.loadFeaturedProducts();
      }
    } catch (err) {
      console.error("Error loading products:", err);
      $("#allProductsList").html(
        '<div class="alert alert-danger">Failed to load products. Please try again later.</div>'
      );
    }
  }
  renderProducts(products) {
    const productList = $("#allProductsList");
    productList.empty();

    products.forEach((product) => {
      const productSlug = product.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      const productUrl = `/products/${product.productCode}-${productSlug}.html`;
      const productInCart = this.cartManager.isInCart(product.productCode);
      const html = this.productManager.generateProductHTML(
        product,
        productInCart
      );
      productList.append(html);
    });

    // Update pagination if needed
    this.updatePaginationControls(products.length);
  }

  // renderProducts(products) {
  //   const productList = $("#allProductsList");
  //   productList.empty();

  //   const start = (state.currentPage - 1) * CONFIG.pagination.itemsPerPage;
  //   const paginatedProducts = products.slice(start, start + CONFIG.pagination.itemsPerPage);

  //   paginatedProducts.forEach(product => {
  //     const productUrl = `single-product.html?code=${product.productCode}`;
  //     const productInCart = this.cartManager.cart.find(item => item.code === product.productCode);
  //     const html = this.productManager.generateProductHTML(product, productUrl, productInCart);
  //     productList.append(html);
  //   });

  //   state.totalPages = Math.ceil(products.length / CONFIG.pagination.itemsPerPage);
  //   this.updatePaginationControls(products.length);
  // }

  updatePaginationControls() {
    const pagination = $("#pagination");
    pagination.empty();

    // // Previous Button
    // const prevDisabled = currentPage === 1 ? "disabled" : "";
    // pagination.append(`
    //   <li class="page-item ${prevDisabled}">
    //     <a class="page-link rounded-0" href="#" data-page="${
    //       currentPage - 1
    //     }" aria-label="Previous">
    //       <span aria-hidden="true">&laquo;</span>
    //     </a>
    //   </li>
    // `);

    // // Page Numbers
    // for (let i = 1; i <= totalPages; i++) {
    //   const active = i === currentPage ? "active" : "";
    //   pagination.append(`
    //     <li class="page-item ${active}">
    //       <a class="page-link" href="#" data-page="${i}">${i}</a>
    //     </li>
    //   `);
    // }

    // // Next Button
    // const nextDisabled = currentPage === totalPages ? "disabled" : "";
    // pagination.append(`
    //   <li class="page-item ${nextDisabled}">
    //     <a class="page-link rounded-0" href="#" data-page="${
    //       currentPage + 1
    //     }" aria-label="Next">
    //       <span aria-hidden="true">&raquo;</span>
    //     </a>
    //   </li>
    // `);
  }

  goToPage(page) {
    state.currentPage = page;
    this.loadProducts();
  }

  setupPageSpecificLogic() {
    const path = window.location.pathname;

    // Handle different pages
    if (path === "/login.html") this.setupLoginPage();
    if (path === "/signup.html") this.setupSignupPage();
    if (path === "/single-product.html") this.setupProductPage();
    if (path === "/shop.html") this.setupShopPage();
  }

  setupCartListeners() {
    // Add to cart button click
    $(document).on("click", ".cartBtn", (e) => {
      const $btn = $(e.currentTarget);
      const productId = $btn.data("prod-id");
      if (!productId) {
        console.error("No product ID found on button:", $btn);
        return;
      }
      const product = {
        prod_id: productId,
        code: $btn.data("code"),
        title: $btn.data("name"),
        price: parseFloat($btn.data("price")),
        imageUrl: $btn.data("imageurl"),
      };
      this.cartManager.addItem(product);
    });

    // Quantity buttons
    $(document).on("click", ".decreaseBtn, .increaseBtn", (e) => {
      const $btn = $(e.currentTarget);
      const productId = $btn.data("dic");
      const action = $btn.hasClass("decreaseBtn") ? "decrease" : "increase";
      this.cartManager.updateQuantity(productId, action);
    });

    // Remove from cart
    $(document).on("click", ".cart-product-remove", (e) => {
      const index = $(e.currentTarget).data("index");
      this.cartManager.removeItem(index);
    });
  }

  setupShopPage() {
    this.productManager = new ProductManager(db);
    this.cartManager = new CartManager();

    // Setup category click handlers
    this.setupCategoryListeners();
    this.setupProductNavigation();
    this.setupCartListeners();

    // Check URL parameters
    const brandName = utils.getUrlParameter("brand");
    const category = utils.getUrlParameter("category");

    console.log("Initial category:", category); // Debug log

    if (brandName) {
      this.loadBrandProducts(brandName);
    } else if (category) {
      this.loadCategoryProducts(category);
    } else {
      this.loadProducts();
    }
  }
  displayProductDetails(product) {
    // Update meta tags for SEO
    document.title = product.metaTitle || product.name; // Falls back to product name if no meta title
    console.log("Updated title to:", document.title);
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      // Create meta description if it doesn't exist
      metaDescription = document.createElement("meta");
      metaDescription.name = "description";
      document.head.appendChild(metaDescription);
    }
    metaDescription.content =
      product.metaDescription || product.shortDescription || product.name;
    console.log("Updated meta description to:", metaDescription.content);

    // Log all meta tags after update
    console.log("Current meta tags:", {
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content,
      ogTitle: document.querySelector('meta[property="og:title"]')?.content,
      ogDescription: document.querySelector('meta[property="og:description"]')
        ?.content,
      ogImage: document.querySelector('meta[property="og:image"]')?.content,
      ogUrl: document.querySelector('meta[property="og:url"]')?.content,
    });

    // Update Open Graph meta tags
    this.updateOpenGraphTags({
      title: product.metaTitle || product.name,
      description: product.metaDescription || product.shortDescription,
      image: product.main_image,
      url: window.location.href,
    });

    // Update product title
    $(".product-title").text(product.name);
    if (product.isAvailable) {
      $("#availability").text("In Stock");
    } else {
      $("#availability").text("Out Of Stock");
    }
    // Update main product gallery
    const galleryWrapper = $(".product-gallery-top .swiper-wrapper");
    galleryWrapper.empty();

    // Add main image
    galleryWrapper.append(`
        <div class="swiper-slide">
            <a class="gallery-image" href="${product.main_image}">
                <img src="${product.main_image}" alt="${product.name}">
            </a>
        </div>
    `);

    // Add additional images to gallery
    if (product.other_images && Array.isArray(product.other_images)) {
      product.other_images.forEach((img, index) => {
        galleryWrapper.append(`
                <div class="swiper-slide">
                    <a class="gallery-image" href="${img}">
                        <img src="${img}" alt="${product.name} - Image ${
          index + 2
        }">
                    </a>
                </div>
            `);
      });
    }

    // Update thumbnails
    const thumbsWrapper = $(".product-gallery-thumbs .swiper-wrapper");
    thumbsWrapper.empty();

    // Add main image thumbnail
    thumbsWrapper.append(`
        <div class="swiper-slide">
            <img src="${product.main_image}" alt="${product.name}">
        </div>
    `);

    // Add additional image thumbnails
    if (product.other_images && Array.isArray(product.other_images)) {
      product.other_images.forEach((img, index) => {
        thumbsWrapper.append(`
                <div class="swiper-slide">
                    <img src="${img}" alt="${product.name} - Image ${
          index + 2
        }">
                </div>
            `);
      });
    }

    // Initialize Swiper sliders
    const galleryThumbs = new Swiper(".product-gallery-thumbs", {
      spaceBetween: 10,
      slidesPerView: 4,
      freeMode: true,
      watchSlidesProgress: true,
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      },
    });

    const galleryTop = new Swiper(".product-gallery-top", {
      spaceBetween: 10,
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      },
      thumbs: {
        swiper: galleryThumbs,
      },
    });

    // Update price
    $(".regular-price").text(
      `${utils.formatTotal(product.salePrice || product.regularPrice)}`
    );

    // Update descriptions
    $(".shortDesc").html(
      product.shortDescription || "No short description available"
    );
    $(".long-desc").html(product.description || "No description available");

    // Update product info table
    $("#prodWeight").text(product.weight || "N/A");
    $("#brand").text(product.brand || "N/A");
    $("#unit").text(product.unit || "N/A");
    $("#manufacturer").text(product.manufacturer || "N/A");

    // Setup add to cart button
    $("#addToCartButtonSinglepage").attr({
      "data-prod-id": product.productCode,
      "data-code": product.productCode,
      "data-name": product.name,
      "data-price": product.salePrice || product.regularPrice,
      "data-imageurl": product.main_image,
    });
    const addToCartBtn = $("#addToCartButtonSinglepage");
    addToCartBtn.attr({
      "data-prod-id": product.productCode,
      "data-code": product.productCode,
      "data-name": product.name,
      "data-price": product.salePrice || product.regularPrice,
      "data-imageurl": product.main_image,
    });

    // Setup click handler for add to cart
    addToCartBtn.off("click").on("click", () => {
      const quantity = parseInt($(".cart-plus-minus-box").val()) || 1;

      const productToAdd = {
        prod_id: product.productCode,
        code: product.productCode,
        title: product.name,
        price: product.salePrice || product.regularPrice,
        imageUrl: product.main_image,
        quantity: quantity,
      };

      this.cartManager.addItem(productToAdd);

      // Show success message
      utils.showToast("cartToast", `Added ${quantity} item(s) to cart`);
    });
    // Check if product is already in cart
    const productInCart = this.cartManager.isInCart(product.productCode);
    if (productInCart) {
      // Update quantity input to show current cart quantity
      $(".cart-plus-minus-box").val(productInCart.quantity);
    }

    // Initialize quantity buttons
    this.initializeQuantityButtons();
  }
  updateOpenGraphTags({ title, description, image, url }) {
    const ogTags = {
      "og:title": title,
      "og:description": description,
      "og:image": image,
      "og:url": url,
      "og:type": "product",
    };

    // Update or create Open Graph tags
    Object.entries(ogTags).forEach(([property, content]) => {
      let metaTag = document.querySelector(`meta[property="${property}"]`);
      if (!metaTag) {
        metaTag = document.createElement("meta");
        metaTag.setAttribute("property", property);
        document.head.appendChild(metaTag);
      }
      metaTag.content = content;
    });
  }
  initializeQuantityButtons() {
    $(".qtybutton")
      .off("click")
      .on("click", function () {
        const input = $(this).parent().find(".cart-plus-minus-box");
        let value = parseInt(input.val());

        if ($(this).hasClass("inc")) {
          value = value + 1;
        } else if ($(this).hasClass("dec") && value > 1) {
          value = value - 1;
        }

        input.val(value);
      });

    // Prevent manual input of invalid values
    $(".cart-plus-minus-box").on("change", function () {
      let value = parseInt($(this).val());
      if (isNaN(value) || value < 1) {
        $(this).val(1);
      }
    });
  }
}

class ProductManager {
  constructor(db) {
    this.db = db;
    this.productsRef = collection(db, "products");
    this.cache = new Map();
  }

  async getProductsByBrand(brandName) {
    console.log("Getting products for brand:", brandName);
    try {
      const q = query(this.productsRef, where("brand", "==", brandName));
      const snapshot = await getDocs(q);
      console.log("Found products:", snapshot.size);
      return {
        products: snapshot.docs.map((doc) => doc.data()),
        total: snapshot.size,
      };
    } catch (err) {
      console.error("Error in getProductsByBrand:", err);
      throw err;
    }
  }
  async getProductsByCategory(category) {
    if (!category) {
      throw new Error("Category parameter is required");
    }

    console.log("Getting products for category:", category);
    try {
      const q = query(this.productsRef, where("category", "==", category));
      const snapshot = await getDocs(q);
      console.log("Found products:", snapshot.size);
      return {
        products: snapshot.docs.map((doc) => doc.data()),
        total: snapshot.size,
      };
    } catch (err) {
      console.error("Error in getProductsByCategory:", err);
      throw err;
    }
  }

  async getAllProducts() {
    if (this.cache.has("allProducts")) {
      return this.cache.get("allProducts");
    }
    try {
      const snapshot = await getDocs(this.productsRef);
      return snapshot.docs.map((doc) => doc.data());
      this.cache.set("allProducts", products);
      return products;
    } catch (err) {
      console.error("Error fetching all products:", err);
      throw err;
    }
  }

  async getOnSaleProducts() {
    try {
      const snapshot = await getDocs(this.productsRef);
      return snapshot.docs
        .map((doc) => doc.data())
        .filter((product) => product.salePrice);
    } catch (err) {
      console.error("Error fetching sale products:", err);
      throw err;
    }
  }
  async getProductByCode(productCode) {
    try {
      const q = query(
        this.productsRef,
        where("productCode", "==", productCode)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log("No product found with code:", productCode);
        return null;
      }

      return snapshot.docs[0].data();
    } catch (err) {
      console.error("Error getting product by code:", err);
      throw err;
    }
  }

  saveProductData(product) {
    localStorage.removeItem("selectedProduct");
    localStorage.setItem("selectedProduct", JSON.stringify(product));
    console.log("Saved product data:", product);
  }

  // generateProductHTML(product, productUrl, productInCart = null) {
  //   const productId = product.productCode || product.id;
  //   const percentageOff = product.salePrice
  //     ? ((product.regularPrice - product.salePrice) / product.regularPrice) * 100
  //     : 0;
  //     const cartManager = new CartManager(); // Add this line

  //   return `
  //     <div class="col-lg-4 col-md-4 col-sm-6 product">
  //       <div class="product-inner card">
  //         <div class="thumb">
  //           <a href="${productUrl}" data-product='${JSON.stringify(product)}' class="image product-link">
  //             <img class="first-image product-img" src="${product.main_image}" alt="Product" />
  //             <img class="second-image fit-image" src="${product.main_image}" alt="Product" />
  //           </a>
  //           ${product.salePrice ? `<span class="badges"><span class="sale">-${percentageOff.toFixed(0)}%</span></span>` : ""}
  //         </div>
  //         <div class="content">
  //           <h5 class="title">
  //             <a href="${productUrl}" class="product-link" data-product='${JSON.stringify(product)}'>${product.name}</a>
  //           </h5>
  //           <div class="d-flex align-items-center">
  //             <h5 class="new mb-0">GH₵ ${product.salePrice || product.regularPrice}</h5>
  //             ${product.salePrice ? `<span class="old ms-2 text-muted">GH₵ ${product.regularPrice}</span>` : ""}
  //           </div>
  //           ${this.generateCartButton(product, productInCart,productId)}
  //         </div>
  //       </div>
  //     </div>`;
  // }
  generateProductHTML(product, productInCart = null) {
    const productId = product.productCode || product.id;
    const percentageOff = product.salePrice
      ? ((product.regularPrice - product.salePrice) / product.regularPrice) *
        100
      : 0;

    // Generate the new static URL
    const productSlug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const productUrl = `dist/products/${product.productCode}-${productSlug}.html`;

    return `
          <div class="col-lg-4 col-md-4 col-sm-6 product">
              <div class="product-inner card">
                  <div class="thumb">
                      <a href="${productUrl}" class="image product-link" data-product-code="${
      product.productCode
    }">
                          <img class="first-image product-img" src="${
                            product.main_image
                          }" alt="${product.name}" />
                          <img class="second-image fit-image" src="${
                            product.main_image
                          }" alt="${product.name}" />
                      </a>
                      ${
                        product.salePrice
                          ? `<span class="badges"><span class="sale">-${percentageOff.toFixed(
                              0
                            )}%</span></span>`
                          : ""
                      }
                  </div>
                  <div class="content">
                      <h5 class="title">
                          <a href="${productUrl}" class="product-link" data-product-code="${
      product.productCode
    }">${product.name}</a>
                      </h5>
                      <div class="d-flex align-items-center">
                          <h5 class="new mb-0">GH₵ ${
                            product.salePrice || product.regularPrice
                          }</h5>
                          ${
                            product.salePrice
                              ? `<span class="old ms-2 text-muted">GH₵ ${product.regularPrice}</span>`
                              : ""
                          }
                      </div>
                      ${this.generateCartButton(
                        product,
                        productInCart,
                        productId
                      )}
                  </div>
              </div>
          </div>`;
  }

  generateCartButton(product, productInCart, productId) {
    const cartManager = new CartManager();
    if (productInCart) {
      return `
          <div class="d-flex align-items-center justify-content-center">
            <a class="btn btn-primary btn-sm decreaseBtn" data-dic="${productId}">-</a>
            <span class="mx-2 itemQty-${productId}"  id="itemQty">${productInCart.quantity}</span>
            <a class="btn btn-primary btn-sm increaseBtn" data-dic="${productId}">+</a>
          </div>`;
    }
    return `
        <a class="btn btn-primary mt-2 cartBtn" 
          data-prod-id="${productId}"
          data-code="${product.productCode}"
          data-name="${product.name}"
          data-price="${product.salePrice || product.regularPrice}"
          data-imageurl="${product.main_image}">
          Add to Cart
        </a>`;
  }
}

// Extend ShopApp class with product and cart functionality
Object.assign(ShopApp.prototype, {
  setupShopPage() {
    this.productManager = new ProductManager(db);
    this.cartManager = new CartManager();

    // Setup category click handlers
    this.setupCategoryListeners();
    this.setupProductNavigation();

    // Check URL parameters
    const brandName = utils.getUrlParameter("brand");
    const category = utils.getUrlParameter("category");

    console.log("Initial category:", category); // Debug log

    if (brandName) {
      this.loadBrandProducts(brandName);
    } else if (category) {
      this.loadCategoryProducts(category);
    } else {
      this.loadAllProducts();
    }
  },

  async getProductsByBrand(brandName) {
    console.log("Getting products for brand:", brandName);
    try {
      const q = query(this.productsRef, where("brand", "==", brandName));
      const snapshot = await getDocs(q);
      console.log("Found products:", snapshot.size);
      return {
        products: snapshot.docs.map((doc) => doc.data()),
        total: snapshot.size,
      };
    } catch (err) {
      console.error("Error in getProductsByBrand:", err);
      throw err;
    }
  },

  async loadAllProducts() {
    try {
      const products = await this.productManager.getAllProducts();
      this.renderProducts(products);
    } catch (err) {
      console.error("Error loading all products:", err);
    }
  },
});

// Initialize the application
const app = new ShopApp();

// Export necessary functions and objects
export { utils, CONFIG, state, db };

class AuthManager {
  constructor() {
    this.auth = getAuth();
    this.setupAuthStateObserver();
  }

  setupAuthStateObserver() {
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this.recentlyViewedManager = new RecentlyViewedManager(user.uid);
        this.handleAuthenticatedUser(user);
        // If on single product page, display recently viewed
        if (window.location.pathname.includes("single-product.html")) {
          this.recentlyViewedManager.displayRecentlyViewed();
        }
      } else {
        this.handleUnauthenticatedUser();
        this.recentlyViewedManager = null;
      }
    });
  }

  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      sessionStorage.setItem("userID", userCredential.user.uid);
      window.location.href = "index.html";
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  async signup(email, password, userData) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      await this.saveUserDetails(userCredential.user.uid, {
        ...userData,
        email,
      });
      window.location.href = "index.html";
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  }

  async logout() {
    try {
      await signOut(this.auth);
      window.location.href = "index.html";
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }

  async saveUserDetails(userId, userData) {
    try {
      await setDoc(doc(db, "User", userId), {
        ...userData,
        user_id: userId,
      });
    } catch (error) {
      console.error("Error saving user details:", error);
      throw error;
    }
  }

  handleAuthenticatedUser(user) {
    $("#isNewUserText").hide();
    $(".isLoggedIn").show();
    $(".notLoggedIn").hide();

    if (window.location.pathname === "/login.html") {
      window.location.href = "index.html";
    }

    if (window.location.pathname === "/checkout.html") {
      $("#CheckoutBtn").attr("disabled", false);
      $("#isNewUserText").hide();
    }
  }

  handleUnauthenticatedUser() {
    $(".isLoggedIn").hide();
    $(".notLoggedIn").show();

    if (window.location.pathname === "/checkout.html") {
      $("#CheckoutBtn").attr("disabled", true);
      $("#isNewUserText").show();
    }
  }
}

class OrderManager {
  constructor(userId) {
    this.userId = userId;
    this.ordersRef = collection(db, "Orders");
  }

  async processOrder() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    if (!cart.length) return;

    const orderData = {
      orderId: utils.generateOrderID(),
      items: cart,
      totalAmount: cart.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      ),
      orderedBy: this.userId,
      createdAt: serverTimestamp(),
      status: "Processing",
    };

    try {
      await addDoc(this.ordersRef, orderData);
      localStorage.removeItem("cart");
      utils.showToast("orderToast");
      window.location.href = "account.html";
    } catch (error) {
      console.error("Error processing order:", error);
      throw error;
    }
  }

  async fetchOrders() {
    try {
      const q = query(this.ordersRef, where("orderedBy", "==", this.userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching orders:", error);
      throw error;
    }
  }

  generateOrderHTML(order) {
    return order.items
      .map(
        (item) => `
      <tr>
        <td class="align-middle border-top-0 w-0">
          <a href="#"><img width="50" height=50 src="${item.imageUrl}" alt="${
          item.title
        }" class="icon-shape icon-xl" /></a>
        </td>
        <td class="align-middle border-top-0">
          <a href="#" class="fw-semibold text-inherit">
            <h6 class="mb-0">${item.title}</h6>
          </a>
          <span><small class="text-muted">${item.code}</small></span>
        </td>
        <td class="align-middle border-top-0">
          <a href="#" class="text-inherit">${order.orderId}</a>
        </td>
        <td class="align-middle border-top-0">${order.createdAt
          .toDate()
          .toDateString()}</td>
        <td class="align-middle border-top-0">${item.quantity}</td>
        <td class="align-middle border-top-0">
          <span class="badge bg-${
            order.status === "Completed"
              ? "success"
              : order.status === "Canceled"
              ? "danger"
              : "warning"
          }">${order.status}</span>
        </td>
        <td class="align-middle border-top-0">GH₵ ${utils.formatTotal(
          item.price * item.quantity
        )}</td>
        <td class="text-muted align-middle border-top-0">
          <a href="#" class="text-inherit" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="View">
            <i class="fa fa-eye"></i>
          </a>
        </td>
      </tr>
    `
      )
      .join("");
  }
}

// Extend ShopApp with auth and order functionality
Object.assign(ShopApp.prototype, {
  setupAuthStateObserver() {
    this.authManager = new AuthManager();
  },

  setupLoginPage() {
    $("#loadButton").click(async (e) => {
      e.preventDefault();
      const email = $("#loginemail").val();
      const password = $("#loginpassword").val();

      try {
        await this.authManager.login(email, password);
      } catch (error) {
        // Handle login error (show message to user)
        console.error(error);
      }
    });
  },

  setupSignupPage() {
    $("#createAccBtn").click(async (e) => {
      e.preventDefault();
      const email = $("#useremail").val();
      const password = $("#userpassword").val();
      const fullname = $("#fullname").val();
      const phone = $("#phonenumber").val();

      try {
        await this.authManager.signup(email, password, {
          fullname,
          phoneNumber: phone,
        });
      } catch (error) {
        // Handle signup error (show message to user)
        console.error(error);
      }
    });
  },

  async setupAccountPage() {
    if (!this.authManager.auth.currentUser) return;

    this.orderManager = new OrderManager(this.authManager.auth.currentUser.uid);

    try {
      const orders = await this.orderManager.fetchOrders();
      const ordersHTML = orders
        .map((order) => this.orderManager.generateOrderHTML(order))
        .join("");
      $("#ordersTableBody").html(ordersHTML);
    } catch (error) {
      console.error("Error setting up account page:", error);
    }
  },
});
