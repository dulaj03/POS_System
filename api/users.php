<?php
// User Management API
// File: api/users.php

require 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$request = isset($_GET['action']) ? $_GET['action'] : '';

if ($method === 'GET' && $request === 'all') {
    // Get all active (non-deleted) users
    $result = $conn->query("SELECT id, name, role, pin FROM users WHERE is_deleted = FALSE ORDER BY name");
    if (!$result) {
        sendError('Query failed: ' . $conn->error, 500);
    }
    
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    sendResponse($users);
}

elseif ($method === 'GET' && $request === 'validate') {
    // Validate PIN and get user
    $pin = $_GET['pin'] ?? '';
    
    if (empty($pin)) {
        sendError('PIN is required', 400);
    }
    
    $stmt = $conn->prepare("SELECT id, name, role, pin FROM users WHERE pin = ? AND is_deleted = FALSE");
    $stmt->bind_param('s', $pin);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendError('Invalid PIN', 401);
    }
    
    $user = $result->fetch_assoc();
    unset($user['pin']); // Don't send PIN back
    sendResponse($user);
}

elseif ($method === 'GET' && $request === 'validate_admin') {
    // Validate PIN and check if user is admin
    $pin = $_GET['pin'] ?? '';
    
    if (empty($pin)) {
        sendError('PIN is required', 400);
    }
    
    $stmt = $conn->prepare("SELECT id, name, role, pin FROM users WHERE pin = ? AND role = 'admin' AND is_deleted = FALSE");
    $stmt->bind_param('s', $pin);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendError('Invalid admin PIN', 401);
    }
    
    $user = $result->fetch_assoc();
    unset($user['pin']); // Don't send PIN back
    sendResponse(['success' => true, 'user' => $user]);
}

elseif ($method === 'POST' && $request === 'add') {
    // Add new user
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || empty($data['name']) || empty($data['pin']) || empty($data['role'])) {
        sendError('Missing required fields', 400);
    }
    
    // Generate sequential ID: find max ID and increment
    $result = $conn->query("SELECT MAX(CAST(SUBSTRING(id, 2) AS UNSIGNED)) as max_id FROM users WHERE id LIKE 'u%'");
    $row = $result->fetch_assoc();
    $nextId = ($row['max_id'] ?? 0) + 1;
    $id = 'u' . $nextId;
    
    $name = $data['name'];
    $pin = $data['pin'];
    $role = $data['role'];
    
    $stmt = $conn->prepare("INSERT INTO users (id, name, pin, role) VALUES (?, ?, ?, ?)");
    $stmt->bind_param('ssss', $id, $name, $pin, $role);
    
    if (!$stmt->execute()) {
        // Check if it's a PIN uniqueness error
        if (strpos($stmt->error, 'Duplicate entry') !== false || strpos($stmt->error, 'UNIQUE') !== false) {
            sendError('PIN already in use. Please use a different PIN.', 400);
        }
        sendError('Failed to add user: ' . $stmt->error, 500);
    }
    
    sendResponse(['id' => $id, 'name' => $name, 'role' => $role, 'pin' => $pin], 201);
}

elseif ($method === 'PUT' && $request === 'update') {
    // Update user
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || empty($data['id']) || empty($data['name']) || empty($data['pin']) || empty($data['role'])) {
        sendError('Missing required fields', 400);
    }
    
    $id = $data['id'];
    $name = $data['name'];
    $pin = $data['pin'];
    $role = $data['role'];
    
    $stmt = $conn->prepare("UPDATE users SET name = ?, pin = ?, role = ? WHERE id = ?");
    $stmt->bind_param('ssss', $name, $pin, $role, $id);
    
    if (!$stmt->execute()) {
        // Check if it's a PIN uniqueness error
        if (strpos($stmt->error, 'Duplicate entry') !== false || strpos($stmt->error, 'UNIQUE') !== false) {
            sendError('PIN already assigned to another user. Please use a different PIN.', 400);
        }
        sendError('Failed to update user: ' . $stmt->error, 500);
    }
    
    sendResponse(['id' => $id, 'name' => $name, 'role' => $role, 'pin' => $pin]);
}

elseif ($method === 'DELETE' && $request === 'delete') {
    // Soft delete user (archive instead of removing)
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || empty($data['id'])) {
        sendError('User ID is required', 400);
    }
    
    $id = $data['id'];
    
    // Set is_deleted flag to TRUE instead of removing the record
    // This preserves sales history and audit trails
    $stmt = $conn->prepare("UPDATE users SET is_deleted = TRUE WHERE id = ?");
    $stmt->bind_param('s', $id);
    
    if (!$stmt->execute()) {
        sendError('Failed to archive user: ' . $stmt->error, 500);
    }
    
    sendResponse(['message' => 'User archived successfully']);
}

else {
    sendError('Invalid action or method', 400);
}
?>
