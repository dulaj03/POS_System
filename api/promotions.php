<?php
// Promotions API
// File: api/promotions.php

require 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$request = isset($_GET['action']) ? $_GET['action'] : '';

if ($method === 'GET' && $request === 'all') {
    // Get all promotions with their selected items
    $result = $conn->query("SELECT * FROM promotions ORDER BY start_date DESC");
    if (!$result) {
        sendError('Query failed: ' . $conn->error, 500);
    }
    
    $promotions = [];
    while ($row = $result->fetch_assoc()) {
        // Convert snake_case to camelCase
        $promo = [
            'id' => $row['id'],
            'name' => $row['name'],
            'description' => $row['description'],
            'type' => $row['type'],
            'value' => (float)$row['value'],
            'startDate' => $row['start_date'],
            'endDate' => $row['end_date'],
            'isActive' => (bool)$row['is_active'],
            'selectedItems' => []
        ];
        
        // Get selected product IDs for this promotion
        $stmt = $conn->prepare("SELECT product_id FROM promotion_items WHERE promotion_id = ?");
        $stmt->bind_param('s', $row['id']);
        $stmt->execute();
        $itemResult = $stmt->get_result();
        
        while ($item = $itemResult->fetch_assoc()) {
            $promo['selectedItems'][] = $item['product_id'];
        }
        
        $promotions[] = $promo;
    }
    sendResponse($promotions);
}

elseif ($method === 'POST' && $request === 'add') {
    // Add new promotion
    $data = json_decode(file_get_contents('php://input'), true);
    
    $required = ['name', 'type', 'value', 'startDate'];
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            sendError("Missing required field: $field", 400);
        }
    }
    
    $id = 'promo_' . time();
    $name = $data['name'];
    $description = $data['description'] ?? null;
    $type = $data['type'];
    $value = (float)$data['value'];
    $startDate = $data['startDate'];
    $endDate = $data['endDate'] ?? null;
    $isActive = isset($data['isActive']) ? (int)(bool)$data['isActive'] : 1;
    $selectedItems = $data['selectedItems'] ?? [];
    
    // Begin transaction
    $conn->begin_transaction();
    
    try {
        $stmt = $conn->prepare("INSERT INTO promotions (id, name, description, type, value, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param('ssssdssi', $id, $name, $description, $type, $value, $startDate, $endDate, $isActive);
        $stmt->execute();
        
        // Add selected items
        if (!empty($selectedItems)) {
            $stmt = $conn->prepare("INSERT INTO promotion_items (promotion_id, product_id) VALUES (?, ?)");
            foreach ($selectedItems as $productId) {
                $stmt->bind_param('ss', $id, $productId);
                $stmt->execute();
            }
        }
        
        $conn->commit();
        
        sendResponse([
            'id' => $id,
            'name' => $name,
            'description' => $description,
            'type' => $type,
            'value' => (float)$value,
            'startDate' => $startDate,
            'endDate' => $endDate,
            'isActive' => (bool)$isActive,
            'selectedItems' => $selectedItems
        ], 201);
    } catch (Exception $e) {
        $conn->rollback();
        sendError('Failed to add promotion: ' . $e->getMessage(), 500);
    }
}

elseif ($method === 'PUT' && $request === 'update') {
    // Update promotion
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || empty($data['id'])) {
        sendError('Promotion ID is required', 400);
    }
    
    $id = $data['id'];
    $name = $data['name'];
    $description = $data['description'] ?? null;
    $type = $data['type'];
    $value = (float)$data['value'];
    $startDate = $data['startDate'];
    $endDate = $data['endDate'] ?? null;
    $isActive = isset($data['isActive']) ? (int)(bool)$data['isActive'] : 1;
    $selectedItems = $data['selectedItems'] ?? [];
    
    $conn->begin_transaction();
    
    try {
        $stmt = $conn->prepare("UPDATE promotions SET name = ?, description = ?, type = ?, value = ?, start_date = ?, end_date = ?, is_active = ? WHERE id = ?");
        $stmt->bind_param('sssdssis', $name, $description, $type, $value, $startDate, $endDate, $isActive, $id);
        $stmt->execute();
        
        // Delete old items and add new ones
        $stmt = $conn->prepare("DELETE FROM promotion_items WHERE promotion_id = ?");
        $stmt->bind_param('s', $id);
        $stmt->execute();
        
        if (!empty($selectedItems)) {
            $stmt = $conn->prepare("INSERT INTO promotion_items (promotion_id, product_id) VALUES (?, ?)");
            foreach ($selectedItems as $productId) {
                $stmt->bind_param('ss', $id, $productId);
                $stmt->execute();
            }
        }
        
        $conn->commit();
        
        sendResponse([
            'id' => $id,
            'name' => $name,
            'description' => $description,
            'type' => $type,
            'value' => (float)$value,
            'startDate' => $startDate,
            'endDate' => $endDate,
            'isActive' => (bool)$isActive,
            'selectedItems' => $selectedItems
        ]);
    } catch (Exception $e) {
        $conn->rollback();
        sendError('Failed to update promotion: ' . $e->getMessage(), 500);
    }
}

elseif ($method === 'DELETE' && $request === 'delete') {
    // Delete promotion
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || empty($data['id'])) {
        sendError('Promotion ID is required', 400);
    }
    
    $id = $data['id'];
    
    $stmt = $conn->prepare("DELETE FROM promotions WHERE id = ?");
    $stmt->bind_param('s', $id);
    
    if (!$stmt->execute()) {
        sendError('Failed to delete promotion: ' . $stmt->error, 500);
    }
    
    sendResponse(['message' => 'Promotion deleted']);
}

else {
    sendError('Invalid action or method', 400);
}
?>
