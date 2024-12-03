import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG = {
  firebase: {
    apiKey: "AIzaSyA9zpMXYhN82wBiny75T3Rf32U7l55CEu0",
    authDomain: "deebee-shop.firebaseapp.com",
    projectId: "deebee-shop",
    storageBucket: "deebee-shop.appspot.com",
    messagingSenderId: "388424027848",
    appId: "1:388424027848:web:16a9062a542dd2d0101ffd",
  },
};

// Initialize Firebase
const app = initializeApp(CONFIG.firebase);
const db = getFirestore(app);

async function generateProductPages() {
  try {
    const template = await fs.readFile(
      "templates/product-template.html",
      "utf-8"
    );
    const productsSnapshot = await getDocs(collection(db, "products"));

    console.log("Retrieved products from Firebase:", productsSnapshot.size);
    if (productsSnapshot.empty) {
      console.log("No products found in Firebase!");
      return;
    }

    await fs.mkdir("dist/products", { recursive: true });

    for (const doc of productsSnapshot.docs) {
      const product = doc.data();
      const productSlug = product.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      const fileName = `${product.productCode}-${productSlug}.html`;

      // Generate gallery HTML
      const galleryHTML =
        product.other_images
          ?.map(
            (img) => `
                <div class="swiper-slide">
                    <a class="gallery-image" href="${img}">
                        <img src="${img}" alt="${product.name}">
                    </a>
                </div>
            `
          )
          .join("") || "";

      const thumbsHTML =
        product.other_images
          ?.map(
            (img) => `
                <div class="swiper-slide">
                    <img src="${img}" alt="${product.name}">
                </div>
            `
          )
          .join("") || "";

      // Replace all placeholders in template
      let productHTML = template
        .replace(/{{META_TITLE}}/g, product.metaTitle || product.name)
        .replace(
          /{{META_DESCRIPTION}}/g,
          product.metaDescription || product.shortDescription
        )
        .replace(/{{PRODUCT_NAME}}/g, product.name)
        .replace(/{{PRODUCT_IMAGE}}/g, product.main_image)
        .replace(/{{PRODUCT_CODE}}/g, product.productCode)
        .replace(
          /{{CANONICAL_URL}}/g,
          `https://yoursite.com/products/${fileName}`
        )
        .replace(
          /{{PRODUCT_PRICE}}/g,
          product.salePrice || product.regularPrice
        )
        .replace(/{{SHORT_DESCRIPTION}}/g, product.shortDescription || "")
        .replace(/{{PRODUCT_DESCRIPTION}}/g, product.description || "")
        .replace(
          /{{AVAILABILITY}}/g,
          product.isAvailable ? "In Stock" : "Out of Stock"
        )
        .replace(/{{PRODUCT_WEIGHT}}/g, product.weight || "N/A")
        .replace(/{{PRODUCT_BRAND}}/g, product.brand || "N/A")
        .replace(/{{PRODUCT_UNIT}}/g, product.unit || "N/A")
        .replace(/{{PRODUCT_MANUFACTURER}}/g, product.manufacturer || "N/A")
        .replace(
          "{{PRODUCT_GALLERY}}",
          `
                    <div class="swiper-slide">
                        <a class="gallery-image" href="${product.main_image}">
                            <img src="${product.main_image}" alt="${product.name}">
                        </a>
                    </div>
                    ${galleryHTML}
                `
        )
        .replace(
          "{{PRODUCT_THUMBS}}",
          `
                    <div class="swiper-slide">
                        <img src="${product.main_image}" alt="${product.name}">
                    </div>
                    ${thumbsHTML}
                `
        );

      // Add sale price if exists
      if (product.salePrice) {
        productHTML = productHTML.replace(
          "{{SALE_PRICE_HTML}}",
          `<span class="old-price">GH₵ ${product.regularPrice}</span>`
        );
      } else {
        productHTML = productHTML.replace("{{SALE_PRICE_HTML}}", "");
      }

      await fs.writeFile(`dist/products/${fileName}`, productHTML);
      console.log(`Generated: ${fileName}`);
    }

    await generateProductIndex(productsSnapshot.docs);
    console.log("All product pages generated successfully!");
  } catch (error) {
    console.error("Error generating product pages:", error);
  }
}

async function generateProductIndex(products) {
  try {
    console.log("Starting index generation with products:", products.length);

    const indexTemplate = await fs.readFile(
      "templates/products-index.html",
      "utf-8"
    );
    console.log("Loaded index template");

    const productGrid = products
      .map((doc) => {
        const product = doc.data();
        console.log("Processing product:", product); // Debug log

        const productSlug = product.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-");
        const fileName = `${product.productCode}-${productSlug}.html`;

        return `
                <div class="col-lg-4 col-md-6 col-sm-6 mb-8">
                    <div class="product-item">
                        <div class="product-img">
                            <a href="/products/${fileName}">
                                <img class="primary-img" 
                                     src="${product.main_image}" 
                                     alt="${product.name}"
                                     style="width: 100%; height: 200px; object-fit: contain;">
                            </a>
                        </div>
                        <div class="product-content">
                            <h5 class="title">
                                <a href="/products/${fileName}">${
          product.name
        }</a>
                            </h5>
                            <div class="price-box">
                                <span class="regular-price">GH₵ ${
                                  product.salePrice || product.regularPrice
                                }</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
      })
      .join("\n");

    console.log("Generated product grid HTML:", productGrid); // Debug log

    // Make sure we're replacing the correct placeholder
    const indexHTML = indexTemplate.replace("{{PRODUCT_GRID}}", productGrid);

    await fs.writeFile("dist/products/index.html", indexHTML);
    console.log("Index file written successfully");
  } catch (error) {
    console.error("Error in generateProductIndex:", error);
  }
}

generateProductPages();
