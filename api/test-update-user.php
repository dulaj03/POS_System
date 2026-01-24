<?php
require 'config.php';

// Test update user
$id = 'u1';
$name = 'Admin User';
$pin = '5555';
$role = 'admin';

// Try the update
$stmt = $conn->prepare("UPDATE users SET name = ?, pin = ?, role = ? WHERE id = ?");
if (!$stmt) {
    echo "Prepare failed: " . $conn->error;
    exit;
}

$result = $stmt->bind_param('ssss', $name, $pin, $role, $id);
if (!$result) {
    echo "Bind param failed: " . $stmt->error;
    exit;
}

if (!$stmt->execute()) {
    echo json_encode(['error' => 'Update failed: ' . $stmt->error]);
} else {
    echo json_encode(['success' => true, 'rows_affected' => $stmt->affected_rows]);
}
?>
