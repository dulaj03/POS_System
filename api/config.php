<?php
// API Configuration & Database Connection
// File: api/config.php

// Handle CORS - Allow requests from the same domain and localhost
$allowed_origins = [
    'http://localhost',
    'http://127.0.0.1',
    'http://cinnamonresidencies.com',
    'https://cinnamonresidencies.com',
    'http://www.cinnamonresidencies.com',
    'https://www.cinnamonresidencies.com'
];

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

if (in_array($origin, $allowed_origins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database Configuration - Support both localhost and live
if ($_SERVER['HTTP_HOST'] === 'localhost' || $_SERVER['HTTP_HOST'] === '127.0.0.1' || strpos($_SERVER['HTTP_HOST'], 'localhost:') === 0) {
    // LOCALHOST CONFIGURATION
    define('DB_HOST', 'localhost');
    define('DB_USER', 'root');  // Default XAMPP user
    define('DB_PASS', '');      // Default XAMPP password (empty)
    define('DB_NAME', 'pub_cinnamon');  // Local database name
} else {
    // LIVE SERVER CONFIGURATION
    define('DB_HOST', 'localhost');
    define('DB_USER', 'cinntjoz_pandan01');
    define('DB_PASS', 'Pandan@2022');
    define('DB_NAME', 'cinntjoz_pub_cinnamon');
}

// Set timezone to Sri Lanka (UTC+5:30)
date_default_timezone_set('Asia/Colombo');

// Create connection
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

// Check connection
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $conn->connect_error]);
    exit();
}

// Set charset
$conn->set_charset("utf8");

// Set MySQL timezone to Sri Lanka
$conn->query("SET time_zone = '+05:30'");

// Helper function to send JSON response
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

// Helper function to handle errors
function sendError($message, $statusCode = 400) {
    http_response_code($statusCode);
    echo json_encode(['error' => $message]);
    exit();
}
?>
