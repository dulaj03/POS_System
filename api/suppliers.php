<?php
// Supplier Payments & Supplier Management API
// File: api/suppliers.php

require 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$request = isset($_GET['action']) ? $_GET['action'] : '';

// ===== GET ALL SUPPLIERS =====
if ($method === 'GET' && $request === 'all-suppliers') {
    $result = $conn->query("SELECT * FROM suppliers WHERE is_deleted = FALSE ORDER BY name ASC");
    if (!$result) {
        sendError('Query failed: ' . $conn->error, 500);
    }
    
    $suppliers = [];
    while ($row = $result->fetch_assoc()) {
        $suppliers[] = [
            'id' => $row['id'],
            'name' => $row['name'],
            'contact_person' => $row['contact_person'],
            'phone' => $row['phone'],
            'email' => $row['email'],
            'address' => $row['address'],
            'created_at' => $row['created_at']
        ];
    }
    sendResponse(['success' => true, 'data' => $suppliers]);
}

// ===== ADD NEW SUPPLIER =====
elseif ($method === 'POST' && $request === 'add-supplier') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['name'])) {
        sendError("Missing required field: name", 400);
    }
    
    $id = 'supplier_' . time();
    $name = $data['name'];
    $contact_person = $data['contact_person'] ?? null;
    $phone = $data['phone'] ?? null;
    $email = $data['email'] ?? null;
    $address = $data['address'] ?? null;
    
    // Check if supplier already exists
    $check = $conn->prepare("SELECT id FROM suppliers WHERE name = ? AND is_deleted = FALSE");
    $check->bind_param('s', $name);
    $check->execute();
    if ($check->get_result()->num_rows > 0) {
        sendError('Supplier with this name already exists', 400);
    }
    
    $stmt = $conn->prepare("INSERT INTO suppliers (id, name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param('ssssss', $id, $name, $contact_person, $phone, $email, $address);
    
    if (!$stmt->execute()) {
        sendError('Failed to add supplier: ' . $stmt->error, 500);
    }
    
    sendResponse([
        'success' => true,
        'data' => [
            'id' => $id,
            'name' => $name,
            'contact_person' => $contact_person,
            'phone' => $phone,
            'email' => $email,
            'address' => $address
        ]
    ], 201);
}

// ===== GET ALL SUPPLIER PAYMENTS =====
elseif ($method === 'GET' && $request === 'all-payments') {
    $result = $conn->query("
        SELECT sp.id, sp.supplier_id, s.name as supplier_name, sp.amount, sp.date, sp.description
        FROM supplier_payments sp
        LEFT JOIN suppliers s ON sp.supplier_id = s.id
        ORDER BY sp.date DESC
    ");
    if (!$result) {
        sendError('Query failed: ' . $conn->error, 500);
    }
    
    $payments = [];
    while ($row = $result->fetch_assoc()) {
        $payments[] = [
            'id' => (int)$row['id'],
            'supplier_id' => $row['supplier_id'],
            'supplier_name' => $row['supplier_name'],
            'amount' => (float)$row['amount'],
            'date' => $row['date'],
            'description' => $row['description']
        ];
    }
    sendResponse(['success' => true, 'data' => $payments]);
}

// ===== ADD SUPPLIER PAYMENT =====
elseif ($method === 'POST' && $request === 'add-payment') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $required = ['supplier_id', 'amount', 'date'];
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            sendError("Missing required field: $field", 400);
        }
    }
    
    $id = time(); // Use timestamp as ID
    $supplier_id = $data['supplier_id'];
    $amount = (float)$data['amount'];
    $date = $data['date'];
    $description = $data['description'] ?? null;
    
    // Verify supplier exists
    $check = $conn->prepare("SELECT id FROM suppliers WHERE id = ? AND is_deleted = FALSE");
    $check->bind_param('s', $supplier_id);
    $check->execute();
    if ($check->get_result()->num_rows === 0) {
        sendError('Supplier not found', 404);
    }
    
    $stmt = $conn->prepare("INSERT INTO supplier_payments (id, supplier_id, amount, date, description) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param('isdss', $id, $supplier_id, $amount, $date, $description);
    
    if (!$stmt->execute()) {
        sendError('Failed to add payment: ' . $stmt->error, 500);
    }
    
    sendResponse([
        'success' => true,
        'data' => [
            'id' => $id,
            'supplier_id' => $supplier_id,
            'amount' => $amount,
            'date' => $date,
            'description' => $description
        ]
    ], 201);
}

// ===== GET DAILY REPORT FOR SUPPLIER =====
elseif ($method === 'GET' && $request === 'daily-report') {
    $supplier_id = isset($_GET['supplier_id']) ? $_GET['supplier_id'] : null;
    
    if (!$supplier_id) {
        sendError('supplier_id parameter required', 400);
    }
    
    $result = $conn->prepare("
        SELECT DATE(date) as payment_date, SUM(amount) as daily_total, COUNT(*) as transaction_count
        FROM supplier_payments
        WHERE supplier_id = ?
        GROUP BY DATE(date)
        ORDER BY payment_date DESC
    ");
    $result->bind_param('s', $supplier_id);
    $result->execute();
    $data = $result->get_result();
    
    $report = [];
    while ($row = $data->fetch_assoc()) {
        $report[] = [
            'date' => $row['payment_date'],
            'daily_total' => (float)$row['daily_total'],
            'transaction_count' => (int)$row['transaction_count']
        ];
    }
    
    sendResponse(['success' => true, 'data' => $report]);
}

// ===== GET MONTHLY REPORT FOR SUPPLIER =====
elseif ($method === 'GET' && $request === 'monthly-report') {
    $supplier_id = isset($_GET['supplier_id']) ? $_GET['supplier_id'] : null;
    
    if (!$supplier_id) {
        sendError('supplier_id parameter required', 400);
    }
    
    $result = $conn->prepare("
        SELECT DATE_FORMAT(date, '%Y-%m') as month, SUM(amount) as monthly_total, COUNT(*) as transaction_count
        FROM supplier_payments
        WHERE supplier_id = ?
        GROUP BY DATE_FORMAT(date, '%Y-%m')
        ORDER BY month DESC
    ");
    $result->bind_param('s', $supplier_id);
    $result->execute();
    $data = $result->get_result();
    
    $report = [];
    while ($row = $data->fetch_assoc()) {
        $report[] = [
            'month' => $row['month'],
            'monthly_total' => (float)$row['monthly_total'],
            'transaction_count' => (int)$row['transaction_count']
        ];
    }
    
    sendResponse(['success' => true, 'data' => $report]);
}

// ===== GET SUPPLIER SUMMARY =====
elseif ($method === 'GET' && $request === 'summary') {
    $supplier_id = isset($_GET['supplier_id']) ? $_GET['supplier_id'] : null;
    
    if (!$supplier_id) {
        sendError('supplier_id parameter required', 400);
    }
    
    // Get supplier info
    $supplier = $conn->prepare("SELECT name FROM suppliers WHERE id = ? AND is_deleted = FALSE");
    $supplier->bind_param('s', $supplier_id);
    $supplier->execute();
    $supplier_info = $supplier->get_result()->fetch_assoc();
    
    if (!$supplier_info) {
        sendError('Supplier not found', 404);
    }
    
    // Get total payments
    $total = $conn->prepare("SELECT COALESCE(SUM(amount), 0) as total FROM supplier_payments WHERE supplier_id = ?");
    $total->bind_param('s', $supplier_id);
    $total->execute();
    $total_result = $total->get_result()->fetch_assoc();
    
    // Get current month total
    $month = $conn->prepare("
        SELECT COALESCE(SUM(amount), 0) as month_total 
        FROM supplier_payments 
        WHERE supplier_id = ? AND DATE_FORMAT(date, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
    ");
    $month->bind_param('s', $supplier_id);
    $month->execute();
    $month_result = $month->get_result()->fetch_assoc();
    
    sendResponse([
        'success' => true,
        'data' => [
            'supplier_name' => $supplier_info['name'],
            'total_paid' => (float)$total_result['total'],
            'current_month_total' => (float)$month_result['month_total']
        ]
    ]);
}

else {
    sendError('Invalid action or method', 400);
}
?>
