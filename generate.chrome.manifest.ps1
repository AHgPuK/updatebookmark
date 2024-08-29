# Read the entire JSON file as a single string
$manifest = Get-Content -Path ".\manifest.json" -Raw

# Array of regex patterns to remove specific fields and commas
$patterns = @(
    '(?m)^\s*"scripts":.*?\n',
    '(?m)^\s*"browser_specific_settings":\s*[^,]+,?\s*\n'
    # Add more patterns here if needed
)

# Apply each pattern in the array
foreach ($pattern in $patterns) {
    $manifest = $manifest -replace $pattern, ''
}

# Write the modified content to a new manifest file
Set-Content -Path ".\manifest.chrome.json" -Value $manifest
