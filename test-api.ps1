# 数学通 API 测试脚本

$BASE_URL = "http://localhost:3000"

Write-Host "===== 数学通教材管理 API 测试 =====" -ForegroundColor Green

# 1. 登录获取 Token
Write-Host "`n[1/6] 登录获取 Token..." -ForegroundColor Cyan
$loginBody = @{
    email = "teacher@test.com"
    password = "password123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
    $TOKEN = $loginResponse.access_token
    Write-Host "✓ 登录成功，Token 获取成功" -ForegroundColor Green
    Write-Host "  用户: $($loginResponse.user.name) ($($loginResponse.user.role))"
} catch {
    Write-Host "✗ 登录失败，尝试注册..." -ForegroundColor Red
    
    # 注册教师账号
    $registerBody = @{
        email = "teacher@test.com"
        password = "password123"
        name = "测试教师"
        role = "TEACHER"
    } | ConvertTo-Json
    
    try {
        $registerResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/register" -Method Post -ContentType "application/json" -Body $registerBody
        Write-Host "✓ 注册成功" -ForegroundColor Green
        
        # 重新登录
        $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
        $TOKEN = $loginResponse.access_token
        Write-Host "✓ 登录成功" -ForegroundColor Green
    } catch {
        Write-Host "✗ 注册/登录失败: $_" -ForegroundColor Red
        exit
    }
}

# 2. 获取教材列表
Write-Host "`n[2/6] 获取教材列表..." -ForegroundColor Cyan
try {
    $headers = @{ Authorization = "Bearer $TOKEN" }
    $textbooks = Invoke-RestMethod -Uri "$BASE_URL/textbooks" -Method Get -Headers $headers
    Write-Host "✓ 获取成功，找到 $($textbooks.data.Count) 个教材" -ForegroundColor Green
    
    if ($textbooks.data.Count -gt 0) {
        $textbooks.data | ForEach-Object {
            Write-Host "  - $($_.name) ($($_.frameworkType), $($_.knowledgePointCount) 知识点)"
        }
    }
} catch {
    Write-Host "✗ 获取失败: $_" -ForegroundColor Red
}

# 3. 同步所有教材
Write-Host "`n[3/6] 同步所有教材..." -ForegroundColor Cyan
try {
    $syncResult = Invoke-RestMethod -Uri "$BASE_URL/textbooks/sync" -Method Post -Headers $headers
    Write-Host "✓ 同步成功" -ForegroundColor Green
    Write-Host "  新增: $($syncResult.data.added.Count) 个"
    Write-Host "  更新: $($syncResult.data.updated.Count) 个"
    Write-Host "  删除: $($syncResult.data.removed.Count) 个"
    
    if ($syncResult.data.added.Count -gt 0) {
        Write-Host "  新增教材: $($syncResult.data.added -join ', ')"
    }
} catch {
    Write-Host "✗ 同步失败: $_" -ForegroundColor Red
}

# 4. 再次获取教材列表（查看同步结果）
Write-Host "`n[4/6] 再次获取教材列表..." -ForegroundColor Cyan
try {
    $textbooks = Invoke-RestMethod -Uri "$BASE_URL/textbooks" -Method Get -Headers $headers
    Write-Host "✓ 获取成功，找到 $($textbooks.data.Count) 个教材" -ForegroundColor Green
    
    # 保存第一个教材 ID 用于后续测试
    if ($textbooks.data.Count -gt 0) {
        $FIRST_TEXTBOOK_ID = $textbooks.data[0].id
        Write-Host "  第一个教材 ID: $FIRST_TEXTBOOK_ID"
        
        # 5. 获取教材详情
        Write-Host "`n[5/6] 获取教材详情..." -ForegroundColor Cyan
        try {
            $detail = Invoke-RestMethod -Uri "$BASE_URL/textbooks/$FIRST_TEXTBOOK_ID" -Method Get -Headers $headers
            Write-Host "✓ 获取详情成功" -ForegroundColor Green
            Write-Host "  名称: $($detail.data.name)"
            Write-Host "  文件: $($detail.data.frameworkPath)"
            Write-Host "  知识点: $($detail.data.knowledgePointCount) 个"
        } catch {
            Write-Host "✗ 获取详情失败: $_" -ForegroundColor Red
        }
        
        # 6. 刷新教材
        Write-Host "`n[6/6] 刷新指定教材..." -ForegroundColor Cyan
        try {
            $refreshResult = Invoke-RestMethod -Uri "$BASE_URL/textbooks/$FIRST_TEXTBOOK_ID/refresh" -Method Post -Headers $headers
            Write-Host "✓ 刷新成功: $($refreshResult.message)" -ForegroundColor Green
        } catch {
            Write-Host "✗ 刷新失败: $_" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "✗ 获取失败: $_" -ForegroundColor Red
}

Write-Host "`n===== 测试完成 =====" -ForegroundColor Green
