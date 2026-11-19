[CmdletBinding()]
param([Parameter(ValueFromRemainingArguments = $true)][string[]] $PilotArguments)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'invoke-ktk-native.ps1')
$runnerPath = Join-Path $PSScriptRoot 'svg-pilot-runner.py'
if (-not $PilotArguments -or $PilotArguments[0] -notin @('upload', 'cleanup')) {
    Invoke-KtkNativeCommand -Command 'python' -Arguments (@($runnerPath) + $PilotArguments)
    exit $KtkNativeExitCode
}
# Verify current source/CI/approval/edge/capability or prior cleanup ownership
# before accessing the DPAPI secret. The child repeats the same checks.
$preflightArguments = @($PilotArguments)
$preflightArguments[0] = 'preflight-' + $PilotArguments[0]
Invoke-KtkNativeCommand -Command 'python' -Arguments (@($runnerPath) + $preflightArguments)
if ($KtkNativeExitCode -ne 0) { exit $KtkNativeExitCode }
$pilotCredentialPath = Join-Path $env:USERPROFILE '.ktk\storefront-ftps-password.xml'
$pilotSecurePassword = Import-Clixml -LiteralPath $pilotCredentialPath
$pilotPasswordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pilotSecurePassword)
try {
    $env:KTK_FTP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pilotPasswordPointer)
    Invoke-KtkNativeCommand -Command 'python' -Arguments (@($runnerPath) + $PilotArguments)
    exit $KtkNativeExitCode
} finally {
    Remove-Item Env:KTK_FTP_PASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pilotPasswordPointer)
}
