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




# # Read the original manifest file as a JSON object
# $manifest = Get-Content -Path ".\manifest.json" | ConvertFrom-Json
#
# # Convert JSON object to a hashtable for manipulation
# function ConvertFrom-JsonToHashtable($json) {
#     $hashtable = @{}
#     foreach ($key in $json.PSObject.Properties.Name) {
#         $value = $json.$key
#         if ($value -is [System.Management.Automation.PSObject] -and $value.PSObject.BaseObject -is [System.Collections.IDictionary]) {
#             $value = ConvertFrom-JsonToHashtable $value
#         }
#         $hashtable[$key] = $value
#     }
#     return $hashtable
# }
#
# $manifestHashtable = ConvertFrom-JsonToHashtable $manifest
#
# # Remove the "scripts" field if it exists
# if ($manifestHashtable.ContainsKey('background')) {
#     $background = $manifestHashtable['background']
#     $background.PSObject.Properties.Remove('scripts')
# }
#
# # Remove the "browser_specific_settings" field if it exists
# if ($manifestHashtable.ContainsKey('browser_specific_settings')) {
#     $manifestHashtable.Remove('browser_specific_settings')
# }
#
# # Convert hashtable back to JSON
# function ConvertFrom-HashtableToJson($hashtable) {
#     $json = ConvertTo-Json -InputObject $hashtable -Depth 10 -Compress
#     return $json
# }
#
# # $modifiedJson = ConvertFrom-HashtableToJson $manifestHashtable
#
# # Formats JSON in a nicer format than the built-in ConvertTo-Json does.
# function Format-Json([Parameter(Mandatory, ValueFromPipeline)][String] $json) {
#     $indent = 0;
#     ($json -Split "`n" | % {
#         if ($_ -match '[\}\]]\s*,?\s*$') {
#             # This line ends with ] or }, decrement the indentation level
#             $indent--
#         }
#         $line = ('  ' * $indent) + $($_.TrimStart() -replace '":  (["{[])', '": $1' -replace ':  ', ': ')
#         if ($_ -match '[\{\[]\s*$') {
#             # This line ends with [ or {, increment the indentation level
#             $indent++
#         }
#         $line
#     }) -Join "`n"
# }
#
# $outputJson = $manifestHashtable | ConvertTo-Json | Format-Json
#
# # Write the modified content to a new manifest file
# Set-Content -Path ".\manifest.chrome.json" -Value $outputJson
#
# Write-Host "Chrome manifest generated successfully with preserved formatting!"
