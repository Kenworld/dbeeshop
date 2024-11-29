<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dee Bee Baby Shop</title>
    <!-- Favicons -->
    <link rel="icon" type="image/x-icon" href="assets/images/favicon.ico" />

    <!-- Vendor CSS (Icon Font) -->
    <link rel="stylesheet" href="assets/css/vendor/fontawesome.min.css" />
    <link rel="stylesheet" href="assets/css/vendor/pe-icon-7-stroke.min.css" />

    <!-- Plugins CSS (All Plugins Files) -->
    <link rel="stylesheet" href="assets/css/plugins/swiper-bundle.min.css" />
    <link rel="stylesheet" href="assets/css/plugins/animate.min.css" />
    <link rel="stylesheet" href="assets/css/plugins/lightgallery.min.css" />
    <link rel="stylesheet" href="assets/css/plugins/aos.min.css" />
    <link rel="stylesheet" href="assets/css/plugins/nice-select.min.css" />

    <!-- Main Style CSS -->
    <link rel="stylesheet" href="assets/css/style.css" />
</head>

<body>
    <!-- Header Section Start -->
    <div class="header section">
        <!-- Header Top Start -->
        <div class="header-top bg-primary">
            <div class="container">
                <div class="row align-items-center">
                    <!-- Header Top Message Start -->
                    <div class="col-12">
                        <div class="header-top-msg-wrapper text-center">
                            <p class="header-top-message text-center">
                                Up to 50% off for <strong>Christmas</strong> Collections
                                <a href="shop.html" class="btn btn-hover-dark btn-secondary">Shop Now</a>
                            </p>
                            <div class="header-top-close-btn">
                                <button class="top-close-btn">
                                    <i class="pe-7s-close"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <!-- Header Top Message End -->
                </div>
            </div>
        </div>
        <!-- Header Top End -->

        <!-- Header Bottom Start -->
        <div class="header-bottom">
            <div class="header-sticky">
                <div class="container">
                    <div class="row align-items-center position-relative">
                        <!-- Header Logo Start -->
                        <div class="col-md-6 col-lg-3 col-xl-2 col-6">
                            <div class="header-logo">
                                <a href="index.html"><img src="assets/images/logo/logo.webp" alt="Site Logo" /></a>
                            </div>
                        </div>
                        <!-- Header Logo End -->
                        <!-- Header Menu Start -->
                        <div class="col-lg-6 d-none d-lg-block">
                            <div class="main-menu">
                                <ul>
                                    <li><a href="index.html">Home</a></li>
                                    <li><a href="shop.html">Shop</a></li>
                                    <li><a href="brands.html">Shop By Brand</a></li>
                                </ul>
                            </div>
                        </div>
                        <!-- Header Menu End -->
                        <!-- Header Action Start -->
                        <div class="col-md-6 col-lg-3 col-xl-4 col-6 justify-content-end">
                            <div class="header-actions">
                                <a
                                    href="javascript:void(0)"
                                    class="header-action-btn header-action-btn-search d-none d-lg-block"><i class="pe-7s-search"></i></a>

                                <div class="dropdown-user d-none d-lg-block">
                                    <a href="javascript:void(0)" class="header-action-btn"><i class="pe-7s-user"></i></a>
                                    <ul class="dropdown-menu-user">
                                        <li class="notLoggedIn"><a class="dropdown-item" href="/login.html">Sign in</a></li>
                                        <li class="notLoggedIn">
                                            <a class="dropdown-item" href="/signup.html">Create Account</a>
                                        </li>
                                        <li class="isLoggedIn">
                                            <a class="dropdown-item" href="/account.html">My Account</a>
                                        </li>
                                    </ul>
                                </div>
                                <a
                                    href="wishlist.html"
                                    class="header-action-btn header-action-btn-wishlist">
                                    <i class="pe-7s-like"></i>
                                    <span class="header-action-num">10</span>
                                </a>
                                <a
                                    href="javascript:void(0)"
                                    class="header-action-btn header-action-btn-cart">
                                    <i class="pe-7s-cart"></i>
                                    <span class="header-action-num" id="cartCount"></span>
                                </a>
                                <!-- Mobile Menu Hambarger Action Button Start -->
                                <a
                                    href="javascript:void(0)"
                                    class="header-action-btn header-action-btn-menu d-lg-none d-md-block">
                                    <i class="fa fa-bars"></i>
                                </a>
                                <!-- Mobile Menu Hambarger Action Button End -->
                            </div>
                        </div>
                        <!-- Header Action End -->
                    </div>
                </div>
            </div>
        </div>
        <!-- Header Bottom Ends -->

        <!-- Offcanvas Search Start -->
        <div class="offcanvas-search">
            <div class="offcanvas-search-inner">
                <!-- Button Close Start -->
                <div class="offcanvas-btn-close">
                    <i class="pe-7s-close"></i>
                </div>
                <!-- Button Close End -->

                <!-- Offcanvas Search Form Start -->
                <form class="offcanvas-search-form" action="#">
                    <input
                        type="text"
                        placeholder="Search Product..."
                        class="offcanvas-search-input" />
                </form>
                <!-- Offcanvas Search Form End -->
            </div>
        </div>
        <!-- Offcanvas Search End -->
        <!-- Cart Offcanvas Start -->
        <div class="cart-offcanvas-wrapper">
            <div class="offcanvas-overlay"></div>

            <!-- Cart Offcanvas Inner Start -->
            <div class="cart-offcanvas-inner">
                <!-- Button Close Start -->
                <div class="offcanvas-btn-close">
                    <i class="pe-7s-close"></i>
                </div>
                <!-- Button Close End -->

                <!-- Offcanvas Cart Content Start -->
                <div class="offcanvas-cart-content" id="cartList">
                    <!-- Cart items will be inserted here by displayCartItems function -->

                    <!--------------------------------------------------------------------------------------------->

                </div>
                <!-- Offcanvas Cart Content End -->
            </div>
            <!-- Cart Offcanvas Inner End -->
        </div>
        <!-- Cart Offcanvas End -->

        <!-- Toast Notification -->
        <div aria-live="polite" aria-atomic="true" class="position-relative">
            <div class="toast-container position-fixed top-0 end-0 p-3" id="toast-container">
                <div id="cartToast" class="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="d-flex">
                        <div class="toast-body">
                            Added to cart!
                        </div>
                        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                    </div>
                </div>
            </div>
        </div>

        <!-- A Toast notification -->
    </div>
    <!-- Header Section End -->