# Math Learning System - API Test Script

$BASE_URL = "http://localhost:3000"

Write-Host "===== Math Learning Textbook API Test =====" -ForegroundColor Green

# 1. Login to get Token
Write-Host "`n[1/6] Login to get Token..." -ForegroundColor Cyan
$loginBody = @{
    email = "teacher@test.com"
    password = "password123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
    $TOKEN = $loginResponse.access_token
    Write-Host "OK: Login successful" -ForegroundColor Green
    Write-Host "  User: $($loginResponse.user.name) ($($loginResponse.user.role))"
} catch {
    Write-Host "FAIL: Login failed, trying to register..." -ForegroundColor Red
    
    # Register teacher account
    $registerBody = @{
        email = "teacher@test.com"
        password = "password123"
        name = "Test Teacher"
        role = "TEACHER"
    } | ConvertTo-Json
    
    try {
        $registerResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/register" -Method Post -ContentType "application/json" -Body $registerBody
        Write-Host "OK: Register successful" -ForegroundColor Green
        
        # Login again
        $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
        $TOKEN = $loginResponse.access_token
        Write-Host "OK: Login successful" -ForegroundColor Green
    } catch {
        Write-Host "FAIL: Register/Login failed: $_" -ForegroundColor Red
        exit
    }
}

# 2. Get textbook list
Write-Host "`n[2/6] Get textbook list..." -ForegroundColor Cyan
try {
    $headers = @{ Authorization = "Bearer $TOKEN" }
    $textbooks = Invoke-RestMethod -Uri "$BASE_URL/textbooks" -Method Get -Headers $headers
    Write-Host "OK: Found $($textbooks.data.Count) textbooks" -ForegroundColor Green
    
    if ($textbooks.data.Count -gt 0) {
        $textbooks.data | ForEach-Object {
            Write-Host "  - $($_.name) ($($_.frameworkType), $($_.knowledgePointCount) points)"
        }
    }
} catch {
    Write-Host "FAIL: Get list failed: $_" -ForegroundColor Red
}

# 3. Sync all textbooks
Write-Host "`n[3/6] Sync all textbooks..." -ForegroundColor Cyan
try {
    $syncResult = Invoke-RestMethod -Uri "$BASE_URL/textbooks/sync" -Method Post -Headers $headers
    Write-Host "OK: Sync successful" -ForegroundColor Green
    Write-Host "  Added: $($syncResult.data.added.Count)"
    Write-Host "  Updated: $($syncResult.data.updated.Count)"
    Write-Host "  Removed: $($syncResult.data.removed.Count)"
    
    if ($syncResult.data.added.Count -gt 0) {
        Write-Host "  Added: $($syncResult.data.added -join ', ')"
    }
} catch {
    Write-Host "FAIL: Sync failed: $_" -ForegroundColor Red
}

# 4. Get list again (after sync)
Write-Host "`n[4/6] Get list again (after sync)..." -ForegroundColor Cyan
try {
    $textbooks = Invoke-RestMethod -Uri "$BASE_URL/textbooks" -Method Get -Headers $headers
    Write-Host "OK: Found $($textbooks.data.Count) textbooks" -ForegroundColor Green
    
    # Save first textbook ID
    if ($textbooks.data.Count -gt 0) {
        $FIRST_TEXTBOOK_ID = $textbooks.data[0].id
        Write-Host "  First textbook ID: $FIRST_TEXTBOOK_ID"
        
        # 5. Get textbook detail
        Write-Host "`n[5/6] Get textbook detail..." -ForegroundColor Cyan
        try {
            $detail = Invoke-RestMethod -Uri "$BASE_URL/textbooks/$FIRST_TEXTBOOK_ID" -Method Get -Headers $headers
            Write-Host "OK: Get detail successful" -ForegroundColor Green
            Write-Host "  Name: $($detail.data.name)"
            Write-Host "  File: $($detail.data.frameworkPath)"
            Write-Host "  Points: $($detail.data.knowledgePointCount)"
        } catch {
            Write-Host "FAIL: Get detail failed: $_" -ForegroundColor Red
        }
        
        # 6. Refresh textbook
        Write-Host "`n[6/6] Refresh textbook..." -ForegroundColor Cyan
        try {
            $refreshResult = Invoke-RestMethod -Uri "$BASE_URL/textbooks/$FIRST_TEXTBOOK_ID/refresh" -Method Post -Headers $headers
            Write-Host "OK: Refresh successful: $($refreshResult.message)" -ForegroundColor Green
        } catch {
            Write-Host "FAIL: Refresh failed: $_" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "FAIL: Get list failed: $_" -ForegroundColor Red
}

Write-Host "`n===== Test Complete =====" -ForegroundColor Green
Write-Host "Frontend URL: http://localhost:5173/teacher/textbooks" -ForegroundColor Yellow
