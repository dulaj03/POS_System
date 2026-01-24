<?php
// Products API
// File: api/products.php

require 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$request = isset($_GET['action']) ? $_GET['action'] : '';

if ($method === 'GET' && $request === 'all') {
    // Get all active (non-deleted) products
    $result = $conn->query("SELECT * FROM products WHERE is_deleted = FALSE ORDER BY name");
    if (!$result) {
        sendError('Query failed: ' . $conn->error, 500);
    }
    
    $products = [];
    while ($row = $result->fetch_assoc()) {
        // Convert numeric strings to proper types
        $row['price'] = (float)$row['price'];
        $row['cost_price'] = (float)$row['cost_price'];
        $row['stock'] = (int)$row['stock'];
        $row['is_deposit_enabled'] = (bool)$row['is_deposit_enabled'];
        $row['deposit_amount'] = (float)$row['deposit_amount'];
        
        // Convert snake_case to camelCase for JS compatibility
        $row['costPrice'] = $row['cost_price'];
        $row['isDepositEnabled'] = $row['is_deposit_enabled'];
        $row['depositAmount'] = $row['deposit_amount'];
        unset($row['cost_price'], $row['is_deposit_enabled'], $row['deposit_amount']);
        
        $products[] = $row;
    }
    sendResponse($products);
}

elseif ($method === 'POST' && $request === 'add') {
    // Add new product
    $data = json_decode(file_get_contents('php://input'), true);
    
    $required = ['name', 'category', 'price', 'stock'];
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            sendError("Missing required field: $field", 400);
        }
    }
    
    // Generate sequential ID: find max ID and increment
    $result = $conn->query("SELECT MAX(CAST(SUBSTRING(id, 2) AS UNSIGNED)) as max_id FROM products WHERE id LIKE 'p%'");
    $row = $result->fetch_assoc();
    $nextId = ($row['max_id'] ?? 0) + 1;
    $id = 'p' . $nextId;
    
    $name = $data['name'];
    $category = $data['category'];
    $price = (float)$data['price'];
    $costPrice = isset($data['costPrice']) ? (float)$data['costPrice'] : 0;
    $stock = (int)$data['stock'];
    $isDepositEnabled = isset($data['isDepositEnabled']) ? (bool)$data['isDepositEnabled'] : false;
    $depositAmount = isset($data['depositAmount']) ? (float)$data['depositAmount'] : 0;
    
    $stmt = $conn->prepare("INSERT INTO products (id, name, category, price, cost_price, stock, is_deposit_enabled, deposit_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param('sssddiid', $id, $name, $category, $price, $costPrice, $stock, $isDepositEnabled, $depositAmount);
    
    if (!$stmt->execute()) {
        sendError('Failed to add product: ' . $stmt->error, 500);
    }
    
    sendResponse([
        'id' => $id,
        'name' => $name,
        'category' => $category,
        'price' => $price,
        'costPrice' => $costPrice,
        'stock' => $stock,
        'isDepositEnabled' => $isDepositEnabled,
        'depositAmount' => $depositAmount
    ], 201);
}

elseif ($method === 'PUT' && $request === 'update') {
    // Update product
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || empty($data['id'])) {
        sendError('Product ID is required', 400);
    }
    
    $id = $data['id'];
    $name = $data['name'];
    $category = $data['category'];
    $price = (float)$data['price'];
    $costPrice = isset($data['costPrice']) ? (float)$data['costPrice'] : 0;
    $stock = (int)$data['stock'];
    $isDepositEnabled = isset($data['isDepositEnabled']) ? (bool)$data['isDepositEnabled'] : false;
    $depositAmount = isset($data['depositAmount']) ? (float)$data['depositAmount'] : 0;
    
    $stmt = $conn->prepare("UPDATE products SET name = ?, category = ?, price = ?, cost_price = ?, stock = ?, is_deposit_enabled = ?, deposit_amount = ? WHERE id = ?");
    $stmt->bind_param('ssddiids', $name, $category, $price, $costPrice, $stock, $isDepositEnabled, $depositAmount, $id);
    
    if (!$stmt->execute()) {
        sendError('Failed to update product: ' . $stmt->error, 500);
    }
    
    sendResponse([
        'id' => $id,
        'name' => $name,
        'category' => $category,
        'price' => $price,
        'costPrice' => $costPrice,
        'stock' => $stock,
        'isDepositEnabled' => $isDepositEnabled,
        'depositAmount' => $depositAmount
    ]);
}

elseif ($method === 'DELETE' && $request === 'delete') {
    // Soft delete product (archive instead of removing)
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || empty($data['id'])) {
        sendError('Product ID is required', 400);
    }
    
    $id = $data['id'];
    
    // Set is_deleted flag to TRUE instead of removing the record
    // This preserves sales history and data integrity
    $stmt = $conn->prepare("UPDATE products SET is_deleted = TRUE WHERE id = ?");
    $stmt->bind_param('s', $id);
    
    if (!$stmt->execute()) {
        sendError('Failed to archive product: ' . $stmt->error, 500);
    }
    
    sendResponse(['message' => 'Product archived successfully']);
}

elseif ($method === 'PUT' && $request === 'update_stock') {
    // Update product stock
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || empty($data['id'])) {
        sendError('Product ID is required', 400);
    }
    
    $id = $data['id'];
    $stock = (int)$data['stock'];
    
    $stmt = $conn->prepare("UPDATE products SET stock = ? WHERE id = ?");
    $stmt->bind_param('is', $stock, $id);
    
    if (!$stmt->execute()) {
        sendError('Failed to update stock: ' . $stmt->error, 500);
    }
    
    sendResponse(['message' => 'Stock updated']);
}

elseif ($method === 'GET' && $request === 'low_stock') {
    // Get products with stock under 20
    $threshold = isset($_GET['threshold']) ? (int)$_GET['threshold'] : 20;
    $result = $conn->query("SELECT id, name, category, stock FROM products WHERE is_deleted = FALSE AND stock < $threshold ORDER BY stock ASC");
    if (!$result) {
        sendError('Query failed: ' . $conn->error, 500);
    }
    
    $products = [];
    while ($row = $result->fetch_assoc()) {
        $row['stock'] = (int)$row['stock'];
        $products[] = $row;
    }
    sendResponse($products);
}

else {
    sendError('Invalid action or method', 400);
}
?>
