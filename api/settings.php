<?php
// Settings API
// File: api/settings.php

require 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$request = isset($_GET['action']) ? $_GET['action'] : '';

if ($method === 'GET' && $request === 'get_theme') {
    // Get current theme setting
    $result = $conn->query("SELECT setting_value FROM system_settings WHERE setting_key = 'theme'");
    if (!$result || $result->num_rows === 0) {
        $theme = 'dark';
    } else {
        $row = $result->fetch_assoc();
        $theme = $row['setting_value'] ?? 'dark';
    }
    
    sendResponse(['theme' => $theme]);
}

elseif ($method === 'POST' && $request === 'set_theme') {
    // Save theme setting
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['theme'])) {
        sendError('Theme is required', 400);
    }
    
    $theme = $data['theme'];
    
    // Use INSERT ... ON DUPLICATE KEY UPDATE for upsert
    $stmt = $conn->prepare("INSERT INTO system_settings (setting_key, setting_value) VALUES ('theme', ?) ON DUPLICATE KEY UPDATE setting_value = ?");
    $stmt->bind_param('ss', $theme, $theme);
    
    if (!$stmt->execute()) {
        sendError('Failed to save theme: ' . $stmt->error, 500);
    }
    
    sendResponse(['theme' => $theme]);
}

// GET POS SETTINGS (service charge and tax)
elseif ($method === 'GET' && $request === 'get_pos_settings') {
    $result = $conn->query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('service_charge_rate', 'tax_rate')");
    
    $settings = [
        'service_charge_rate' => 10,
        'tax_rate' => 8
    ];
    
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $settings[$row['setting_key']] = (float)$row['setting_value'];
        }
    }
    
    sendResponse($settings);
}

// SET POS SETTINGS (service charge and tax)
elseif ($method === 'POST' && $request === 'set_pos_settings') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['service_charge_rate']) || !isset($data['tax_rate'])) {
        sendError('Both service_charge_rate and tax_rate are required', 400);
    }
    
    $serviceChargeRate = (float)$data['service_charge_rate'];
    $taxRate = (float)$data['tax_rate'];
    
    // Validate ranges
    if ($serviceChargeRate < 0 || $serviceChargeRate > 100) {
        sendError('Service charge rate must be between 0 and 100', 400);
    }
    if ($taxRate < 0 || $taxRate > 100) {
        sendError('Tax rate must be between 0 and 100', 400);
    }
    
    error_log('[SET_POS_SETTINGS] Updating with values: service_charge_rate=' . $serviceChargeRate . ', tax_rate=' . $taxRate);
    
    // Convert to strings for VARCHAR storage
    $serviceChargeStr = (string)$serviceChargeRate;
    $taxRateStr = (string)$taxRate;
    
    // Update service charge rate
    $stmt = $conn->prepare("INSERT INTO system_settings (setting_key, setting_value) VALUES ('service_charge_rate', ?) ON DUPLICATE KEY UPDATE setting_value = ?");
    if (!$stmt) {
        error_log('[SET_POS_SETTINGS] Prepare failed for service charge: ' . $conn->error);
        sendError('Failed to prepare statement for service charge: ' . $conn->error, 500);
    }
    $stmt->bind_param('ss', $serviceChargeStr, $serviceChargeStr);
    if (!$stmt->execute()) {
        error_log('[SET_POS_SETTINGS] Execute failed for service charge: ' . $stmt->error);
        sendError('Failed to save service charge rate: ' . $stmt->error, 500);
    }
    $stmt->close();
    
    // Update tax rate
    $stmt = $conn->prepare("INSERT INTO system_settings (setting_key, setting_value) VALUES ('tax_rate', ?) ON DUPLICATE KEY UPDATE setting_value = ?");
    if (!$stmt) {
        error_log('[SET_POS_SETTINGS] Prepare failed for tax rate: ' . $conn->error);
        sendError('Failed to prepare statement for tax rate: ' . $conn->error, 500);
    }
    $stmt->bind_param('ss', $taxRateStr, $taxRateStr);
    if (!$stmt->execute()) {
        error_log('[SET_POS_SETTINGS] Execute failed for tax rate: ' . $stmt->error);
        sendError('Failed to save tax rate: ' . $stmt->error, 500);
    }
    $stmt->close();
    
    // Verify the settings were saved by reading them back
    $result = $conn->query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('service_charge_rate', 'tax_rate')");
    
    $savedSettings = [
        'service_charge_rate' => 10,
        'tax_rate' => 8
    ];
    
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $savedSettings[$row['setting_key']] = (float)$row['setting_value'];
        }
    }
    
    error_log('[SET_POS_SETTINGS] Verified saved values: ' . json_encode($savedSettings));
    
    sendResponse($savedSettings);
}

else {
    sendError('Invalid action or method', 400);
}
?>
