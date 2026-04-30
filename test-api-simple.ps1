# Math Learning System API Test

$BASE_URL = "http://localhost:3000"

Write-Host "===== API Test ====="

# Register
Write-Host "`n[1/3] Register..."
$registerBody = '{"email":"teacher@test.com","password":"password123","name":"Test Teacher","role":"TEACHER"}'
try {
    $reg = Invoke-RestMethod -Uri "$BASE_URL/auth/register" -Method Post -ContentType "application/json" -Body $registerBody
    Write-Host "OK: Registered"
} catch {
    Write-Host "SKIP: User may exist"
}

# Login
Write-Host "`n[2/3] Login..."
$loginBody = '{"email":"teacher@test.com","password":"password123"}'
$login = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$TOKEN = $login.access_token
Write-Host "OK: Token received"
Write-Host "User: $($login.user.name) ($($login.user.role))"

# Get Textbooks
Write-Host "`n[3/3] Get Textbooks..."
$headers = @{ Authorization = "Bearer $TOKEN" }
$textbooks = Invoke-RestMethod -Uri "$BASE_URL/textbooks" -Method Get -Headers $headers
Write-Host "OK: Found $($textbooks.data.Count) textbooks"

if ($textbooks.data.Count -gt 0) {
    $textbooks.data | ForEach-Object {
        Write-Host "  - $($_.name) ($($_.frameworkType))"
    }
}

Write-Host "`n===== Done ====="
