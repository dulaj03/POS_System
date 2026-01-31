# 📤 Hosting Steps - Deploy to cPanel Live Server

This guide walks you through deploying your PUB CINNAMON POS system to a live server using cPanel.

---

## **📋 Prerequisites**

Before starting, you need:
- [ ] A domain name (e.g., cinnamonresidencies.com)
- [ ] cPanel hosting account with MySQL database access
- [ ] FTP/SFTP credentials (provided by hosting company)
- [ ] MySQL database credentials (provided by hosting company)

---

## **Part 1: Set Up Database on Live Server**

### **Step 1: Access cPanel**

1. Go to your hosting provider's cPanel login
2. Usually: `yourdomain.com:2083` or provided by your host
3. Login with your cPanel username and password

### **Step 2: Create MySQL Database**

1. In cPanel, find **"MySQL Databases"** (or **"Databases"**)
2. Create a new database:
   - **Database Name:** `cinntjoz_pub_cinnamon` (or your preference)
   - Click **"Create Database"**

### **Step 3: Create MySQL User**

1. Still in MySQL Databases section, scroll to **"MySQL Users"**
2. Create a new user:
   - **Username:** `cinntjoz_pandan01` (or your preference)
   - **Password:** Create a strong password (e.g., `Pandan@2022`)
   - Click **"Create User"**

### **Step 4: Assign User to Database**

1. Still in the same section, find **"Add User to Database"**
2. Select the user and database you just created
3. Click **"Add"**
4. **Check ALL privileges** (or at least: SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP)
5. Click **"Make Changes"**

---

## **Part 2: Update Configuration for Live Server**

### **Step 5: Update api/config.php**

Your `api/config.php` now supports both localhost and live automatically. When accessed via your domain, it will use the live credentials.

**Current live credentials (in config.php):**
```php
define('DB_HOST', 'localhost');      // Usually stays as localhost
define('DB_USER', 'cinntjoz_pandan01');  // Your cPanel DB user
define('DB_PASS', 'Pandan@2022');         // Your cPanel DB password
define('DB_NAME', 'cinntjoz_pub_cinnamon'); // Your cPanel DB name
```

⚠️ **Update these values** with your actual cPanel database credentials from Step 2-4.

### **Step 6: Update CORS Settings (Optional)**

If your domain is different from `cinnamonresidencies.com`, update the allowed origins in `api/config.php`:

```php
$allowed_origins = [
    'http://yourdomain.com',
    'https://yourdomain.com',
    'http://www.yourdomain.com',
    'https://www.yourdomain.com'
];
```

---

## **Part 3: Upload Files to Server**

### **Step 7: Access File Manager**

**Option A: Using cPanel File Manager (Easiest)**
1. In cPanel, find **"File Manager"**
2. Click **"Go To Home Directory"**
3. You should see a folder named `public_html` (this is your website root)

**Option B: Using FTP Client (Recommended for large files)**
1. Download **FileZilla** or **WinSCP** (FTP client)
2. Connect using FTP credentials from your host:
   - **Host:** `yourdomain.com` or FTP host
   - **Username:** Your cPanel username
   - **Password:** Your cPanel password
   - **Port:** 21 (FTP) or 22 (SFTP)

### **Step 8: Upload Project Files**

**Using cPanel File Manager:**
1. Open `public_html` folder
2. Click **"Upload"** button
3. Drag & drop your `PUB_Cinnamon` folder (or upload ZIP and extract)

**Using FTP:**
1. Navigate to `public_html` in the FTP client
2. Drag & drop the `PUB_Cinnamon` folder from your computer
3. Wait for upload to complete

✅ You should now have: `public_html/PUB_Cinnamon/`

---

## **Part 4: Import Database**

### **Step 9: Access phpMyAdmin on Live Server**

1. In cPanel, find **"phpMyAdmin"**
2. It will open with your database selected
3. Select your database (`cinntjoz_pub_cinnamon`)

### **Step 10: Import database.sql**

1. Click **"Import"** tab
2. Click **"Choose File"**
3. Select `database.sql` from your local project folder
4. Click **"Import"**

✅ Wait for success message - your database is now set up!

---

## **Part 5: Test & Verify**

### **Step 11: Access Your Live Application**

1. Open browser
2. Go to: **`https://yourdomain.com/PUB_Cinnamon/`**
3. You should see the login page

### **Step 12: Test API Connection**

1. Go to: **`https://yourdomain.com/PUB_Cinnamon/api/users.php`**
2. You should see JSON response with user data

### **Step 13: Login & Test**

1. Use the same PINs as localhost:
   - **PIN:** 1234 (Admin)
   - **PIN:** 1111 (Cashier)
2. Test basic features: Dashboard, Sales, Products, etc.

---

## **📱 Deploy Updates Later**

When you make changes and want to update the live site:

1. **Update Code Files:**
   - Upload changed files via File Manager or FTP
   - Replace existing files

2. **Update Database Schema:**
   - If you added new tables or fields in `database.sql`
   - Import the updated schema in phpMyAdmin
   - Or run SQL commands manually

3. **Cache & Clearing:**
   - Clear browser cache (Ctrl+Shift+Delete)
   - Give the CDN 5-10 minutes to update cached resources

---

## **🔒 Security Recommendations**

### **Before Going Live:**

1. **Change Default PIN:** (in database)
   - Connect to phpMyAdmin
   - Edit user PIN in `users` table
   - Use a secure PIN

2. **Use HTTPS:** (highly recommended)
   - In cPanel, go to **"SSL/TLS"**
   - Install a free SSL certificate (Let's Encrypt)
   - Update your domain to use HTTPS

3. **Secure Database Password:** (done in Step 3)
   - Use a strong, random password
   - Store it securely

4. **Restrict API Access:** (optional)
   - Consider adding authentication tokens to API calls
   - Currently relies on CORS origin checking

---

## **⚙️ Troubleshooting Live Server**

### ❌ "Database connection failed"
- Verify database name, user, password in `api/config.php` match cPanel
- Check database user has all required privileges
- Ask hosting provider if MySQL is accessible

### ❌ "404 - Page Not Found"
- Verify files uploaded to `public_html/PUB_Cinnamon/`
- Check domain and HTTPS configuration
- Try accessing: `https://yourdomain.com/PUB_Cinnamon/api/users.php`

### ❌ "CSS/JS not loading"
- Clear browser cache (Ctrl+Shift+Delete)
- Check that external CDNs are accessible (Tailwind, React, Chart.js)
- May need to wait 5-10 minutes for CDN propagation

### ❌ "Sales not saving"
- Check browser console for errors (F12)
- Verify API endpoint is responding: test in browser
- Check database `sales` table has correct structure

---

## **Comparison: Localhost vs Live**

| Aspect | Localhost | Live Server |
|--------|-----------|-------------|
| **URL** | `http://localhost/PUB_Cinnamon/` | `https://yourdomain.com/PUB_Cinnamon/` |
| **Database** | `pub_cinnamon` | `cinntjoz_pub_cinnamon` |
| **DB User** | `root` | `cinntjoz_pandan01` |
| **DB Pass** | (empty) | `Pandan@2022` |
| **Accessible from** | Your PC only | Anyone with domain |
| **HTTPS** | No | Yes (recommended) |

---

## **Quick Checklist Before Going Live**

- [ ] Database created in cPanel
- [ ] Database user created and assigned
- [ ] Files uploaded to `public_html/PUB_Cinnamon/`
- [ ] `database.sql` imported
- [ ] `api/config.php` updated with correct credentials
- [ ] Application accessible at `https://yourdomain.com/PUB_Cinnamon/`
- [ ] API endpoint responds with JSON
- [ ] Can login with PIN
- [ ] Test transaction works
- [ ] SSL/HTTPS certificate installed

---

## **Need Help?**

If you encounter issues:
1. Check the troubleshooting section above
2. Contact your hosting provider's support
3. Check browser console (F12) for JavaScript errors
4. Review the error message in phpMyAdmin or `api/config.php`

---

**Congratulations! 🎉 Your POS system is now live!**

Go back to [LOCALHOST_SETUP.md](LOCALHOST_SETUP.md) if you need to work on localhost again.
