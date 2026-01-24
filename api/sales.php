<?php
// Sales API
// File: api/sales.php

require 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$request = isset($_GET['action']) ? $_GET['action'] : '';

if ($method === 'GET' && $request === 'all') {
    // Get all sales with items
    $result = $conn->query("SELECT * FROM sales ORDER BY date DESC");
    if (!$result) {
        sendError('Query failed: ' . $conn->error, 500);
    }
    
    $sales = [];
    while ($row = $result->fetch_assoc()) {
        // Get sale items
        $stmt = $conn->prepare("SELECT product_id as id, name, price, cost_price as costPrice, qty, discount FROM sale_items WHERE sale_id = ?");
        $stmt->bind_param('s', $row['id']);
        $stmt->execute();
        $itemResult = $stmt->get_result();
        
        $items = [];
        while ($item = $itemResult->fetch_assoc()) {
            $item['price'] = (float)$item['price'];
            $item['costPrice'] = (float)$item['costPrice'];
            $item['qty'] = (int)$item['qty'];
            $item['discount'] = (float)$item['discount'];
            $items[] = $item;
        }
        
        // Parse payment methods JSON
        $paymentMethods = json_decode($row['payment_methods'], true) ?? [];
        
        // Convert to camelCase
        $sale = [
            'id' => $row['id'],
            'userId' => $row['user_id'],
            'subtotal' => (float)$row['subtotal'],
            'discount' => (float)$row['discount'],
            'tax' => (float)$row['tax'],
            'depositTotal' => (float)$row['deposit_total'],
            'total' => (float)$row['total'],
            'bottlesExchanged' => (int)$row['bottles_exchanged'],
            'paymentMethods' => $paymentMethods,
            'date' => $row['date'],
            'items' => $items
        ];
        
        $sales[] = $sale;
    }
    sendResponse($sales);
}

elseif ($method === 'GET' && $request === 'by_user') {
    // Get sales for a specific user
    $userId = isset($_GET['user_id']) ? $_GET['user_id'] : '';
    
    if (empty($userId)) {
        sendError('user_id is required', 400);
    }
    
    $result = $conn->query("SELECT * FROM sales WHERE user_id = '$userId' ORDER BY date DESC");
    if (!$result) {
        sendError('Query failed: ' . $conn->error, 500);
    }
    
    $sales = [];
    while ($row = $result->fetch_assoc()) {
        // Get sale items
        $stmt = $conn->prepare("SELECT product_id as id, name, price, cost_price as costPrice, qty, discount FROM sale_items WHERE sale_id = ?");
        $stmt->bind_param('s', $row['id']);
        $stmt->execute();
        $itemResult = $stmt->get_result();
        
        $items = [];
        while ($item = $itemResult->fetch_assoc()) {
            $item['price'] = (float)$item['price'];
            $item['costPrice'] = (float)$item['costPrice'];
            $item['qty'] = (int)$item['qty'];
            $item['discount'] = (float)$item['discount'];
            $items[] = $item;
        }
        
        // Parse payment methods JSON
        $paymentMethods = json_decode($row['payment_methods'], true) ?? [];
        
        // Convert to camelCase
        $sale = [
            'id' => $row['id'],
            'userId' => $row['user_id'],
            'subtotal' => (float)$row['subtotal'],
            'discount' => (float)$row['discount'],
            'tax' => (float)$row['tax'],
            'depositTotal' => (float)$row['deposit_total'],
            'total' => (float)$row['total'],
            'bottlesExchanged' => (int)$row['bottles_exchanged'],
            'paymentMethods' => $paymentMethods,
            'date' => $row['date'],
            'items' => $items
        ];
        
        $sales[] = $sale;
    }
    sendResponse($sales);
}

elseif ($method === 'POST' && $request === 'add') {
    // Add new sale and update inventory
    $data = json_decode(file_get_contents('php://input'), true);
    
    $required = ['userId', 'subtotal', 'total', 'items'];
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            sendError("Missing required field: $field", 400);
        }
    }
    
    $saleId = $data['id'] ?? 'INV-' . substr(strval(time()), -6);
    $userId = $data['userId'];
    $subtotal = (float)$data['subtotal'];
    $discount = isset($data['discount']) ? (float)$data['discount'] : 0;
    $tax = isset($data['tax']) ? (float)$data['tax'] : 0;
    $depositTotal = isset($data['depositTotal']) ? (float)$data['depositTotal'] : 0;
    $total = (float)$data['total'];
    $bottlesExchanged = isset($data['bottlesExchanged']) ? (int)$data['bottlesExchanged'] : 0;
    $paymentMethods = json_encode($data['paymentMethods'] ?? []);
    $items = $data['items'];
    
    $conn->begin_transaction();
    
    try {
        // Use the date from client (already in local format: YYYY-MM-DD HH:MM:SS)
        // This ensures we store the same local time the client sent
        $saleDate = isset($data['date']) ? trim($data['date']) : date('Y-m-d H:i:s');
        
        error_log('[Sales API] Using sale date: ' . $saleDate . ' (received from client)');
        
        $stmt = $conn->prepare("INSERT INTO sales (id, user_id, subtotal, discount, tax, deposit_total, total, bottles_exchanged, payment_methods, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param('ssdddddiss', $saleId, $userId, $subtotal, $discount, $tax, $depositTotal, $total, $bottlesExchanged, $paymentMethods, $saleDate);
        $stmt->execute();
        
        // Add sale items and update inventory
        $stmt = $conn->prepare("INSERT INTO sale_items (sale_id, product_id, name, price, cost_price, qty, discount) VALUES (?, ?, ?, ?, ?, ?, ?)");
        
        foreach ($items as $item) {
            $productId = $item['id'];
            $itemName = $item['name'];
            $itemPrice = (float)$item['price'];
            $costPrice = isset($item['costPrice']) ? (float)$item['costPrice'] : 0;
            $qty = (int)$item['qty'];
            $itemDiscount = isset($item['discount']) ? (float)$item['discount'] : 0;
            
            $stmt->bind_param('sssddid', $saleId, $productId, $itemName, $itemPrice, $costPrice, $qty, $itemDiscount);
            $stmt->execute();
            
            // Update inventory (only for non-kitchen items - check category, not stock value)
            $updateStmt = $conn->prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND category != 'Kitchen'");
            $updateStmt->bind_param('is', $qty, $productId);
            $updateStmt->execute();
        }
        
        // Update empty bottles if exchanged
        if ($bottlesExchanged > 0) {
            $exchangeStmt = $conn->prepare("UPDATE empty_bottles_summary SET total_in_hand = total_in_hand + ? WHERE id = 1");
            $exchangeStmt->bind_param('i', $bottlesExchanged);
            $exchangeStmt->execute();
            
            $historyStmt = $conn->prepare("INSERT INTO empty_bottles (type, quantity, cost) VALUES ('EXCHANGE', ?, 0)");
            $historyStmt->bind_param('i', $bottlesExchanged);
            $historyStmt->execute();
        }
        
        $conn->commit();
        
        sendResponse([
            'id' => $saleId,
            'userId' => $userId,
            'subtotal' => $subtotal,
            'discount' => $discount,
            'tax' => $tax,
            'depositTotal' => $depositTotal,
            'total' => $total,
            'bottlesExchanged' => $bottlesExchanged,
            'paymentMethods' => json_decode($paymentMethods, true),
            'date' => $saleDate,
            'items' => $items
        ], 201);
    } catch (Exception $e) {
        $conn->rollback();
        sendError('Failed to add sale: ' . $e->getMessage(), 500);
    }
}

elseif ($method === 'GET' && $request === 'by_category') {
    // Get sales for a specific category within date range
    $category = isset($_GET['category']) ? $_GET['category'] : '';
    $startDate = isset($_GET['start_date']) ? $_GET['start_date'] : '';
    $endDate = isset($_GET['end_date']) ? $_GET['end_date'] : '';
    
    if (empty($category)) {
        sendError('category is required', 400);
    }
    
    // Query sales with items from specific category
    $query = "SELECT DISTINCT s.* FROM sales s 
              JOIN sale_items si ON s.id = si.sale_id 
              JOIN products p ON si.product_id = p.id 
              WHERE p.category = ?";
    
    $params = array($category);
    $types = 's';
    
    if (!empty($startDate) && !empty($endDate)) {
        $query .= " AND DATE(s.date) >= ? AND DATE(s.date) <= ?";
        $params[] = $startDate;
        $params[] = $endDate;
        $types .= 'ss';
    }
    
    $query .= " ORDER BY s.date DESC";
    
    $stmt = $conn->prepare($query);
    if (!$stmt) {
        sendError('Query preparation failed: ' . $conn->error, 500);
    }
    
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $sales = [];
    while ($row = $result->fetch_assoc()) {
        // Get sale items for this category only
        $itemStmt = $conn->prepare("SELECT product_id as id, name, price, cost_price as costPrice, qty, discount FROM sale_items 
                                    WHERE sale_id = ? AND product_id IN (
                                        SELECT id FROM products WHERE category = ?
                                    )");
        $itemStmt->bind_param('ss', $row['id'], $category);
        $itemStmt->execute();
        $itemResult = $itemStmt->get_result();
        
        $items = [];
        while ($item = $itemResult->fetch_assoc()) {
            $item['price'] = (float)$item['price'];
            $item['costPrice'] = (float)$item['costPrice'];
            $item['qty'] = (int)$item['qty'];
            $item['discount'] = (float)$item['discount'];
            $items[] = $item;
        }
        
        // Only add sale if it has items from this category
        if (!empty($items)) {
            $paymentMethods = json_decode($row['payment_methods'], true) ?? [];
            
            $sale = [
                'id' => $row['id'],
                'userId' => $row['user_id'],
                'subtotal' => (float)$row['subtotal'],
                'discount' => (float)$row['discount'],
                'tax' => (float)$row['tax'],
                'depositTotal' => (float)$row['deposit_total'],
                'total' => (float)$row['total'],
                'bottlesExchanged' => (int)$row['bottles_exchanged'],
                'paymentMethods' => $paymentMethods,
                'date' => $row['date'],
                'items' => $items
            ];
            
            $sales[] = $sale;
        }
    }
    sendResponse($sales);
}

elseif ($method === 'GET' && $request === 'categories') {
    // Get all unique categories from products
    $result = $conn->query("SELECT DISTINCT category FROM products WHERE is_deleted = FALSE AND category IS NOT NULL AND category != '' ORDER BY category");
    
    if (!$result) {
        sendError('Query failed: ' . $conn->error, 500);
    }
    
    $categories = [];
    while ($row = $result->fetch_assoc()) {
        $categories[] = $row['category'];
    }
    
    sendResponse($categories);
}

else {
    sendError('Invalid action or method', 400);
}
?>
