<?php
// Supplier Payments API
// File: api/suppliers.php

require 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$request = isset($_GET['action']) ? $_GET['action'] : '';

if ($method === 'GET' && $request === 'all') {
    // Get all supplier payments
    $result = $conn->query("SELECT * FROM supplier_payments ORDER BY date DESC");
    if (!$result) {
        sendError('Query failed: ' . $conn->error, 500);
    }
    
    $payments = [];
    while ($row = $result->fetch_assoc()) {
        $payments[] = [
            'id' => (int)$row['id'],
            'supplier' => $row['supplier'],
            'amount' => (float)$row['amount'],
            'date' => $row['date'],
            'description' => $row['description']
        ];
    }
    sendResponse($payments);
}

elseif ($method === 'POST' && $request === 'add') {
    // Add supplier payment
    $data = json_decode(file_get_contents('php://input'), true);
    
    $required = ['supplier', 'amount', 'date'];
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            sendError("Missing required field: $field", 400);
        }
    }
    
    $id = time(); // Use timestamp as ID
    $supplier = $data['supplier'];
    $amount = (float)$data['amount'];
    $date = $data['date'];
    $description = $data['description'] ?? null;
    
    $stmt = $conn->prepare("INSERT INTO supplier_payments (id, supplier, amount, date, description) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param('isdss', $id, $supplier, $amount, $date, $description);
    
    if (!$stmt->execute()) {
        sendError('Failed to add payment: ' . $stmt->error, 500);
    }
    
    sendResponse([
        'id' => $id,
        'supplier' => $supplier,
        'amount' => $amount,
        'date' => $date,
        'description' => $description
    ], 201);
}

else {
    sendError('Invalid action or method', 400);
}
?>
