<?php
// Empty Bottles API
// File: api/bottles.php

require 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$request = isset($_GET['action']) ? $_GET['action'] : '';

if ($method === 'GET' && $request === 'all') {
    // Get empty bottles summary and history
    $summary = $conn->query("SELECT total_in_hand FROM empty_bottles_summary WHERE id = 1")->fetch_assoc();
    
    $history = [];
    $result = $conn->query("SELECT id, type, quantity, cost, date FROM empty_bottles ORDER BY date DESC");
    
    while ($row = $result->fetch_assoc()) {
        $history[] = [
            'id' => (int)$row['id'],
            'date' => $row['date'],
            'type' => $row['type'],
            'quantity' => (int)$row['quantity'],
            'cost' => (float)$row['cost']
        ];
    }
    
    sendResponse([
        'totalInHand' => (int)($summary['total_in_hand'] ?? 0),
        'history' => $history
    ]);
}

elseif ($method === 'POST' && $request === 'purchase') {
    // Record bottle purchase
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['quantity']) || !isset($data['cost'])) {
        sendError('Quantity and cost are required', 400);
    }
    
    $quantity = (int)$data['quantity'];
    $cost = (float)$data['cost'];
    
    $conn->begin_transaction();
    
    try {
        // Update summary
        $stmt = $conn->prepare("UPDATE empty_bottles_summary SET total_in_hand = total_in_hand + ? WHERE id = 1");
        $stmt->bind_param('i', $quantity);
        $stmt->execute();
        
        // Add to history
        $stmt = $conn->prepare("INSERT INTO empty_bottles (type, quantity, cost) VALUES ('PURCHASE', ?, ?)");
        $stmt->bind_param('id', $quantity, $cost);
        $stmt->execute();
        
        $conn->commit();
        
        sendResponse(['message' => 'Bottles purchased', 'quantity' => $quantity, 'cost' => $cost], 201);
    } catch (Exception $e) {
        $conn->rollback();
        sendError('Failed to purchase bottles: ' . $e->getMessage(), 500);
    }
}

elseif ($method === 'POST' && ($request === 'return' || $request === 'out')) {
    // Return/Out bottles (decrement from total)
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['quantity'])) {
        sendError('Quantity is required', 400);
    }
    
    $quantity = (int)$data['quantity'];
    $typeRecord = ($request === 'out') ? 'OUT' : 'RETURN_TO_SUPPLIER';
    
    $conn->begin_transaction();
    
    try {
        // Update summary
        $stmt = $conn->prepare("UPDATE empty_bottles_summary SET total_in_hand = total_in_hand - ? WHERE id = 1");
        $stmt->bind_param('i', $quantity);
        $stmt->execute();
        
        // Add to history
        $stmt = $conn->prepare("INSERT INTO empty_bottles (type, quantity, cost) VALUES (?, ?, 0)");
        $stmt->bind_param('si', $typeRecord, $quantity);
        $stmt->execute();
        
        $conn->commit();
        
        $message = ($request === 'out') ? 'Bottles outed' : 'Bottles returned';
        sendResponse(['message' => $message, 'quantity' => $quantity]);
    } catch (Exception $e) {
        $conn->rollback();
        sendError('Failed to process bottles: ' . $e->getMessage(), 500);
    }
}

else {
    sendError('Invalid action or method', 400);
}
?>
