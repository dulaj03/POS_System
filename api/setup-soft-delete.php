<?php
require 'config.php';

$queries = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE"
];

foreach ($queries as $query) {
    if ($conn->query($query)) {
        echo "✓ " . $query . "\n";
    } else {
        echo "✗ " . $query . " - Error: " . $conn->error . "\n";
    }
}

echo "\nDatabase columns updated successfully!";
?>
