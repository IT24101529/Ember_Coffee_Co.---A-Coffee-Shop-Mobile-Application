# Ember_Coffee_Co.---A-Coffee-Shop-Mobile-Application
# Requirements Document

---

## 1. Problem Statement

Ember Coffee Co. currently operates without a dedicated digital platform, relying on manual processes for taking orders, managing its menu, and handling customer interactions. This creates several pain points: customers have no convenient way to browse the menu, place orders, or track their order status remotely; the business has no mechanism to retain customers through loyalty incentives; staff must manage product listings and promotional offers manually with no centralised system; and there is no structured channel for customers to leave feedback on products. As a result, Ember Coffee Co. risks losing customers to competitors who offer seamless digital experiences. This application solves these problems by providing a full-stack mobile platform that digitises ordering, automates loyalty point tracking, centralises menu and promotion management, and enables customer feedback — all connected to a live hosted backend.

---

## 2. Team Responsibility Breakdown

| Member | Module | Entity | Focus Area |
|--------|--------|--------|------------|
| Member 1 | User Authentication & Profile Management | User | Core security, JWT auth, profile image upload |
| Member 2 | Menu & Product Management | Product | Full product CRUD, menu UI, product image upload |
| Member 3 | Order Processing System | Order | Cart, checkout, order status lifecycle, payment screenshot |
| Member 4 | Loyalty & Rewards Program | Reward / Redemption | Reward CRUD, point redemption logic, rewards dashboard |
| Member 5 | Customer Reviews & Ratings | Review | Review CRUD, star rating UI, review image upload |
| Member 6 | Promotions & Deployment | Promotion | Promo code CRUD, banner upload, backend deployment |

---

## 3. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     EMBER COFFEE CO. SYSTEM                     │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         HTTPS / REST API
│   React Native App   │ ◄──────────────────────────────────────►
│   (Mobile Client)    │                                          │
│                      │                               ┌──────────────────────┐
│  Screens:            │                               │  Node.js + Express   │
│  - Login / Signup    │                               │  (Deployed Backend)  │
│  - Menu / Products   │                               │                      │
│  - Cart / Checkout   │                               │  Routes:             │
│  - Order Tracking    │                               │  /api/auth           │
│  - My Rewards        │                               │  /api/products       │
│  - Reviews           │                               │  /api/orders         │
│  - Promotions        │                               │  /api/rewards        │
│  - Profile           │                               │  /api/reviews        │
└──────────────────────┘                               │  /api/promotions     │
                                                       │                      │
                                                       │  Middleware:         │
                                                       │  - JWT Auth          │
                                                       │  - Multer (upload)   │
                                                       │  - Error Handler     │
                                                       └──────────┬───────────┘
                                                                  │
                                          ┌───────────────────────┼───────────────────────┐
                                          │                       │                       │
                                 ┌────────▼────────┐    ┌────────▼────────┐    ┌─────────▼───────┐
                                 │  MongoDB Atlas  │    │  File Storage   │    │   JWT Secret    │
                                 │  (Database)     │    │  (Cloudinary /  │    │   (Env Var)     │
                                 │                 │    │   Local/S3)     │    │                 │
                                 │  Collections:   │    │                 │    │  Validates all  │
                                 │  - users        │    │  Stores:        │    │  protected      │
                                 │  - products     │    │  - profile pics │    │  route tokens   │
                                 │  - orders       │    │  - product imgs │    └─────────────────┘
                                 │  - rewards      │    │  - payment ss   │
                                 │  - redemptions  │    │  - reward imgs  │
                                 │  - reviews      │    │  - review imgs  │
                                 │  - promotions   │    │  - promo banners│
                                 └─────────────────┘    └─────────────────┘
```

---

## 4. Database Schema Diagram (ERD)

```
┌─────────────────────────────┐
│           USER              │
├─────────────────────────────┤
│ _id          ObjectId  (PK) │
│ name         String         │
│ email        String (unique)│
│ passwordHash String         │
│ role         String         │◄── "customer" | "admin"
│ profileImageUrl String      │
│ totalPoints  Number (def:0) │◄── Managed by Reward_Service
└──────────────┬──────────────┘
               │ 1
               │
       ┌───────┴──────────────────────────────────────────┐
       │               │                │                  │
       │ *             │ *              │ *                │ *
┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐  ┌───────▼──────┐
│    ORDER    │ │ REDEMPTION  │ │   REVIEW    │  │ RESERVATION  │
├─────────────┤ ├─────────────┤ ├─────────────┤  │  (removed)   │
│ _id    (PK) │ │ _id    (PK) │ │ _id    (PK) │  └──────────────┘
│ userId (FK) │ │ userId (FK) │ │ userId (FK) │
│ items[]     │ │ rewardId(FK)│ │ productId(FK│
│ totalAmount │ │ pointsUsed  │ │ rating  1-5 │
│ orderStatus │ │ redeemedAt  │ │ comment     │
│ paymentSS.. │ └──────┬──────┘ │ reviewImgUrl│
└─────────────┘        │        └──────┬──────┘
                       │ *             │ *
               ┌───────▼──────┐ ┌──────▼──────┐
               │    REWARD    │ │   PRODUCT   │
               ├──────────────┤ ├─────────────┤
               │ _id     (PK) │ │ _id    (PK) │
               │ rewardName   │ │ productName │
               │ pointsReq'd  │ │ category    │
               │ description  │ │ price       │
               │ rewardImgUrl │ │ description │
               │ isAvailable  │ │ productImgUrl│
               └──────────────┘ │ isAvailable │
                                └─────────────┘

┌─────────────────────────────┐
│         PROMOTION           │
├─────────────────────────────┤
│ _id             ObjectId(PK)│
│ promoCode       String      │
│ discountPercent Number      │
│ validUntil      Date        │
│ promoBannerUrl  String      │
└─────────────────────────────┘
```

**Relationships:**
- User → Order: one-to-many (a user can have many orders)
- User → Redemption: one-to-many (a user can redeem many rewards)
- User → Review: one-to-many (a user can write many reviews)
- Reward → Redemption: one-to-many (a reward can be redeemed many times)
- Product → Review: one-to-many (a product can have many reviews)
- Order embeds items[] array (productId reference + quantity + price snapshot)

---

## 5. API Endpoint Table

### Authentication & Profile (Member 1)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | /api/auth/register | No | Register a new user |
| POST | /api/auth/login | No | Login and receive JWT |
| GET | /api/auth/profile | Customer / Admin | Get current user profile |
| PUT | /api/auth/profile | Customer / Admin | Update name or profile image |
| POST | /api/auth/profile/upload | Customer / Admin | Upload profile picture |

### Menu & Products (Member 2)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | /api/products | No | Get all available products |
| GET | /api/products/:id | No | Get a single product by ID |
| POST | /api/products | Admin | Create a new product |
| PUT | /api/products/:id | Admin | Update a product |
| DELETE | /api/products/:id | Admin | Delete a product |
| POST | /api/products/:id/upload | Admin | Upload product image |

### Orders (Member 3)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | /api/orders | Customer | Create a new order |
| GET | /api/orders/my | Customer | Get order history for current user |
| GET | /api/orders | Admin | Get all orders |
| PUT | /api/orders/:id/status | Admin | Update order status (Pending→Brewing→Ready) |
| POST | /api/orders/:id/upload | Customer | Upload payment screenshot |

### Loyalty & Rewards (Member 4)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | /api/rewards | Customer / Admin | Get all available rewards |
| POST | /api/rewards | Admin | Create a new reward |
| PUT | /api/rewards/:id | Admin | Update a reward |
| DELETE | /api/rewards/:id | Admin | Delete a reward |
| POST | /api/rewards/:id/redeem | Customer | Redeem a reward (deducts points) |
| POST | /api/rewards/:id/upload | Admin | Upload reward image |

### Reviews (Member 5)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | /api/reviews/product/:productId | No | Get all reviews for a product |
| POST | /api/reviews | Customer | Submit a new review |
| PUT | /api/reviews/:id | Customer (owner) | Edit own review |
| DELETE | /api/reviews/:id | Customer (owner) | Delete own review |
| POST | /api/reviews/:id/upload | Customer | Upload review image |

### Promotions (Member 6)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | /api/promotions | No | Get all active promotions |
| POST | /api/promotions | Admin | Create a new promotion |
| PUT | /api/promotions/:id | Admin | Update a promotion |
| DELETE | /api/promotions/:id | Admin | Delete a promotion |
| POST | /api/promotions/validate | Customer | Validate a promo code at checkout |
| POST | /api/promotions/:id/upload | Admin | Upload promo banner image |

---

## 5. Backend Folder Structure

```
ember-coffee-api/
├── src/
│   ├── config/
│   │   └── db.js                 # Member 6: MongoDB Atlas connection
│   ├── controllers/              # The Brains: Business logic
│   │   ├── authController.js     # -> Member 1
│   │   ├── productController.js  # -> Member 2
│   │   ├── orderController.js    # -> Member 3
│   │   ├── rewardController.js   # -> Member 4
│   │   ├── reviewController.js   # -> Member 5
│   │   └── promoController.js    # -> Member 6
│   ├── middleware/
│   │   ├── authMiddleware.js     # Member 1: JWT Verification
│   │   ├── uploadMiddleware.js   # Shared: Multer config (Req 12)
│   │   └── errorMiddleware.js    # Global error handler
│   ├── models/                   # The Database Schemas (Mongoose)
│   │   ├── User.js               # -> Member 1
│   │   ├── Product.js            # -> Member 2
│   │   ├── Order.js              # -> Member 3
│   │   ├── Reward.js             # -> Member 4
│   │   ├── Review.js             # -> Member 5
│   │   └── Promotion.js          # -> Member 6
│   ├── routes/                   # The API Endpoints
│   │   ├── authRoutes.js         # -> Member 1
│   │   ├── productRoutes.js      # -> Member 2
│   │   ├── orderRoutes.js        # -> Member 3
│   │   ├── rewardRoutes.js       # -> Member 4
│   │   ├── reviewRoutes.js       # -> Member 5
│   │   └── promoRoutes.js        # -> Member 6
│   └── server.js                 # Main Express application entry point
├── uploads/                      # Temp folder for Multer file uploads
├── .env                          # Local environment variables (DO NOT COMMIT)
├── .gitignore                    # Must ignore node_modules and .env
└── package.json
```

---

## 7. Introduction

Ember Coffee Co. is a full-stack mobile application built for a university group assignment (SE2020 – Web and Mobile Technologies). The app serves a coffee shop business, providing customers with the ability to browse a menu, place orders, earn and redeem loyalty rewards, leave reviews, and apply promotional codes. Staff and admins can manage products, orders, rewards, and promotions. The system is composed of a React Native mobile frontend, a Node.js + Express.js RESTful backend, a MongoDB database, and a backend deployed to a live hosting platform (e.g. Render, Railway, or AWS).

The application is divided into six modules, each owned by one team member:
1. User Authentication & Profile Management
2. Menu & Product Management
3. Order Processing System
4. Loyalty & Rewards Program
5. Customer Reviews & Ratings
6. Promotions & Deployment

---

## 8. Glossary

- **System**: The Ember Coffee Co. full-stack mobile application
- **API**: The Node.js + Express.js RESTful backend
- **App**: The React Native mobile frontend
- **Auth_Service**: The module responsible for user registration, login, and JWT issuance
- **User**: A registered customer or admin of the application
- **Admin**: A User with role = "admin", permitted to manage products, orders, and promotions
- **Customer**: A User with role = "customer"
- **JWT**: JSON Web Token used for stateless authentication
- **Product_Service**: The module responsible for menu and product management
- **Order_Service**: The module responsible for cart, checkout, and order lifecycle
- **Reward_Service**: The module responsible for loyalty reward management and point redemption
- **Review_Service**: The module responsible for product reviews and ratings
- **Promo_Service**: The module responsible for promotional codes and banners
- **File_Upload_Service**: The shared middleware responsible for handling image uploads (profile pictures, product images, payment screenshots, reward item images, review photos, promo banners)
- **MongoDB_Atlas**: The hosted MongoDB database instance
- **Deployed_Backend**: The API hosted on a live platform (not localhost)

---

## 9. Requirements

### Requirement 1: User Registration

**User Story:** As a new visitor, I want to create an account, so that I can access personalised features of the app.

#### Acceptance Criteria

1. WHEN a registration request is submitted with a valid name, email, and password, THE Auth_Service SHALL create a new User record in MongoDB_Atlas with the role set to "customer" and totalPoints initialised to 0.
2. WHEN a registration request is submitted, THE Auth_Service SHALL hash the password using bcrypt before storing it.
3. IF a registration request is submitted with an email that already exists, THEN THE Auth_Service SHALL return HTTP 409 with a descriptive error message.
4. IF a registration request is submitted with a missing required field (name, email, or password), THEN THE Auth_Service SHALL return HTTP 400 with a descriptive validation error.
5. THE App SHALL validate the registration form on the client side before submitting to the API, ensuring name is non-empty, email matches a valid format, and password is at least 8 characters.

---

### Requirement 2: User Login & JWT Authentication

**User Story:** As a registered user, I want to log in with my credentials, so that I can access protected features of the app.

#### Acceptance Criteria

1. WHEN a login request is submitted with a valid email and password, THE Auth_Service SHALL return HTTP 200 with a signed JWT containing the userId and role.
2. IF a login request is submitted with an unrecognised email or incorrect password, THEN THE Auth_Service SHALL return HTTP 401 with a generic error message.
3. THE API SHALL include a JWT middleware that validates the Authorization header on all protected routes.
4. IF a request to a protected route is made without a valid JWT, THEN THE API SHALL return HTTP 401.
5. THE App SHALL store the JWT securely on the device and attach it to all subsequent API requests via the Authorization header.

---

### Requirement 3: Profile Management

**User Story:** As a logged-in user, I want to view and update my profile, so that I can keep my account information current.

#### Acceptance Criteria

1. WHEN a profile update request is submitted with a valid JWT, THE Auth_Service SHALL update the User's name or profileImageUrl in MongoDB_Atlas.
2. WHEN a profile image is uploaded, THE File_Upload_Service SHALL store the image and return a URL, which THE Auth_Service SHALL save to the User's profileImageUrl field.
3. THE App SHALL display the Profile Management screen showing the current name, email, profile picture, and loyalty point balance (totalPoints).
4. THE App SHALL allow the user to select and upload a new profile picture from the device gallery.
5. IF a profile update request is submitted without a valid JWT, THEN THE API SHALL return HTTP 401.

---

### Requirement 4: Menu Browsing

**User Story:** As a customer, I want to browse the coffee shop menu, so that I can discover available products.

#### Acceptance Criteria

1. THE Product_Service SHALL expose a GET endpoint that returns all Products where isAvailable is true.
2. WHEN a request is made for a specific product by productId, THE Product_Service SHALL return the full product details including productName, category, price, description, and productImageUrl.
3. IF a request is made for a productId that does not exist, THEN THE Product_Service SHALL return HTTP 404.
4. THE App SHALL display the menu as a list grouped by category, fetched from the Deployed_Backend.
5. THE App SHALL display a Product Details screen when a product is selected, showing all product fields.

---

### Requirement 5: Product Management (Admin)

**User Story:** As an admin, I want to add, edit, and remove products, so that I can keep the menu up to date.

#### Acceptance Criteria

1. WHEN an authenticated Admin submits a create product request with valid fields, THE Product_Service SHALL create a new Product record in MongoDB_Atlas and return HTTP 201.
2. WHEN an authenticated Admin submits an update product request, THE Product_Service SHALL update the specified Product fields in MongoDB_Atlas and return HTTP 200.
3. WHEN an authenticated Admin submits a delete product request, THE Product_Service SHALL remove the Product from MongoDB_Atlas and return HTTP 200.
4. WHEN a product image is uploaded, THE File_Upload_Service SHALL store the image and return a URL, which THE Product_Service SHALL save to the Product's productImageUrl field.
5. IF a product create or update request is submitted by a User with role != "admin", THEN THE API SHALL return HTTP 403.
6. IF a product create request is submitted with missing required fields (productName, category, price), THEN THE Product_Service SHALL return HTTP 400.
7. THE App SHALL provide an Admin screen with forms to add and edit products, visible only to users with role = "admin".

---

### Requirement 6: Cart & Checkout

**User Story:** As a customer, I want to add products to a cart and place an order, so that I can purchase items from the coffee shop.

#### Acceptance Criteria

1. THE App SHALL maintain a local cart state containing selected products and quantities.
2. WHEN a checkout request is submitted with a valid JWT, userId, items array, and totalAmount, THE Order_Service SHALL create a new Order record in MongoDB_Atlas with orderStatus set to "Pending".
3. WHEN a payment screenshot is uploaded at checkout, THE File_Upload_Service SHALL store the image and return a URL, which THE Order_Service SHALL save to the Order's paymentScreenshotUrl field.
4. IF a checkout request is submitted with an empty items array, THEN THE Order_Service SHALL return HTTP 400.
5. IF a checkout request is submitted without a valid JWT, THEN THE API SHALL return HTTP 401.
6. THE App SHALL display a Checkout screen showing the cart summary, total amount, and a payment screenshot upload option.

---

### Requirement 7: Order Tracking

**User Story:** As a customer, I want to track the status of my orders, so that I know when my order is ready.

#### Acceptance Criteria

1. WHEN a request is made for order history with a valid JWT, THE Order_Service SHALL return all Orders associated with the authenticated userId.
2. WHEN an Admin submits an order status update request, THE Order_Service SHALL update the Order's orderStatus field following the sequence: "Pending" → "Brewing" → "Ready".
3. IF an order status update is submitted by a User with role != "admin", THEN THE API SHALL return HTTP 403.
4. THE App SHALL display an Order Tracking screen showing the current orderStatus for each of the user's orders.
5. IF a request is made for orders associated with a userId that has no orders, THE Order_Service SHALL return HTTP 200 with an empty array.

---

### Requirement 8: Loyalty & Rewards Program

**User Story:** As a customer, I want to earn points and redeem them for rewards, so that I am incentivised to return to Ember Coffee Co.

#### Acceptance Criteria

1. WHEN a registration request is completed, THE Auth_Service SHALL initialise the User's totalPoints field to 0 in MongoDB_Atlas (collaboration with Member 1 — User schema).
2. THE Reward_Service SHALL expose a POST /api/rewards endpoint that, WHEN called by an authenticated Admin with valid rewardName, pointsRequired, description, and rewardImageUrl fields, creates a new Reward record in MongoDB_Atlas and returns HTTP 201.
3. THE Reward_Service SHALL expose a GET /api/rewards endpoint that returns all Reward records where isAvailable is true.
4. WHEN an authenticated Admin submits a PUT /api/rewards/:id request with valid fields, THE Reward_Service SHALL update the specified Reward record in MongoDB_Atlas and return HTTP 200.
5. WHEN an authenticated Admin submits a DELETE /api/rewards/:id request, THE Reward_Service SHALL remove the specified Reward record from MongoDB_Atlas and return HTTP 200.
6. IF a create, update, or delete reward request is submitted by a User with role != "admin", THEN THE API SHALL return HTTP 403.
7. IF a create reward request is submitted with missing required fields (rewardName, pointsRequired), THEN THE Reward_Service SHALL return HTTP 400 with a descriptive validation error.
8. WHEN an authenticated Customer submits a redeem request for a Reward, THE Reward_Service SHALL verify the Customer's totalPoints is greater than or equal to the Reward's pointsRequired before processing.
9. WHEN a redemption is approved, THE Reward_Service SHALL deduct the Reward's pointsRequired from the Customer's totalPoints, create a Redemption record in MongoDB_Atlas, and return HTTP 200.
10. IF a redemption request is submitted and the Customer's totalPoints is less than the Reward's pointsRequired, THEN THE Reward_Service SHALL return HTTP 400 with a descriptive error message.
11. IF a redemption request references a rewardId that does not exist, THEN THE Reward_Service SHALL return HTTP 404.
12. WHEN a reward image is uploaded, THE File_Upload_Service SHALL store the image and return a URL, which THE Reward_Service SHALL save to the Reward's rewardImageUrl field.
13. THE App SHALL display a "My Rewards" dashboard for authenticated Customers showing the current totalPoints as a circular progress bar and a list of available Reward items with their pointsRequired.
14. THE App SHALL provide an Admin screen with a form to add and edit Reward items, including validation that rewardName is non-empty and pointsRequired is a positive integer.

---

### Requirement 9: Customer Reviews & Ratings

**User Story:** As a customer, I want to leave a review and rating for a product, so that I can share my experience with other customers.

#### Acceptance Criteria

1. WHEN a review submission request is submitted with a valid JWT, productId, rating (1–5), and comment, THE Review_Service SHALL create a new Review record in MongoDB_Atlas.
2. WHEN a review image is uploaded, THE File_Upload_Service SHALL store the image and return a URL, which THE Review_Service SHALL save to the Review's reviewImageUrl field.
3. WHEN a request is made for reviews by productId, THE Review_Service SHALL return all Reviews associated with that productId.
4. WHEN a review edit request is submitted by the Review's owner, THE Review_Service SHALL update the rating and comment fields and return HTTP 200.
5. WHEN a review delete request is submitted by the Review's owner, THE Review_Service SHALL remove the Review from MongoDB_Atlas and return HTTP 200.
6. IF a review edit or delete request is submitted by a User who does not own the Review, THEN THE API SHALL return HTTP 403.
7. IF a review submission is made with a rating outside the range 1–5, THEN THE Review_Service SHALL return HTTP 400.
8. THE App SHALL display a star-rating UI component and a review submission form on the Product Details screen.
9. THE App SHALL display a review feed on the Product Details screen showing all reviews for that product.

---

### Requirement 10: Promotions

**User Story:** As an admin, I want to create and manage promotional codes, so that I can offer discounts to customers.

#### Acceptance Criteria

1. WHEN an authenticated Admin submits a create promotion request with a valid promoCode, discountPercentage, and validUntil date, THE Promo_Service SHALL create a new Promotion record in MongoDB_Atlas and return HTTP 201.
2. WHEN a promo banner image is uploaded, THE File_Upload_Service SHALL store the image and return a URL, which THE Promo_Service SHALL save to the Promotion's promoBannerUrl field.
3. WHEN an authenticated Admin submits an update promotion request, THE Promo_Service SHALL update the specified Promotion fields and return HTTP 200.
4. WHEN an authenticated Admin submits a delete promotion request, THE Promo_Service SHALL remove the Promotion from MongoDB_Atlas and return HTTP 200.
5. IF a promotion request is submitted by a User with role != "admin", THEN THE API SHALL return HTTP 403.
6. WHEN a customer submits a promo code at checkout, THE Promo_Service SHALL validate the promoCode and return the discountPercentage if the code is valid and the validUntil date has not passed.
7. IF a customer submits an expired or non-existent promoCode, THEN THE Promo_Service SHALL return HTTP 404 with a descriptive error message.
8. THE App SHALL display promotional banners fetched from the Deployed_Backend on the home or menu screen.

---

### Requirement 11: Deployment & Connectivity

**User Story:** As the deployment lead, I want the backend to be hosted on a live platform, so that the mobile app can connect to it for the live demo.

#### Acceptance Criteria

1. THE Deployed_Backend SHALL be accessible via a public HTTPS URL (not localhost).
2. THE Deployed_Backend SHALL maintain a live connection to MongoDB_Atlas.
3. THE App SHALL use the Deployed_Backend's public URL as the base URL for all API calls.
4. WHEN the Deployed_Backend receives a request, THE API SHALL respond with the appropriate HTTP status code and a JSON body.
5. THE Deployed_Backend SHALL serve all six module endpoints under a consistent base path (e.g. /api/v1/).
6. IF the Deployed_Backend encounters an unhandled error, THEN THE API SHALL return HTTP 500 with a generic error message and log the error server-side.

---

### Requirement 12: File Upload (Shared)

**User Story:** As any user or admin, I want to upload images within the app, so that profile pictures, product images, payment proofs, and other media are stored and retrievable.

#### Acceptance Criteria

1. THE File_Upload_Service SHALL accept image files in JPEG and PNG formats.
2. IF a file upload request contains a file type other than JPEG or PNG, THEN THE File_Upload_Service SHALL return HTTP 400 with a descriptive error message.
3. WHEN a valid image is uploaded, THE File_Upload_Service SHALL store the image and return a publicly accessible URL.
4. THE File_Upload_Service SHALL enforce a maximum file size of 5MB per upload.
5. IF an uploaded file exceeds 5MB, THEN THE File_Upload_Service SHALL return HTTP 400 with a descriptive error message.
