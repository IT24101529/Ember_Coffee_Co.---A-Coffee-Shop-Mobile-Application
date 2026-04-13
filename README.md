EMBER COFFEE CO. - MOBILE APPLICATION
======================================

"Fueling your day, one bean at a time."

OVERVIEW
--------
Ember Coffee Co. is a full-stack mobile solution designed to modernize the coffee shop experience. It allows customers to browse the menu, place orders, earn loyalty points, and provide feedback, while providing administrators and managers with the tools to manage products, orders, and promotions effectively.

PROBLEM STATEMENT
-----------------
Ember Coffee Co. currently depends on manual, paper-based operations that cause bottlenecks in ordering, menu management, and customer relations. This digital transformation simplifies the ordering lifecycle, automates loyalty rewards, and establishes structured feedback channels, ensuring the business stays competitive in a digital-first market.

TECH STACK
----------
- Frontend: React Native (Functional Components & Hooks)
- Backend: Node.js + Express.js
- Database: MongoDB Atlas (Cloud)
- Storage: Cloudinary (for images)
- Authentication: JWT (JSON Web Tokens)
- Navigation: React Navigation

PROJECT STRUCTURE
-----------------
- /EmberCoffeeCo: The React Native mobile frontend.
- /ember-coffee-api: The Node.js RESTful API.
- Requirements.md: Project requirements and acceptance criteria.
- design.md (.kiro/specs/): Detailed system architecture and design decisions.
- DatabaseSchema.md: Visual and detailed schema of the database.

SETUP INSTRUCTIONS
------------------

Backend (ember-coffee-api):
1. Navigate to /ember-coffee-api.
2. Run 'npm install' to install dependencies.
3. Create a .env file with the following keys:
   - PORT=5000
   - MONGO_URI=<Your MongoDB Atlas Connection String>
   - JWT_SECRET=<Your Secret Key>
   - CLOUDINARY_CLOUD_NAME=<Cloudinary Name>
   - CLOUDINARY_API_KEY=<Cloudinary API Key>
   - CLOUDINARY_API_SECRET=<Cloudinary API Secret>
4. Run 'npm start' to launch the server.

Frontend (EmberCoffeeCo):
1. Navigate to /EmberCoffeeCo.
2. Run 'npm install' to install dependencies.
3. Configure the BASE_URL in src/config/api.js to point to your backend IP/URL.
4. Run 'npx expo start' to launch the application.

TEAM MODULES
------------
1. Member 1: User Auth & Profile
2. Member 2: Menu & Products
3. Member 3: Order Processing
4. Member 4: Loyalty & Rewards
5. Member 5: Customer & Store Reviews
6. Member 6: Promotions & Deployment
