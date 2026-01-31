# 🚀 Localhost Setup Guide - PUB CINNAMON

Follow these steps to run the application on your local machine using XAMPP.

---

## **Step 1: Start XAMPP Services**

1. Open **XAMPP Control Panel**
2. Start **Apache** service
3. Start **MySQL** service

Both should show green checkmarks ✅

---

## **Step 2: Create Database**

1. Open your browser and go to: `http://localhost/phpmyadmin`
2. Click **"New"** on the left sidebar
3. Create a new database named: **`pub_cinnamon`**
4. Click **"Create"**

---

## **Step 3: Import Database Schema**

1. In phpMyAdmin, select the **`pub_cinnamon`** database
2. Click the **"Import"** tab
3. Click **"Choose File"** and select: `database.sql` from the project folder
4. Click **"Import"** button

✅ You should see a success message and tables created

---

## **Step 4: Verify Tables Created**

In phpMyAdmin, you should see these tables under `pub_cinnamon`:
- users
- products
- promotions
- sales
- bottles
- suppliers
- commissions

---

## **Step 5: Access the Application**

1. Open your browser
2. Go to: **`http://localhost/PUB_Cinnamon/`**
3. You should see the login page

---

## **Step 6: Login Credentials**

Use any of these PINs (default test users):

| PIN | Role | Notes |
|-----|------|-------|
| 1234 | Admin | Full access |
| 1111 | Cashier | Sales only |
| 2222 | Cashier | Sales only |

---

## **Step 7: Test API Connection**

1. Open browser console (F12)
2. Go to: `http://localhost/PUB_Cinnamon/api/users.php`
3. You should see JSON response with user data

If you see error about database, check Step 2-3.

---

## **Troubleshooting**

### ❌ "Database connection failed"
- [ ] Check MySQL is running (green in XAMPP)
- [ ] Verify database `pub_cinnamon` exists in phpMyAdmin
- [ ] Database was imported successfully

### ❌ "404 Not Found"
- [ ] Check XAMPP Apache is running
- [ ] Verify folder is in: `C:\xampp\htdocs\PUB_Cinnamon`
- [ ] Try: `http://localhost/PUB_Cinnamon/` (with trailing slash)

### ❌ "White screen or no data loading"
- [ ] Check browser console for errors (F12)
- [ ] Verify API endpoint is accessible: `http://localhost/PUB_Cinnamon/api/users.php`
- [ ] Clear browser cache (Ctrl+Shift+Delete)

---

## **Next Steps**

Once running locally, you can:
- Test features
- Add products, users, promotions
- Make changes to code
- Then deploy to live server using `hostingSteps.md`

---

Happy coding! 🎉
