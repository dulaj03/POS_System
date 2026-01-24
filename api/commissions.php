<?php
// Commission API
// File: api/commissions.php

require 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$request = isset($_GET['action']) ? $_GET['action'] : '';

if ($method === 'GET' && $request === 'all') {
    // Get all commissions for current month
    $currentMonth = date('Y-m-01');
    
    $result = $conn->query("SELECT * FROM cashier_commissions WHERE month = '$currentMonth' ORDER BY user_id");
    if (!$result) {
        sendError('Query failed: ' . $conn->error, 500);
    }
    
    $commissions = [];
    while ($row = $result->fetch_assoc()) {
        $commissions[$row['user_id']] = (float)$row['commission_percentage'];
    }
    sendResponse($commissions);
}

elseif ($method === 'GET' && $request === 'by_user') {
    // Get commission for specific user in current month
    $userId = isset($_GET['user_id']) ? $_GET['user_id'] : '';
    $month = isset($_GET['month']) ? $_GET['month'] : date('Y-m-01');
    
    if (empty($userId)) {
        sendError('user_id is required', 400);
    }
    
    $stmt = $conn->prepare("SELECT commission_percentage FROM cashier_commissions WHERE user_id = ? AND month = ?");
    $stmt->bind_param('ss', $userId, $month);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    
    if ($row) {
        sendResponse(['commission' => (float)$row['commission_percentage']]);
    } else {
        sendResponse(['commission' => 0]);
    }
}

elseif ($method === 'POST' && $request === 'save') {
    // Save commission for user
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || empty($data['user_id']) || !isset($data['commission_percentage'])) {
        sendError('user_id and commission_percentage are required', 400);
    }
    
    $userId = $data['user_id'];
    $commission = (float)$data['commission_percentage'];
    $month = isset($data['month']) ? $data['month'] : date('Y-m-01');
    
    // Insert or update
    $stmt = $conn->prepare("INSERT INTO cashier_commissions (user_id, commission_percentage, month) 
                           VALUES (?, ?, ?) 
                           ON DUPLICATE KEY UPDATE commission_percentage = ?");
    $stmt->bind_param('sdsd', $userId, $commission, $month, $commission);
    
    if (!$stmt->execute()) {
        sendError('Failed to save commission: ' . $stmt->error, 500);
    }
    
    sendResponse([
        'user_id' => $userId,
        'commission_percentage' => $commission,
        'month' => $month
    ], 201);
}

elseif ($method === 'DELETE' && $request === 'delete') {
    // Delete commission
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || empty($data['user_id'])) {
        sendError('user_id is required', 400);
    }
    
    $userId = $data['user_id'];
    $month = isset($data['month']) ? $data['month'] : date('Y-m-01');
    
    $stmt = $conn->prepare("DELETE FROM cashier_commissions WHERE user_id = ? AND month = ?");
    $stmt->bind_param('ss', $userId, $month);
    
    if (!$stmt->execute()) {
        sendError('Failed to delete commission: ' . $stmt->error, 500);
    }
    
    sendResponse(['message' => 'Commission deleted successfully']);
}

else {
    sendError('Invalid action or method', 400);
}
?>
