# deploy-winscp-dotnet.ps1 - 使用 WinSCP .NET

# 加载 WinSCP 程序集
Add-Type -Path "C:\Program Files (x86)\WinSCP\WinSCPnet.dll"

$ftpHost = "38.60.230.100"
$ftpUser = "zhangnanlin"
$ftpPass = "xi830531"
$remoteBasePath = "/www/wwwroot/admin.czo.vn"
$localBaseDir = "dist"

if (-not (Test-Path $localBaseDir)) {
    Write-Host "ERROR: Run pnpm run build first!" -ForegroundColor Red
    exit 1
}

try {
    # 设置会话选项
    $sessionOptions = New-Object WinSCP.SessionOptions -Property @{
        Protocol = [WinSCP.Protocol]::Ftp
        HostName = $ftpHost
        UserName = $ftpUser
        Password = $ftpPass
    }
    
    $session = New-Object WinSCP.Session
    
    try {
        Write-Host "Connecting to FTP server..." -ForegroundColor Yellow
        $session.Open($sessionOptions)
        
        Write-Host "Uploading entire dist folder..." -ForegroundColor Yellow
        
        # 同步整个目录（这会上传所有文件）
        $transferOptions = New-Object WinSCP.TransferOptions
        $transferOptions.TransferMode = [WinSCP.TransferMode]::Binary
        
        $transferResult = $session.PutFiles("$localBaseDir/*", $remoteBasePath, $false, $transferOptions)
        
        # 检查结果
        $transferResult.Check()
        
        Write-Host "SUCCESS: All files uploaded!" -ForegroundColor Green
        
        # 显示上传的文件
        foreach ($transfer in $transferResult.Transfers) {
            Write-Host "UPLOADED: $($transfer.FileName)" -ForegroundColor Cyan
        }
        
    } finally {
        $session.Dispose()
    }
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}