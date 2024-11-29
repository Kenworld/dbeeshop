//firebase init
import { initializeApp } from "@firebase/app";
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
} from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyA9zpMXYhN82wBiny75T3Rf32U7l55CEu0",
  authDomain: "deebee-shop.firebaseapp.com",
  projectId: "deebee-shop",
  storageBucket: "deebee-shop.appspot.com",
  messagingSenderId: "388424027848",
  appId: "1:388424027848:web:16a9062a542dd2d0101ffd",
};
initializeApp(firebaseConfig);
//Firebase
const db = getFirestore();
const itemsPerPage = 6; // Change this to your preferred number of items per page
let currentPage = 1;
let totalPages = 1;
document.addEventListener("DOMContentLoaded", () => {
  $(document).ready(function () {
    //Load Cart
    updateCartCount();
    //Populate Top Selling Products
    Products();
    //Populate All products on Shop Page
    //LoadAllProducts();
    GetOnSaleProducts();
    DisplayCartItems();
    $(".isLoggedIn").hide();
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        $("#isNewUserText").hide();
        $(".isLoggedIn").show();
        $(".notLoggedIn").hide();
        const uid = user.uid;
        const userID = sessionStorage.getItem("userID");
        // Check if the current page is the login page
        if (window.location.pathname === "/login.html") {
          // Redirect the user to index.html after login
          window.location.href = "index.html";
        }
        if (uid == userID) {
        }

        if (window.location.pathname === "/account.html") {
          GetUserData(uid);
          $("#saveAddressBtn").click(function () {
            const addressFullname = $("#addressFullname").val();
            const addressphone = $("#addressPhone").val();
            const address = $("#address").val();
            const region = $("#region option:selected").val();
            const city = $("#city").val();

            saveUserAddress(
              uid,
              addressFullname,
              addressphone,
              address,
              region,
              city
            );
          });

          $("#UpdateAddressBtn").click(function () {
            UpdateAddressDetails(uid, $("#docid").text());
          });
          $("#LogoutBtn").click(function () {
            Logout();
          });
          fetchOrders(uid);
        }

        if (window.location.pathname === "/single-product.html") {
          const urlParams = new URLSearchParams(window.location.search);
          const productCode = urlParams.get("code");
          SaveRecentlyViewedProducts(productCode, uid);
        }

        if (window.location.pathname === "/checkout.html") {
          GetUserData(uid);
          console.log("Vibes " + uid);
          $("#CheckoutBtn").click(function () {
            ProcessOrder(uid);
          });
        }
      } else {
        if (window.location.pathname === "/checkout.html") {
          $("#CheckoutBtn").attr("disabled", true);
          $("#isNewUserText").show();
        }
      }
    });
    if (window.location.pathname === "/login.html") {
      const signButton = document.getElementById("loadButton");

      signButton.addEventListener("click", () => {
        loadButton.disabled = true;
        loader.style.display = "inline-block";

        const loginemail = document.getElementById("loginemail").value;
        const loginepassword = document.getElementById("loginpassword").value;

        LoginUser(loginemail, loginepassword);
      });
    }
    if (window.location.pathname === "/signup.html") {
      const createAccBtn = document.getElementById("createAccBtn");

      createAccBtn.addEventListener("click", () => {
        createAccBtn.disabled = true;
        loader.style.display = "inline-block";

        const useremail = document.getElementById("useremail").value;
        const userpassword = document.getElementById("userpassword").value;

        SignUpUser(useremail, userpassword);
      });
    }
    if (window.location.pathname === "/single-product.html") {
      console.log("Single Product Page Detected");
      const urlParams = new URLSearchParams(window.location.search);
      const productCode = urlParams.get("code");
      // Try to get the product data from localStorage
      const cachedProduct = JSON.parse(localStorage.getItem("selectedProduct"));
      console.log("productCode found " + productCode);
      if (cachedProduct) {
        console.log("Cache found " + cachedProduct);
        $("#addToCartButtonSinglepage").click(function () {
          if (cachedProduct.salePrice) {
            AddToCart(
              cachedProduct.dic,
              cachedProduct.productCode,
              cachedProduct.name,
              cachedProduct.salePrice,
              cachedProduct.main_image
            );
          } else {
            AddToCart(
              cachedProduct.dic,
              cachedProduct.productCode,
              cachedProduct.name,
              cachedProduct.regularPrice,
              cachedProduct.main_image
            );
          }
        });
        displayProductDetails(cachedProduct);
      } else {
        console.log("no Cached product");
      }
     
    }
 //Get Product by brand
      const brandName = getUrlParameter("brand");
      console.log("Brand Name Found: " + brandName);
      if (brandName) {
        console.log("Brand Name Found: " + brandName);
        GetProductByBrand(brandName);
      
      }else{
        LoadAllProducts();
        console.log("No Brand Name Found");
      }
    function LoginUser(email, password) {
      signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          // Signed in
          const user = userCredential.user;

          // Store the user ID in session storage
          sessionStorage.setItem("userID", user.uid);

          signButton.disabled = false;
          loader.style.display = "none";

          // Optional: Redirect the user to another page after login
          window.location.href = "index.html";
        })
        .catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;

          // Handle errors here
          console.error("Error during sign-in:", errorMessage);
        });
    }
    function SignUpUser(email, password) {
      createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          // Signed up
          const user = userCredential.user;
          SaveUserDetails(user.uid, email);
        })
        .catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;
          $(".errorMsg").val(errorMessage);
          // ..
        });
    }
    function Logout() {
      signOut(auth)
        .then(() => {
          window.location.href = "index.html";
        })
        .catch((error) => {
          console.log(error.message);
        });
    }

    async function SaveUserDetails(userID, email) {
      let fullname = $("#fullname").val();
      let phone = $("#phonenumber").val();
      var userData = {
        fullname: fullname,
        phoneNumber: phone,
        email: email,
        user_id: userID,
      };
      try {
        // Use setDoc with userID as the document ID
        await setDoc(doc(db, "User", userID), userData);
        window.location.href = "index.html";
      } catch (error) {
        console.log("Error saving user details:", error);
      }
    }
  });
  // Function to save product data to localStorage
  function saveProductData(product) {
    localStorage.removeItem("selectedProduct"); // Clear any old product data
    localStorage.setItem("selectedProduct", JSON.stringify(product));
    console.log(JSON.stringify(product));
  }
  function updateProductCountDisplay(totalProducts) {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalProducts);
    const productCountText = `Showing ${startItem}–${endItem} of ${totalProducts} results`;
    $("#productCountDisplay").text(productCountText);
  }

  function hyphenateTitle(title) {
    return title
      .toLowerCase() // Convert to lowercase
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, ""); // Remove any non-alphanumeric characters except hyphens
  }
  //Get Top Selling Products
  async function Products() {
    const productList = $("#topSalesProductList");
    let htmlContent = "";

    try {
      const productsRef = collection(db, "products");
      const snapshot = await getDocs(productsRef);

      snapshot.docs.forEach((doc) => {
        const products = doc.data();
        const hyphenatedTitle = hyphenateTitle(products.metaTitle);
        const productUrl = `single-product.html?code=${
          products.productCode
        }&metatitle=${encodeURIComponent(hyphenatedTitle)}`;
        htmlContent += generateTopSellingProductHTML(products, productUrl);
      });

      // Append HTML content to DOM once
      productList.empty().append(htmlContent);

      // Event delegation for dynamically generated elements
      productList.on("click", ".product-link", function (e) {
        e.preventDefault();
        const product = JSON.parse($(this).attr("data-product"));
        saveProductData(product);
        window.location.href = $(this).attr("href");
      });
    } catch (err) {
      console.log(err.message);
    }
  }
  $("#mainShopSearch").on("input", function () {
    const searchQuery = $(this).val();
    SearchProducts(searchQuery);
  });
  async function SearchProducts(searchQuery = "") {
    let productTotal = 0;
    let totalProducts = 0;
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const productList = $("#allProductsList");
    productList.empty();
    let htmlContent = "";
    try {
      const productsRef = collection(db, "products");
      const snapshot = await getDocs(productsRef);
      const allProducts = snapshot.docs.map((doc) => doc.data());
      // Calculate total pages based on items per page
      totalPages = Math.ceil(allProducts.length / itemsPerPage);
      totalProducts = snapshot.size;
      // Slice products for current page
      const startIndex = (currentPage - 1) * itemsPerPage;
      const paginatedProducts = allProducts.slice(
        startIndex,
        startIndex + itemsPerPage
      );

      paginatedProducts.forEach((product) => {
        if (product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
          const hyphenatedTitle = hyphenateTitle(product.metaTitle);
          const productUrl = `single-product.html?code=${
            product.productCode
          }&metatitle=${encodeURIComponent(hyphenatedTitle)}`;
          const productInCart = cart.find(
            (item) => item.code === product.productCode
          );
          htmlContent += generateAllProductHTML(
            product,
            productUrl,
            product.id,
            productInCart
          );
          productList.empty().append(htmlContent);
          bindEventListeners();

          // Update pagination controls
          updatePaginationControls(totalPages);
          updateProductCountDisplay(totalProducts);
        }
      });
    } catch (err) {
      console.log(err.message);
    }
  }
  //Get All Products
  async function LoadAllProducts() {
    let productTotal = 0;
    let totalProducts = 0;
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const productList = $("#allProductsList");
    productList.empty();
    let htmlContent = "";

    try {
      const productsRef = collection(db, "products");
      const snapshot = await getDocs(productsRef);
      const allProducts = snapshot.docs.map((doc) => doc.data());

      // Calculate total pages based on items per page
      totalPages = Math.ceil(allProducts.length / itemsPerPage);
      totalProducts = snapshot.size;
      // Slice products for current page
      const startIndex = (currentPage - 1) * itemsPerPage;
      const paginatedProducts = allProducts.slice(
        startIndex,
        startIndex + itemsPerPage
      );

      paginatedProducts.forEach((product) => {
        productTotal++;
        const hyphenatedTitle = hyphenateTitle(product.metaTitle);
        const productUrl = `single-product.html?code=${
          product.productCode
        }&metatitle=${encodeURIComponent(hyphenatedTitle)}`;

        const productInCart = cart.find(
          (item) => item.code === product.productCode
        );
        htmlContent += generateAllProductHTML(
          product,
          productUrl,
          product.id,
          productInCart
        );
      });

      // Update DOM
      productList.empty().append(htmlContent);
      bindEventListeners();

      // Update pagination controls
      updatePaginationControls(totalPages);
      updateProductCountDisplay(totalProducts);
      // Event delegation for dynamically generated elements
      productList.on("click", ".product-link", function (e) {
        e.preventDefault();
        const product = JSON.parse($(this).attr("data-product"));
        saveProductData(product);
        window.location.href = $(this).attr("href");
      });
    } catch (err) {
      console.log(err.message);
    }
  }
  async function GetProductByBrand(brandName) {
    let productTotal = 0;
    let totalProducts = 0;
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const productList = $("#allProductsList");
    productList.empty();
    let htmlContent = "";

    try {
        const productsRef = collection(db, "products");
        // Create a query to filter by brand
        const q = query(productsRef, where("brand", "==", brandName));
        const snapshot = await getDocs(q);
        const brandProducts = snapshot.docs.map((doc) => doc.data());

        // Calculate total pages based on filtered items
        totalPages = Math.ceil(brandProducts.length / itemsPerPage);
        totalProducts = brandProducts.length;
        
        // Slice products for current page
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedProducts = brandProducts.slice(
            startIndex,
            startIndex + itemsPerPage
        );

        paginatedProducts.forEach((product) => {
            productTotal++;
            const hyphenatedTitle = hyphenateTitle(product.metaTitle);
            const productUrl = `single-product.html?code=${
                product.productCode
            }&metatitle=${encodeURIComponent(hyphenatedTitle)}`;

            const productInCart = cart.find(
                (item) => item.code === product.productCode
            );
            htmlContent += generateAllProductHTML(
                product,
                productUrl,
                product.id,
                productInCart
            );
        });

        // Update DOM
        productList.empty().append(htmlContent);
        bindEventListeners();

        // Update pagination controls
        updatePaginationControls(totalPages);
        updateProductCountDisplay(totalProducts);
        
        // Event delegation for dynamically generated elements
        productList.on("click", ".product-link", function (e) {
            e.preventDefault();
            const product = JSON.parse($(this).attr("data-product"));
            saveProductData(product);
            window.location.href = $(this).attr("href");
        });
    } catch (err) {
        console.log(err.message);
    }
}
  function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    LoadAllProducts();
  }

  async function GetOnSaleProducts() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const saleProductList = $("#allSaleProductsList"); // Use the sale products list element
    let htmlContent = "";

    try {
      const productsRef = collection(db, "products");
      const snapshot = await getDocs(productsRef);

      snapshot.docs.forEach((doc) => {
        const product = doc.data();

        // Check if salePrice is available
        if (product.salePrice) {
          const hyphenatedTitle = hyphenateTitle(product.metaTitle);
          const productUrl = `single-product.html?code=${
            product.productCode
          }&metatitle=${encodeURIComponent(hyphenatedTitle)}`;
          const productInCart = cart.find(
            (item) => item.code === product.productCode
          );

          // Use the generateProductsOnSaleHTML function to create HTML for on-sale products
          htmlContent += generateProductsOnSaleHTML(
            product,
            productUrl,
            doc.id,
            productInCart
          );
        }
      });

      // Append HTML content to #allSaleProductsList once
      saleProductList.empty().append(htmlContent);

      // Bind event listeners for on-sale products after loading
      bindEventListeners();
    } catch (err) {
      console.log(err.message);
    }
  }

  function bindEventListeners() {
    
    const productList = $("#allProductsList");

    // Event delegation for dynamically generated elements
    productList.off("click", ".cartBtn"); // Remove previous event listeners
    productList.on("click", ".cartBtn", function (e) {
      e.preventDefault();
      const prod_id = $(this).data("prod-id");
      const code = $(this).data("code");
      const name = $(this).data("name");
      const price = $(this).data("price");
      const imageurl = $(this).data("imageurl");
      console.log(prod_id);
      console.log(code);
      // Call AddToCart with the product data
      AddToCart(prod_id, code, name, price, imageurl);
    });

    productList.off("click", ".decreaseBtn"); // Remove previous event listeners
    productList.on("click", ".decreaseBtn", function (e) {
      e.preventDefault();
      const code = $(this).data("dic");
      // Call updateCartQuantity with the product data
      updateCartQuantity(code, "decrease");
      console.log(code);
    });

    productList.off("click", ".increaseBtn"); // Remove previous event listeners
    productList.on("click", ".increaseBtn", function (e) {
      e.preventDefault();
      const code = $(this).data("dic");
      console.log(code);
      // Call updateCartQuantity with the product data
      updateCartQuantity(code, "increase");
    });
  }

  // Function to generate product HTML
  function generateTopSellingProductHTML(product, productUrl) {
    let producthtml = `
    <div class="swiper-slide">
      <div class="product-wrapper">
        <div class="product">
          <div class="thumb border-0">
            <a href="${productUrl}" data-product='${JSON.stringify(
      product
    )}' class="image product-link">
              <img class="fit-image product-img" src="${
                product.main_image
              }" alt="Product" />
              <img class="second-image fit-image" src="${
                product.main_image
              }" alt="Product Images" />
            </a>
            <span class="badges"><span class="sale">-18%</span></span>
            <div class="actions">
              <a href="wishlist.html" class="action wishlist"><i class="pe-7s-like"></i></a>
              <a href="compare.html" class="action compare"><i class="pe-7s-refresh-2"></i></a>
              <a href="${productUrl}" data-product='${JSON.stringify(
      product
    )}' class="action quickview product-link" data-bs-toggle="modal" data-bs-target="#quick-view"><i class="pe-7s-search"></i></a>
            </div>
            <div class="add-cart-btn">
              <button class="btn btn-whited btn-hover-primary text-capitalize add-to-cart" >Add To Cart</button>
            </div>
          </div>
          <div class="content">
            <h5 class="title"><a href="${productUrl}" class="product-link" data-product='${JSON.stringify(
      product
    )}'>${product.name}</a></h5>
  <span class="new">GHS ${product.regularPrice}</span>
            <span class="old"></span>
          </div>
        </div>
      </div>
    </div>
  `;
    return producthtml;
  }

  function generateAllProductHTML(product, productUrl, prod_id, productInCart) {
    const percentageOff =
      ((product.regularPrice - product.salePrice) / product.regularPrice) * 100;
    let producthtml = `
      <div class="col-lg-4 col-md-4 col-sm-6 product">
        <div class="product-inner card">
          <div class="thumb">
            <a href="${productUrl}" data-product='${JSON.stringify(
      product
    )}' class="image product-link">
              <img class="first-image product-img" src="${
                product.main_image
              }" alt="Product" />
              <img class="second-image fit-image" src="${
                product.main_image
              }" alt="Product" />
            </a>
            ${
              product.salePrice
                ? `<span class="badges"><span class="sale">-${percentageOff}%</span></span>`
                : ""
            }
          </div>
          <div class="content">
            <h5 class="title">
              <a href="${productUrl}" class="product-link" data-product='${JSON.stringify(
      product
    )}'>${product.name}</a>
            </h5>
            <div class="d-flex align-items-center">
              <h5 class="new mb-0">${
                product.salePrice
                  ? `GH₵ ${product.salePrice}`
                  : `GH₵ ${product.regularPrice}`
              }</h5>
              ${
                product.salePrice
                  ? `<span class="old ms-2 text-muted">GH₵ ${product.regularPrice}</span>`
                  : ""
              }
            </div>
            
            ${
              productInCart
                ? `
                  <div class="d-flex align-items-center justify-content-center">
                    <a class="btn btn-primary btn-sm decreaseBtn" data-dic="${product.dic}">-</a>
                      <span class="mx-2" id="itemQty">${productInCart.quantity}</span>
                    <a class="btn btn-primary btn-sm increaseBtn" data-dic="${product.dic}">+</a>
                  </div>
                `
                : `
                  <a class="btn btn-primary mt-2 cartBtn" 
                    data-prod-id="${prod_id}"
                    data-code="${product.productCode}"
                    data-name="${product.name}"
                    data-price="${product.salePrice || product.regularPrice}"
                    data-imageurl="${product.main_image}">
                    Add to Cart
                  </a>
                `
            }
          </div>
        </div>
      </div>`;
    return producthtml;
  }

  function generateProductsOnSaleHTML(
    product,
    productUrl,
    prod_id,
    productInCart
  ) {
    let productHtml = `
    <div class="col-xl-4">
        <!-- Single Product List Start -->
        <div class="single-product-list mb-6">
          <!-- Product List Thumb Start -->
          <div class="product">
            <div class="thumb">
              <a href="${productUrl}" data-product='${JSON.stringify(
      product
    )}' class="image">
                <img
                  class="fit-image first-image"
                  src="${product.main_image}"
                  alt="${product.name}" />
                <img
                  class="fit-image second-image"
                  src="${product.main_image}"
                  alt="${product.name}" />
              </a>
            </div>
          </div>
          <!-- Product List Thumb End -->

          <!-- Product List Content Start -->
          <div class="product-list-content">
            <h6 class="product-name">
              <a href="${productUrl}" data-product='${JSON.stringify(
      product
    )}'>${product.name}</a>
            </h6>
            <span class="ratings justify-content-start mb-3">
              <span class="rating-wrap">
                <span class="star" style="width: 67%"></span>
              </span>
              <span class="rating-num">(4)</span>
            </span>
            <span class="price">
              <span class="new">GHS ${product.salePrice}</span>
              <span class="old">GHS ${product.regularPrice}</span>
            </span>
          </div>
          <!-- Product List Content End -->
        </div>
        <!-- Single Product List End -->
      </div>
    `;
    return productHtml;
  }
  function updateCartQuantity(code, action) {
    console.log("Code: " + code + " Action: " + action);
    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    // Find the product in the cart
    const productIndex = cart.findIndex((item) => item.prod_id === code);

    if (productIndex !== -1) {
      if (action === "increase") {
        // Increase the quantity
        cart[productIndex].quantity += 1;
      } else if (action === "decrease") {
        // Decrease the quantity but ensure it doesn't go below 1
        if (cart[productIndex].quantity > 1) {
          cart[productIndex].quantity -= 1;
          if (cart[productIndex].quantity <= 0) {
            cart.splice(productIndex, 1); // Remove product if quantity is zero
          }
        } else {
          // Optionally, remove the product if the quantity goes to 0
          cart.splice(productIndex, 1);
        }
      }

      // Save the updated cart back to localStorage
      localStorage.setItem("cart", JSON.stringify(cart));
      LoadAllProducts();
      showToast();
    }
  }
  function displayProductDetails(product) {
    // Set product title, price, and description
    $(".currency").text("GHS ");
    $(".product-title").text(product.name);
    $(".regular-price").text(parseFloat(product.regularPrice));
    $(".shortDesc").html(product.shortDescription);
    $(".long-desc").html(product.longDescription);

    // Clear existing images in the gallery
    $(".product-gallery-top .swiper-wrapper").empty();
    $(".product-gallery-thumbs .swiper-wrapper").empty();

    // Check if product has images in the 'other_images' array
    if (product.other_images && product.other_images.length > 0) {
      product.other_images.forEach((imageUrl) => {
        // Add each image to the main product image gallery
        $(".product-gallery-top .swiper-wrapper").append(`
        <a class="swiper-slide w-100 popup-gallery" href="${imageUrl}">
          <img class="w-100" src="${imageUrl}" alt="Product">
        </a>
      `);

        // Add each image to the thumbnail gallery
        $(".product-gallery-thumbs .swiper-wrapper").append(`
        <div class="swiper-slide">
          <img src="${imageUrl}" alt="Product Thumbnail">
        </div>
      `);
      });
    } else {
      // Handle case where there are no additional images
      $(".product-gallery-top .swiper-wrapper").append(`
      <a class="swiper-slide w-100" href="default-image.jpg">
        <img class="w-100" src="default-image.jpg" alt="Product">
      </a>
    `);
      $(".product-gallery-thumbs .swiper-wrapper").append(`
      <div class="swiper-slide">
        <img src="default-image.jpg" alt="Product Thumbnail">
      </div>
    `);
    }

    // Disable editing on Quill editor (if applicable)
    $(".ql-editor").attr("contenteditable", "false");
    $(".ql-clipboard").attr("contenteditable", "false");
    $('.ql-tooltip input[type="text"]').css("display", "none");

    // Re-initialize Swiper (if necessary)
    if (typeof Swiper !== "undefined") {
      new Swiper(".product-gallery-top", {
        spaceBetween: 10,
        navigation: {
          nextEl: ".swiper-button-next",
          prevEl: ".swiper-button-prev",
        },
      });

      new Swiper(".product-gallery-thumbs", {
        spaceBetween: 10,
        slidesPerView: 4,
        freeMode: true,
        watchSlidesProgress: true,
      });
    }
  }

  //Account
  async function GetUserData(uid) {
    try {
      $("#UpdateAddressBtn").hide();
      $("#docid").hide();
      console.log("uid passed is " + uid);
      const q = query(collection(db, "User"), where("user_id", "==", uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        querySnapshot.forEach((doc) => {
          const user = doc.data();

          $("#username").text(user.fullname);
          $("#username2").text(user.fullname);
          $("#fullname").val(user.fullname);
          $("#email").val(user.email);
          $("#phone").val(user.phoneNumber);
          $("#addressFullname").val(user.fullname);
          $("#addressPhone").val(user.phoneNumber);
        });
        // Fetch address details from the Addresses subcollection
        const addressesSnapshot = await getDocs(
          collection(db, "User", uid, "Addresses")
        );
        if (!addressesSnapshot.empty) {
          $("#UpdateAddressBtn").show();
          $("#saveAddressBtn").hide();

          addressesSnapshot.forEach((doc) => {
            const address = doc.data();
            $("#docid").text(doc.id);
            $("#address").val(address.address);
            $("#region").val(address.region);
            $("#city").val(address.city);
            $("#noAddressText").hide();
            $("#nameText").text(address.fullname);
            $("#addressText").text(address.address);
            $("#phoneText").text(address.phoneNumber);
            $("#regionText").text(address.region);
            $("#cityText").text(address.city);

            //Checkout
            $("#checkOutUsername").text(address.fullname);
            $("#checkOutaddress").text(address.address);
            $("#checkOutlocation").text(address.region + " - " + address.city);
            $("#checkOutphone").text(address.phoneNumber);
          });
        } else {
          console.log("No address found for this user.");
        }
      } else {
        console.log("No user found with the specified UID.");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }

  //Save Recently viewed Items
  async function SaveRecentlyViewedProducts(code, userid) {
    var Data = {
      productCode: code,
      whoViewed: userid,
      viewedAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, "RecentlyViewed", `${userid}_${code}`), Data, {
        merge: true,
      });
    } catch (error) {
      console.log("Error saving recently viewed product:", error);
    }
  }
  // Function to save a new address for a specific user
  async function saveUserAddress(
    userId,
    fullname,
    phoneNumber,
    address,
    region,
    city
  ) {
    const addressData = {
      fullname: fullname,
      phoneNumber: phoneNumber,
      address: address,
      region: region,
      city: city,
      addedOn: serverTimestamp(),
    };
    try {
      // Reference to the 'Addresses' subcollection within the specific user's document
      const addressesRef = collection(db, `User/${userId}/Addresses`);

      // Add the address data as a new document in the 'Addresses' subcollection
      await addDoc(addressesRef, addressData);

      console.log("Address saved successfully!");
      const toastBootstrap = bootstrap.Toast.getOrCreateInstance(addressToast);
      toastBootstrap.show();
    } catch (error) {
      console.error("Error saving address:", error);
    }
  }

  async function UpdateAddressDetails(uid, addressId) {
    // Get the updated values from the input fields
    const newAddress = $("#address").val();
    const newRegion = $("#region option:selected").val(); // for select dropdown
    const newCity = $("#city").val();
    const newFullName = $("#addressFullname").val();
    const newPhoneNumber = $("#addressPhone").val();

    // Create an object to store the updated address details
    const updatedAddressData = {
      fullname: newFullName,
      phoneNumber: newPhoneNumber,
      address: newAddress,
      region: newRegion,
      city: newCity,
    };

    try {
      // Update the address document in the Addresses subcollection
      const addressRef = doc(db, "User", uid, "Addresses", addressId);
      await updateDoc(addressRef, updatedAddressData);
      console.log("Address updated successfully");
      const toastBootstrap = bootstrap.Toast.getOrCreateInstance(addressToast);
      toastBootstrap.show();
    } catch (error) {
      console.error("Error updating address:", error);
    }
  }
  function AddToCart(prod_id, code, name, price, imageurl) {
    const product = {
      prod_id: prod_id,
      code: code,
      title: name,
      price: price,
      imageUrl: imageurl,
      quantity: 1, // Default quantity is 1
    };

    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    const existingProductIndex = cart.findIndex(
      (item) => item.prod_id === product.prod_id
    );

    if (existingProductIndex !== -1) {
      // If the product already exists, increase its quantity by 1
      cart[existingProductIndex].quantity += 1;
    } else {
      // If it's a new product, add it to the cart with quantity 1
      cart.push(product);
    }

    localStorage.setItem("cart", JSON.stringify(cart));

    // Update cart count and product interface
    updateCartCount();

    // Re-render the product list to reflect the updated cart state
    LoadAllProducts(); // This will re-fetch the products and update the UI
    DisplayCartItems();
    showToast(); // Show notification without page reload
  }

  function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const cartSize = cart.reduce((total, item) => total + item.quantity, 0);
    $("#cartCount").html(cartSize);
  }
  function showToast() {
    var toastElement = document.getElementById("cartToast");
    var toast = new bootstrap.Toast(toastElement);
    toast.show();
  }

  //Display Cart Items in Modal
  function DisplayCartItems() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const cartList = $("#cartList");
    const cartListMain = $("#cartListMain");
    let cartTotalCount = 0;

    // Loop through each item in the cart and display it
    cart.forEach((item, index) => {
      cartTotalCount++;

      const cartUI = `
        <!-- Cart Product/Price Start -->
        <div class="cart-product-wrapper mb-4 pb-4 border-bottom">
            <!-- Single Cart Product Start -->
            <div class="single-cart-product">
                <div class="cart-product-thumb">
                    <a href="single-product.html?code=${item.code}"><img src="${item.imageUrl}" alt="${item.title}" /></a>
                </div>
                <div class="cart-product-content">
                    <h3 class="title">
                        <a href="single-product.html?code=${item.code}">${item.title}</a>
                    </h3>
                    <div class="product-quty-price">
                        <span class="cart-quantity">${item.quantity}<strong> × </strong></span>
                        <span class="price"><span class="old">${item.price}</span></span>
                    </div>
                </div>
            </div>
            <!-- Single Cart Product End -->
  
            <!-- Product Remove Start -->
            <div class="cart-product-remove" data-index="${index}">
                <a href="#"><i class="pe-7s-close"></i></a>
            </div>
            <!-- Product Remove End -->
        </div>
        <!-- Cart Product/Price End -->
      `;

      // Append each cart item to the cart list
      cartList.append(cartUI);
      $("#itemCount").text("(" + cartTotalCount + ")");
    });

    //Append the total UI after all items have been added
    const cartTotalUI = `
      <!-- Cart Product Total Start -->
      <div class="cart-product-total mb-4 pb-4 border-bottom">
          <span class="value">Total</span>
          <span class="price cart-product-total">${FormatTotal(
            calculateCartTotal()
          )}</span>
      </div>
      <!-- Cart Product Total End -->
  
      <!-- Cart Product Button Start -->
      <div class="cart-product-btn mt-4">
          <a href="cart.html" class="btn btn-light btn-hover-primary w-100"><i class="fa fa-shopping-cart"></i> View cart</a>
          <a href="checkout.html" class="btn btn-light btn-hover-primary w-100 mt-4"><i class="fa fa-share"></i> Checkout</a>
      </div>
      <!-- Cart Product Button End -->
    `;
    cartList.append(cartTotalUI); // Append the total UI after the loop

    //Populate Main Cart page table
    cart.forEach((item, index) => {
      const ItemRow = `
         <div class="product-item">
     <div class="row align-items-center">
                                <div class="col-3 product-image">
                                    <a href="#"><img src="${item.imageUrl}" alt="${item.title}" /></a>
                                </div>
                                <div class="col-5 product-details">
                                    <h6>${item.title}</h6>
                                    <p class="stock-status">In Stock</p>
                                    <button class="btn btn-outline-danger btn-sm" data-index="${index}">Remove</button>
                                </div>
                                <div class="col-4 price-section">
                                    <h6 class="price">GHS ${item.price}</h6>
                                    <h6 class="was-price">GHS 750.00</h6>
                                    <div class="quantity-controls">
                                        <button class="btn btn-sm btn-primary">-</button>
                                        <span class="mx-2"> ${item.quantity}</span>
                                        <button class="btn btn-sm btn-primary">+</button>
                                    </div>
                                </div>
                            </div>
                            </div>
      `;
      cartListMain.append(ItemRow);
      $("#subtotalMain").text(FormatTotal(calculateCartTotal()));
    });
  }

  // Attach remove item event
  $(".cart-product-remove").on("click", function () {
    const index = $(this).data("index");
    RemoveFromCart(index);
  });

  function RemoveFromCart(index) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    cart.splice(index, 1);
    localStorage.setItem("cart", JSON.stringify(cart));
    window.location.reload();
  }

  function calculateCartTotal() {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    let total = cart.reduce((accumulator, item) => {
      return accumulator + item.price * item.quantity;
    }, 0);

    return total;
  }

  function FormatTotal(amount) {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  async function fetchOrders(uid) {
    const ordersTableBody = $("#ordersTableBody");
    ordersTableBody.empty(); // Clear existing content

    try {
      const ordersRef = collection(db, "Orders"); // Reference to the Orders collection
      const q = query(ordersRef, where("orderedBy", "==", uid)); // Firestore query to get orders by user ID
      const ordersSnapshot = await getDocs(q); // Execute the query

      ordersSnapshot.forEach((doc) => {
        const order = doc.data();
        const orderDate = order.createdAt.toDate().toDateString();

        order.items.forEach((item) => {
          const orderHTML = `
            <tr>
              <td class="align-middle border-top-0 w-0">
                <a href="#"><img width="50" height=50 src="${
                  item.imageUrl
                }" alt="${item.title}" class="icon-shape icon-xl" /></a>
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
              <td class="align-middle border-top-0">${orderDate}</td>
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
              <td class="align-middle border-top-0">GHS ${FormatTotal(
                item.price * item.quantity
              )}</td>
              <td class="text-muted align-middle border-top-0">
                <a href="#" class="text-inherit" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="View">
                  <i class="fa fa-eye"></i>
                </a>
              </td>
            </tr>
          `;
          ordersTableBody.append(orderHTML);
        });
      });
    } catch (error) {
      console.error("Error fetching orders: ", error);
      alert("There was an error fetching your orders. Please try again.");
    }
  }

  function updatePaginationControls(totalPages) {
    const pagination = $("#pagination");
    pagination.empty();

    // Previous Button
    const prevDisabled = currentPage === 1 ? "disabled" : "";
    pagination.append(`
      <li class="page-item ${prevDisabled}">
        <a class="page-link rounded-0" href="#" data-page="${
          currentPage - 1
        }" aria-label="Previous">
          <span aria-hidden="true">&laquo;</span>
        </a>
      </li>
    `);

    // Page Numbers
    for (let i = 1; i <= totalPages; i++) {
      const active = i === currentPage ? "active" : "";
      pagination.append(`
        <li class="page-item ${active}">
          <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>
      `);
    }

    // Next Button
    const nextDisabled = currentPage === totalPages ? "disabled" : "";
    pagination.append(`
      <li class="page-item ${nextDisabled}">
        <a class="page-link rounded-0" href="#" data-page="${
          currentPage + 1
        }" aria-label="Next">
          <span aria-hidden="true">&raquo;</span>
        </a>
      </li>
    `);
  }
  // Delegate click event for pagination
  $(document).on("click", "#pagination a", function (event) {
    event.preventDefault();
    const page = parseInt($(this).data("page"), 10);

    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      goToPage(page);
    }
  });
});

async function ProcessOrder(uid) {
  const orderId = generateOrderID(); // Function to generate a unique order ID
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const totalAmount = parseInt($("#finalTotal").html(), 10);
  var toastElement = document.getElementById("orderToast");
  var toast = new bootstrap.Toast(toastElement);
  // toast.show();
  const orderData = {
    orderId: orderId,
    items: cart,
    totalAmount: totalAmount,
    orderedBy: uid,
    createdAt: serverTimestamp(),
    status: "Processing",
  };

  try {
    const orderRef = collection(db, "Orders");
    await addDoc(orderRef, orderData);
    toast.show();
    // Clear the cart
    localStorage.removeItem("cart");
    window.location.href = "account.html";
  } catch (error) {
    console.error("Error placing order: ", error);
    alert("There was an error placing your order. Please try again.");
  }
}
function generateOrderID() {
  return Math.random().toString(36).substr(2, 7).toUpperCase();
}
