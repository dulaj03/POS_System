<?php
header('Content-Type: application/json');
date_default_timezone_set('Asia/Colombo');

echo json_encode([
    'php_time' => date('Y-m-d H:i:s'),
    'php_timezone' => date_default_timezone_get(),
    'mysql_time' => date('Y-m-d H:i:s', time()),
    'timestamp' => time()
]);
?>
